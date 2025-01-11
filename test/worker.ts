import { EmailOptions } from '../src/email'
import { LogLevel } from '../src/logger'
import { WorkerMailer, type WorkerMailerOptions } from '../src/mailer'

export default {
  async fetch(request: Request, env, ctx): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Bad request', { status: 405 })
    }

    try {
      const body = await request.json()
      const { config, email } = body as {
        config: WorkerMailerOptions
        email: EmailOptions
      }

      const mailer = await WorkerMailer.connect({
        ...config,
        logLevel: LogLevel.DEBUG,
      })
      await mailer.send(email)
      await mailer.close()

      return new Response('Email sent successfully', { status: 200 })
    } catch (error) {
      if (error instanceof Error) {
        return new Response(`Error: ${error.message}`, { status: 400 })
      }
      return new Response(`Internal server error`, { status: 500 })
    }
  },
} satisfies ExportedHandler
