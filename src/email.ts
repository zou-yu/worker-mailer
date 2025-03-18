import { ok } from 'node:assert'

export type User = { name?: string; email: string }

export type EmailOptions = {
  from: string | User
  to: string | string[] | User | User[]
  reply?: string | User
  cc?: string | string[] | User | User[]
  bcc?: string | string[] | User | User[]
  subject: string
  text?: string
  html?: string
  headers?: Record<string, string>
}

export class Email {
  public readonly from: User
  public readonly to: User[]
  public readonly reply?: User
  public readonly cc?: User[]
  public readonly bcc?: User[]

  public readonly subject: string
  public readonly text?: string
  public readonly html?: string

  public readonly headers: Record<string, string>

  public setSent!: () => void
  public setSentError!: (e: unknown) => void
  public sent = new Promise<void>((resolve, reject) => {
    this.setSent = resolve
    this.setSentError = reject
  })

  constructor(options: EmailOptions) {
    ok(options.text || options.html)

    if (typeof options.from === 'string') {
      this.from = { email: options.from }
    } else {
      this.from = options.from
    }
    if (typeof options.reply === 'string') {
      this.reply = { email: options.reply }
    } else {
      this.reply = options.reply
    }
    this.to = Email.toUsers(options.to)!
    this.cc = Email.toUsers(options.cc)
    this.bcc = Email.toUsers(options.bcc)

    this.subject = options.subject
    this.text = options.text
    this.html = options.html
    this.headers = options.headers || {}
  }

  private static toUsers(
    user: string | string[] | User | User[] | undefined,
  ): User[] | undefined {
    if (!user) {
      return
    }
    if (typeof user === 'string') {
      return [{ email: user }]
    } else if (Array.isArray(user)) {
      return user.map(user => {
        if (typeof user === 'string') {
          return { email: user }
        }
        return user
      })
    } else {
      return [user]
    }
  }

  public getEmailData() {
    this.resolveHeader()
    const headersArray: string[] = []
    for (const [key, value] of Object.entries(this.headers)) {
      headersArray.push(`${key}: ${value}`)
    }
    const headers = headersArray.join('\r\n')

    const body = this.html || this.text

    return `${headers}\r\n\r\n${body}\r\n.\r\n`
  }

  private resolveHeader() {
    this.resolveFrom()
    this.resolveTo()
    this.resolveReply()
    this.resolveCC()
    this.resolveBCC()
    this.resolveSubject()
    this.resolveContentType()
    this.headers['Date'] = new Date().toUTCString()
    this.headers['Message-ID'] =
      `<${crypto.randomUUID()}@${this.from.email.split('@').pop()?.replaceAll('<', '').replaceAll('>', '')}>`
  }

  private resolveFrom() {
    let from = this.from.email
    if (this.from.name) {
      from = `${this.from.name} <${from}>`
    }
    this.headers['From'] = from
  }

  private resolveTo() {
    const toAddresses = this.to.map(user => {
      if (user.name) {
        return `${user.name} <${user.email}>`
      }
      return user.email
    })
    this.headers['To'] = toAddresses.join(', ')
  }

  private resolveSubject() {
    this.headers['Subject'] = this.subject
  }

  private resolveReply() {
    if (this.reply) {
      let replyAddress = this.reply.email
      if (this.reply.name) {
        replyAddress = `${this.reply.name} <${replyAddress}>`
      }
      this.headers['Reply-To'] = replyAddress
    }
  }

  private resolveCC() {
    if (this.cc) {
      const ccAddresses = this.cc.map(user => {
        if (user.name) {
          return `${user.name} <${user.email}>`
        }
        return user.email
      })
      this.headers['CC'] = ccAddresses.join(', ')
    }
  }

  private resolveBCC() {
    if (this.bcc) {
      const bccAddresses = this.bcc.map(user => {
        if (user.name) {
          return `${user.name} <${user.email}>`
        }
        return user.email
      })
      this.headers['BCC'] = bccAddresses.join(', ')
    }
  }

  private resolveContentType() {
    if (this.html) {
      this.headers['Content-Type'] = 'text/html'
    } else if (this.text) {
      this.headers['Content-Type'] = 'text/plain'
    } else {
      this.headers['Content-Type'] = 'text/plain'
    }
  }
}
