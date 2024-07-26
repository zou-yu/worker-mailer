declare module 'cloudflare:test' {
  import { AuthType } from '../src'

  interface ProvidedEnv {
    SMTP_SERVER_HOST: string
    SMTP_SERVER_PORT: number
    SMTP_SERVER_USERNAME: string
    SMTP_SERVER_PASSWORD: string
    SMTP_SERVER_SECURE: boolean
    SMTP_SERVER_AUTH_METHOD: AuthType
    EMAIL_FROM: string
    EMAIL_TO: string
  }
}
