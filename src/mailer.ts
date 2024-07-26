import { connect } from 'cloudflare:sockets'
import { createHmac } from 'node:crypto'
import { BlockingQueue, decode, encode, execTimeout } from './utils'
import { Email, EmailOptions } from './email'

export type AuthType = 'plain' | 'login' | 'cram-md5'
export type Credentials = {
  username: string
  password: string
}
export type WorkerMailerOptions = {
  host: string
  port: number
  secure?: boolean
  credentials?: Credentials
  authType?: AuthType | AuthType[]

  socketTimeoutMs?: number
  responseTimeoutMs?: number
}

export class WorkerMailer {
  private socket: Socket

  private readonly host: string
  private readonly port: number
  private readonly secure: boolean
  private readonly authType: AuthType[]
  private readonly credentials?: Credentials

  private readonly socketTimeoutMs: number
  private readonly responseTimeoutMs: number

  private readonly reader: ReadableStreamDefaultReader<Uint8Array>
  private readonly writer: WritableStreamDefaultWriter<Uint8Array>

  private active = false

  private emailSending: Email | null = null
  private emailToBeSent = new BlockingQueue<Email>()

  /** SMTP server status **/
  private allowAuth = false
  private authTypeSupported: AuthType[] = []

  private constructor(options: WorkerMailerOptions) {
    this.port = options.port
    this.host = options.host
    this.secure = !!options.secure
    if (Array.isArray(options.authType)) {
      this.authType = options.authType
    } else if (typeof options.authType === 'string') {
      this.authType = [options.authType]
    } else {
      this.authType = []
    }
    this.credentials = options.credentials

    this.socketTimeoutMs = options.socketTimeoutMs || 60_000
    this.responseTimeoutMs = options.socketTimeoutMs || 30_000
    this.socket = connect(
      {
        hostname: this.host,
        port: this.port,
      },
      {
        secureTransport: this.secure ? 'on' : 'off',
        allowHalfOpen: false,
      },
    )
    this.reader = this.socket.readable.getReader()
    this.writer = this.socket.writable.getWriter()
  }

  static async connect(options: WorkerMailerOptions): Promise<WorkerMailer> {
    const mailer = new WorkerMailer(options)
    await mailer.initializeSmtpSession()
    mailer.start().catch(console.error)
    return mailer
  }

  public send(options: EmailOptions): Promise<void> {
    const email = new Email(options)
    this.emailToBeSent.enqueue(email)
    return email.sent
  }

  static async send(
    options: WorkerMailerOptions,
    email: EmailOptions,
  ): Promise<void> {
    const mailer = await WorkerMailer.connect(options)
    await mailer.send(email)
    await mailer.close()
  }

  private async readTimeout(): Promise<string> {
    return execTimeout(
      this.read(),
      this.responseTimeoutMs,
      new Error('Timeout while waiting for smtp server response'),
    )
  }

  private async read(): Promise<string> {
    let response = ''
    while (true) {
      const { value } = await this.reader.read()
      if (!value) {
        continue
      }
      const data = decode(value).toString()
      console.log('Server:\n' + data)
      response = response + data
      if (!response.endsWith('\n')) {
        continue
      }
      const lines = response.split(/\r?\n/)
      const lastLine = lines[lines.length - 2]
      if (/^\d+-/.test(lastLine)) {
        continue
      }
      return response
    }
  }

  private async writeLine(line: string) {
    await this.write(`${line}\r\n`)
  }

  private async write(data: string) {
    console.log('Write to socket:\n' + data)
    await this.writer.write(encode(data))
  }

  private async initializeSmtpSession() {
    await this.waitForSocketConnected()
    await this.greet()
    await this.ehlo()
    await this.auth()
    this.active = true
  }

  private async start() {
    while (this.active) {
      this.emailSending = await this.emailToBeSent.dequeue()
      try {
        await this.mail()
        await this.rcpt()
        await this.data()
        await this.body()
        this.emailSending!.setSent()
      } catch (e: any) {
        console.error('Failed to send email: ' + e.message)
        if (!this.active) {
          return
        }
        this.emailSending.setSentError(e)
        try {
          await this.rset()
        } catch (e: any) {
          await this.close(e)
        }
        // If reset successfully, try to send next email
        // otherwise `this.active` will be set to false in `close` function, and loop will be stopped
      }
      this.emailSending = null
    }
  }

  public async close(error: Error = new Error('Mailer closed by client')) {
    console.info('Mailer is closing for: ', error.message)
    this.active = false
    this.emailSending?.setSentError?.(error)
    while (this.emailToBeSent.length) {
      const email = await this.emailToBeSent.dequeue()
      email.setSentError(error)
    }

    try {
      await this.writeLine('QUIT')
      await this.socket.close()
    } catch (ignore) {
      // maybe socket is closed now
      // anyway, just keep it simple
    }
    console.info('Mailer is closed now')
  }

  private async waitForSocketConnected() {
    console.log(`Connecting to ${this.host}:${this.port}`)
    await execTimeout(
      this.socket.opened,
      this.socketTimeoutMs,
      new Error('Socket timeout!'),
    )
    console.log('Socket connected')
  }

  private async greet() {
    const response = await this.readTimeout()
    if (!response.startsWith('220')) {
      throw new Error(`Invalid greeting. ${response}`)
    }
  }

