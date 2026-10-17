import { describe, it, expect, beforeEach } from 'vitest'
import { WorkerMailer, type AuthType } from '../../src/mailer'
import type { EmailOptions } from '../../src/email'

const mailpit = 'http://127.0.0.1:8025/api/v1'

const options = {
  host: '127.0.0.1',
  port: 1025,
  credentials: { username: 'user', password: 'pass' },
  authType: 'plain' as AuthType,
}

async function send(email: Partial<EmailOptions>) {
  await WorkerMailer.send(options, {
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Hello',
    text: 'Hello World',
    ...email,
  })
}

async function received(): Promise<any> {
  const list: any = await (await fetch(`${mailpit}/messages`)).json()
  return (await fetch(`${mailpit}/message/${list.messages[0].ID}`)).json()
}

describe('WorkerMailer with Mailpit', () => {
  beforeEach(async () => {
    await fetch(`${mailpit}/messages`, { method: 'DELETE' })
  })

  it.each(['plain', 'login'] as AuthType[])(
    'should authenticate with %s',
    async authType => {
      await WorkerMailer.send(
        { ...options, authType },
        {
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: authType,
          text: 'Hello World',
        },
      )
      expect((await received()).Subject).toBe(authType)
    },
  )

  it('should deliver text and html with non-ASCII subject', async () => {
    await send({
      subject: '测试邮件 ✓',
      text: '你好，世界',
      html: '<p>你好，<b>世界</b></p>',
    })
    const message = await received()
    expect(message.Subject).toBe('测试邮件 ✓')
    expect(message.Text.trim()).toBe('你好，世界')
    expect(message.HTML).toContain('<p>你好，<b>世界</b></p>')
  })

  it('should deliver to to, cc and bcc recipients', async () => {
    await send({
      from: { name: 'Sender', email: 'sender@example.com' },
      to: ['alice@example.com', 'bob@example.com'],
      cc: 'carol@example.com',
      bcc: 'dave@example.com',
      reply: 'reply@example.com',
    })
    const message = await received()
    expect(message.From).toEqual({
      Name: 'Sender',
      Address: 'sender@example.com',
    })
    expect(message.To.map((r: any) => r.Address)).toEqual([
      'alice@example.com',
      'bob@example.com',
    ])
    expect(message.Cc.map((r: any) => r.Address)).toEqual(['carol@example.com'])
    expect(message.Bcc.map((r: any) => r.Address)).toEqual(['dave@example.com'])
    expect(message.ReplyTo.map((r: any) => r.Address)).toEqual([
      'reply@example.com',
    ])
  })

  it('should keep lines starting with a dot', async () => {
    await send({ text: 'first\r\n.second\r\n..third' })
    expect((await received()).Text.trim()).toBe('first\r\n.second\r\n..third')
  })

  it('should deliver attachments', async () => {
    await send({
      attachments: [
        {
          filename: 'hello.txt',
          content: btoa('Hello attachment'),
          mimeType: 'text/plain',
        },
      ],
    })
    const message = await received()
    expect(message.Attachments).toHaveLength(1)
    expect(message.Attachments[0].FileName).toBe('hello.txt')
    const part = await fetch(
      `${mailpit}/message/${message.ID}/part/${message.Attachments[0].PartID}`,
    )
    expect(await part.text()).toBe('Hello attachment')
  })

  it('should send custom headers', async () => {
    await send({ headers: { 'X-Custom': 'worker-mailer' } })
    const message = await received()
    const headers: any = await (
      await fetch(`${mailpit}/message/${message.ID}/headers`)
    ).json()
    expect(headers['X-Custom']).toEqual(['worker-mailer'])
  })
})
