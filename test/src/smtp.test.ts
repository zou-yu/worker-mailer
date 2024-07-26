import { vi, describe, expect, it, beforeAll, afterEach } from 'vitest'
import { env } from 'cloudflare:test'
import { WorkerMailer, WorkerMailerOptions } from '../../src'

const {
  SMTP_SERVER_HOST,
  SMTP_SERVER_PORT,
  SMTP_SERVER_USERNAME,
  SMTP_SERVER_PASSWORD,
  SMTP_SERVER_SECURE,
  SMTP_SERVER_AUTH_METHOD,
  EMAIL_FROM,
  EMAIL_TO,
} = env
const commonMailerOptions: WorkerMailerOptions = {
  credentials: {
    username: SMTP_SERVER_USERNAME,
    password: SMTP_SERVER_PASSWORD,
  },
  authType: SMTP_SERVER_AUTH_METHOD,
  host: SMTP_SERVER_HOST,
  port: SMTP_SERVER_PORT,
  secure: SMTP_SERVER_SECURE,
}
const commonEmailOptions = {
  from: { name: 'Test sender', email: EMAIL_FROM },
  subject: 'This is a test email',
  text: 'This is a test email',
  to: { name: 'Test receiver', email: EMAIL_TO },
}

describe('Mailer', () => {
  describe('Connecting', () => {
    let mailer: WorkerMailer
    beforeAll(async () => {
      mailer = await WorkerMailer.connect(commonMailerOptions)
    })
    afterEach(() => {
      vi.resetAllMocks()
    })

    it('greet successfully with correct server response', async () => {
      const greeting =
        '220 163.com Anti-spam GT for Coremail System (163com[20141201])'
      const worker = await WorkerMailer.connect(commonMailerOptions)
      vi.spyOn(worker, 'read' as any).mockReturnValue(greeting)
      expect(worker['greet']()).resolves.toBeUndefined()
    })

    it('throws error when server response is not 220', async () => {
      vi.spyOn(mailer, 'read' as any).mockReturnValue('421')
      expect(mailer['greet']()).rejects.toThrow()
    })
  })

  describe('Sending', () => {
    let mailer: WorkerMailer
    beforeAll(async () => {
      mailer = await WorkerMailer.connect(commonMailerOptions)
    })
    afterEach(() => {
      vi.resetAllMocks()
    })

    it('can send plain email with static method', async () => {
      await WorkerMailer.send(commonMailerOptions, commonEmailOptions)
    }, 10000)

    describe('Command', () => {})

    it('should send email one by one', async () => {
      vi.spyOn(mailer, 'mail' as any).mockReturnValue(undefined)
      vi.spyOn(mailer, 'rcpt' as any).mockReturnValue(undefined)
      vi.spyOn(mailer, 'data' as any).mockReturnValue(undefined)
      vi.spyOn(mailer, 'body' as any).mockReturnValue(undefined)

      for (let i = 0; i < 10; i++) {
        expect(mailer['send'](commonEmailOptions)).resolves.toBeUndefined()
      }
    })
  })
})