  private async ehlo() {
    await this.writeLine(`EHLO 127.0.0.1`)
    let response = await this.readTimeout()
    if (response.startsWith('421')) {
      throw new Error(`Failed to EHLO. ${response}`)
    }
    if (!response.startsWith('2')) {
      // falling back to HELO
      await this.helo()
    }
    this.resolveSupportedAuth(response)
  }

  private resolveSupportedAuth(response: string) {
    if (/[ -]AUTH\b/i.test(response)) {
      this.allowAuth = true
    }
    if (/[ -]AUTH(?:(\s+|=)[^\n]*\s+|\s+|=)PLAIN/i.test(response)) {
      this.authTypeSupported.push('plain')
    }
    if (/[ -]AUTH(?:(\s+|=)[^\n]*\s+|\s+|=)LOGIN/i.test(response)) {
      this.authTypeSupported.push('login')
    }
    if (/[ -]AUTH(?:(\s+|=)[^\n]*\s+|\s+|=)CRAM-MD5/i.test(response)) {
      this.authTypeSupported.push('cram-md5')
    }
  }

  private async helo() {
    await this.writeLine(`HELO 127.0.0.1`)
    const response = await this.readTimeout()
    if (response.startsWith('2')) {
      return
    }
    throw new Error(`Failed to HELO. ${response}`)
  }

  private async auth() {
    if (!this.allowAuth) {
      return
    }
    if (!this.credentials) {
      throw new Error(
        'smtp server requires authentication, but no credentials found',
      )
    }
    if (
      this.authTypeSupported.includes('plain') &&
      this.authType.includes('plain')
    ) {
      await this.authWithPlain()
    } else if (
      this.authTypeSupported.includes('login') &&
      this.authType.includes('login')
    ) {
      await this.authWithLogin()
    } else if (
      this.authTypeSupported.includes('cram-md5') &&
      this.authType.includes('cram-md5')
    ) {
      await this.authWithCramMD5()
    } else {
      throw new Error('No supported auth method found.')
    }
  }

  private async authWithPlain() {
    const userPassBase64 = btoa(
      `\u0000${this.credentials!.username}\u0000${this.credentials!.password}`,
    )
    await this.writeLine(`AUTH PLAIN ${userPassBase64}`)
    const authResult = await this.readTimeout()
    if (!authResult.startsWith('2')) {
      throw new Error(`Failed to plain authentication: ${authResult}`)
    }
  }

  private async authWithLogin() {
    await this.writeLine(`AUTH LOGIN`)
    const startLoginResponse = await this.readTimeout()
    if (!startLoginResponse.startsWith('3')) {
      throw new Error('Invalid login: ' + startLoginResponse)
    }

    const usernameBase64 = btoa(this.credentials!.username)
    await this.writeLine(usernameBase64)
    const userResponse = await this.readTimeout()
    if (!userResponse.startsWith('3')) {
      throw new Error('Failed to login authentication: ' + userResponse)
    }

    const passwordBase64 = btoa(this.credentials!.password)
    await this.writeLine(passwordBase64)
    const authResult = await this.readTimeout()
    if (!authResult.startsWith('2')) {
      throw new Error('Failed to login authentication: ' + authResult)
    }
  }

  private async authWithCramMD5() {
    await this.writeLine('AUTH CRAM-MD5')
    const challengeResponse = await this.readTimeout()
    const challengeWithBase64Encoded = challengeResponse
      .match(/^334\s+(.+)$/)
      ?.pop()
    if (!challengeWithBase64Encoded) {
      throw new Error('Invalid CRAM-MD5 challenge: ' + challengeResponse)
    }

    // solve challenge
    const challenge = atob(challengeWithBase64Encoded)
    const challengeSolved = createHmac('md5', this.credentials!.password)
      .update(challenge)
      .digest('hex')
    await this.writeLine(
      btoa(`${this.credentials!.username} ${challengeSolved}`),
    )
    const authResult = await this.readTimeout()
    if (!authResult.startsWith('2')) {
      throw new Error('Failed to cram-md5 authentication: ' + authResult)
    }
  }

  private async mail() {
    await this.writeLine(`MAIL FROM: <${this.emailSending!.from.email}>`)
    const response = await this.readTimeout()
    if (!response.startsWith('2')) {
      throw new Error(
        `Invalid MAIL FROM: ${this.emailSending!.from.email} ${response}`,
      )
    }
  }

  private async rcpt() {
    for (let user of this.emailSending!.to) {
      await this.writeLine(`RCPT TO: <${user.email}>`)
      const rcptResponse = await this.readTimeout()
      if (!rcptResponse.startsWith('2')) {
        throw new Error(`Invalid RCPT TO ${user.email}: ${rcptResponse}`)
      }
    }
  }

  private async data() {
    await this.writeLine('DATA')
    const response = await this.readTimeout()
    if (!response.startsWith('3')) {
      throw new Error(`Failed to send DATA: ${response}`)
    }
  }

  private async body() {
    await this.write(this.emailSending!.getEmailData())
    const response = await this.readTimeout()
    if (!response.startsWith('2')) {
      throw new Error('Failed send email body: ' + response)
    }
  }

  private async rset() {
    await this.writeLine('RSET')
    const response = await this.readTimeout()
    if (!response.startsWith('2')) {
      throw new Error(`Failed to reset: ${response}`)
    }
  }
}
