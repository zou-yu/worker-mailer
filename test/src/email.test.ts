import { describe, it, expect } from 'vitest'
import { Email, type EmailOptions, type User } from '../../src/email'
import { extract } from 'letterparser'

describe('Email', () => {
  describe('constructor', () => {
    it('should create an email with minimal options', () => {
      const options: EmailOptions = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
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
          { name: 'Recipient2', email: 'recipient2@example.com' },
        ],
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      }
      const email = new Email(options)
      expect(email.from).toEqual({
        name: 'Sender Name',
        email: 'sender@example.com',
      })
      expect(email.to).toEqual([
        { name: 'Recipient1', email: 'recipient1@example.com' },
        { name: 'Recipient2', email: 'recipient2@example.com' },
      ])
    })

    it('should throw error if neither text nor html is provided', () => {
      const options: EmailOptions = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
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
        text: 'Hello World',
      })
      const data = email.getEmailData()
      const msg = extract(data)
      expect(msg.text).toBe('Hello World')
      expect(msg.subject).toBe('Test Subject')
      expect(msg.from).toEqual({
        address: 'sender@example.com',
        raw: 'sender@example.com',
      })
      expect(msg.to).toEqual([
        { address: 'recipient@example.com', raw: 'recipient@example.com' },
      ])
    })

    it('should generate correct email data with HTML and Text content', () => {
      const email = new Email({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Hello World',
        html: '<p>Hello World</p>',
      })
      const data = email.getEmailData()
      const msg = extract(data)
      expect(msg.text).toBe('Hello World')
      expect(msg.html).toBe('<p>Hello World</p>')
      expect(msg.subject).toBe('Test Subject')
      expect(msg.from).toEqual({
        address: 'sender@example.com',
        raw: 'sender@example.com',
      })
      expect(msg.to).toEqual([
        { address: 'recipient@example.com', raw: 'recipient@example.com' },
      ])
    })

    it('should include CC and BCC headers when provided', () => {
      const email = new Email({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        // @ts-expect-error it works
        cc: ['cc1@example.com', { name: 'CC2', email: 'cc2@example.com' }],
        bcc: 'bcc@example.com',
        subject: 'Test Subject',
        text: 'Hello World',
      })
      const data = email.getEmailData()
      const msg = extract(data)
      expect(msg.cc).toEqual([
        { address: 'cc1@example.com', raw: 'cc1@example.com' },
        {
          address: 'cc2@example.com',
          name: 'CC2',
          raw: '"CC2" <cc2@example.com>',
        },
      ])
      expect(msg.bcc).toEqual([
        { address: 'bcc@example.com', raw: 'bcc@example.com' },
      ])
    })

    it('should include Reply-To when provided', () => {
      const email = new Email({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        reply: { name: 'Reply Name', email: 'reply@example.com' },
        subject: 'Test Subject',
        text: 'Hello World',
      })
      const data = email.getEmailData()
      const msg = extract(data)
      expect(msg.replyTo).toEqual([
        {
          address: 'reply@example.com',
          name: 'Reply Name',
          raw: '"Reply Name" <reply@example.com>',
        },
      ])
    })

    it('should include custom headers when provided', () => {
      const email = new Email({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Hello World',
        headers: {
          'X-Custom-Header': 'Custom Value',
        },
      })
      const data = email.getEmailData()
      // letterparser does not support headers yet
      expect(data).toContain('X-Custom-Header: Custom Value')
    })
  })

  it('should include attachments when provided', () => {
    const email = new Email({
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test Subject',
      text: 'Hello World',
      attachments: [
        {
          filename: 'test.txt',
          content: Buffer.from('Test content').toString('base64'),
        },
        {
          filename: 'test2.txt',
          content: Buffer.from('Test content 2').toString('base64'),
        },
      ],
    })
    const data = email.getEmailData()
    const msg = extract(data)
    expect(msg.attachments).toEqual([
      {
        filename: 'test.txt',
        body: 'Test content',
        contentId: undefined,
        contentType: {
          encoding: 'utf-8',
          parameters: { name: 'test.txt' },
          type: 'text/plain',
        },
      },
      {
        filename: 'test2.txt',
        body: 'Test content 2',
        contentId: undefined,
        contentType: {
          encoding: 'utf-8',
          parameters: { name: 'test2.txt' },
          type: 'text/plain',
        },
      },
    ])
  })

  describe('sent promise', () => {
    it('should resolve when setSent is called', async () => {
      const email = new Email({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Hello World',
      })

      setTimeout(() => email.setSent(), 0)
      await expect(email.sent).resolves.toBeUndefined()
    })

    it('should reject when setSentError is called', async () => {
      const email = new Email({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Hello World',
      })

      const error = new Error('Test error')
      setTimeout(() => email.setSentError(error), 0)
      await expect(email.sent).rejects.toBe(error)
    })
  })
})
