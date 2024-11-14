import { describe, it, expect } from 'vitest'
import { Email, type EmailOptions, type User } from '../../src/email'

describe('Email', () => {
  describe('constructor', () => {
    it('should create an email with minimal options', () => {
      const options: EmailOptions = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content'
      }
      const email = new Email(options)
      expect(email.from).toEqual({ email: 'sender@example.com' })
      expect(email.to).toEqual([{ email: 'recipient@example.com' }])
      expect(email.subject).toBe('Test Subject')
      expect(email.text).toBe('Test content')
    })

    it('should handle complex user objects', () => {
      const options: EmailOptions = {
        from: { name: 'Sender Name', email: 'sender@example.com' },
        to: [
          { name: 'Recipient1', email: 'recipient1@example.com' },
          { name: 'Recipient2', email: 'recipient2@example.com' }
        ],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      }
      const email = new Email(options)
      expect(email.from).toEqual({ name: 'Sender Name', email: 'sender@example.com' })
      expect(email.to).toEqual([
        { name: 'Recipient1', email: 'recipient1@example.com' },
        { name: 'Recipient2', email: 'recipient2@example.com' }
      ])
    })

    it('should throw error if neither text nor html is provided', () => {
      const options: EmailOptions = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject'
      }
      expect(() => new Email(options)).toThrow()
    })
  })

  describe('getEmailData', () => {
    it('should generate correct email data with text content', () => {
      const email = new Email({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Hello World'
      })
      const data = email.getEmailData()
      expect(data).toContain('From: sender@example.com')
      expect(data).toContain('To: recipient@example.com')
      expect(data).toContain('Subject: Test Subject')
      expect(data).toContain('Content-Type: text/plain')
      expect(data).toContain('Hello World')
    })

    it('should generate correct email data with HTML content', () => {
      const email = new Email({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Hello World</p>'
      })
      const data = email.getEmailData()
      expect(data).toContain('Content-Type: text/html')
      expect(data).toContain('<p>Hello World</p>')
    })

    it('should include CC and BCC headers when provided', () => {
      const email = new Email({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        // @ts-expect-error it works
        cc: ['cc1@example.com', { name: 'CC2', email: 'cc2@example.com' }],
        bcc: 'bcc@example.com',
        subject: 'Test Subject',
        text: 'Hello World'
      })
      const data = email.getEmailData()
      expect(data).toContain('CC: cc1@example.com, CC2 <cc2@example.com>')
      expect(data).toContain('BCC: bcc@example.com')
    })

    it('should include Reply-To when provided', () => {
      const email = new Email({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        reply: { name: 'Reply Name', email: 'reply@example.com' },
        subject: 'Test Subject',
        text: 'Hello World'
      })
      const data = email.getEmailData()
      expect(data).toContain('Reply-To: Reply Name <reply@example.com>')
    })

    it('should include custom headers when provided', () => {
      const email = new Email({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Hello World',
        headers: {
          'X-Custom-Header': 'Custom Value'
        }
      })
      const data = email.getEmailData()
      expect(data).toContain('X-Custom-Header: Custom Value')
    })
  })

  describe('sent promise', () => {
    it('should resolve when setSent is called', async () => {
      const email = new Email({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Hello World'
      })
      
      setTimeout(() => email.setSent(), 0)
      await expect(email.sent).resolves.toBeUndefined()
    })

    it('should reject when setSentError is called', async () => {
      const email = new Email({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Hello World'
      })
      
      const error = new Error('Test error')
      setTimeout(() => email.setSentError(error), 0)
      await expect(email.sent).rejects.toBe(error)
    })
  })
})
