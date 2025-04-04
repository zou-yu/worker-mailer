# Worker Mailer

[English](./README.md) | [简体中文](./README_zh-CN.md)

[![npm version](https://badge.fury.io/js/worker-mailer.svg)](https://badge.fury.io/js/worker-mailer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Worker Mailer is an SMTP client that runs on Cloudflare Workers. It leverages [Cloudflare TCP Sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/) and doesn't rely on any other dependencies.

## Features

- 🚀 Completely built on the Cloudflare Workers runtime with no other dependencies
- 📝 Full TypeScript type support
- 📧 Supports sending plain text and HTML emails
- 🔒 Supports multiple SMTP authentication methods: `plain`, `login`, and `CRAM-MD5`
- 👥 Rich recipient options: TO, CC, BCC, and Reply-To
- 🎨 Custom email headers support

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License](#license)

## Installation

```shell
npm i worker-mailer
```

## Quick Start

1. Configure your `wrangler.toml`:

```toml
compatibility_flags = ["nodejs_compat"]
# or compatibility_flags = ["nodejs_compat_v2"]
```

2. Use in your code:

```typescript
import { WorkerMailer } from 'worker-mailer'

// Connect to SMTP server
const mailer = await WorkerMailer.connect({
  credentials: {
    username: 'bob@acme.com',
    password: 'password',
  },
  authType: 'plain',
  host: 'smtp.acme.com',
  port: 587,
  secure: true,
})

// Send email
await mailer.send({
  from: { name: 'Bob', email: 'bob@acme.com' },
  to: { name: 'Alice', email: 'alice@acme.com' },
  subject: 'Hello from Worker Mailer',
  text: 'This is a plain text message',
  html: '<h1>Hello</h1><p>This is an HTML message</p>',
})
```

## API Reference

### WorkerMailer.connect(options)

Creates a new SMTP connection.

```typescript
type WorkerMailerOptions = {
  host: string // SMTP server hostname
  port: number // SMTP server port (usually 587 or 465)
  secure?: boolean // Use TLS (default: false)
  startTls?: boolean // Upgrade to TLS if SMTP server supports (default: true)
  credentials?: {
    // SMTP authentication credentials
    username: string
    password: string
  }
  authType?:
    | 'plain'
    | 'login'
    | 'cram-md5'
    | Array<'plain' | 'login' | 'cram-md5'>
  logLevel?: LogLevel // Logging level (default: LogLevel.INFO)
  socketTimeoutMs?: number // Socket timeout in milliseconds
  responseTimeoutMs?: number // Server response timeout in milliseconds
  dsn?: // see rfc1891
  | {
        RET?:
          | {
              HEADERS?: boolean
              FULL?: boolean
            }
          | undefined
        NOTIFY?:
          | {
              DELAY?: boolean
              FAILURE?: boolean
              SUCCESS?: boolean
            }
          | undefined
      }
    | undefined
}
```

### mailer.send(options)

Sends an email.

```typescript
type EmailOptions = {
  from:
    | string
    | {
        // Sender's email
        name?: string
        email: string
      }
  to:
    | string
    | string[]
    | {
        // Recipients (TO)
        name?: string
        email: string
      }
    | Array<{ name?: string; email: string }>
  reply?:
    | string
    | {
        // Reply-To address
        name?: string
        email: string
      }
  cc?:
    | string
    | string[]
    | {
        // Carbon Copy recipients
        name?: string
        email: string
      }
    | Array<{ name?: string; email: string }>
  bcc?:
    | string
    | string[]
    | {
        // Blind Carbon Copy recipients
        name?: string
        email: string
      }
    | Array<{ name?: string; email: string }>
  subject: string // Email subject
  text?: string // Plain text content
  html?: string // HTML content
  headers?: Record<string, string> // Custom email headers
  attachments?: { filename: string; content: string; mimeType?: string }[] // Attachments, content must be base64-encoded, it will try to infer mimeType if not set
  dsnOverride?: // overrides dsn defined in WorkerMailer, if not set, it will take the WorkerMailer-Option.
  | {
        envelopeId?: string | undefined
        RET?:
          | {
              HEADERS?: boolean
              FULL?: boolean
            }
          | undefined
        NOTIFY?:
          | {
              DELAY?: boolean
              FAILURE?: boolean
              SUCCESS?: boolean
            }
          | undefined
      }
    | undefined
}
```

### Static Method: WorkerMailer.send()

Send a one-off email without maintaining the connection.

```typescript
await WorkerMailer.send(
  {
    // WorkerMailerOptions
    host: 'smtp.acme.com',
    port: 587,
    credentials: {
      username: 'user',
      password: 'pass',
    },
  },
  {
    // EmailOptions
    from: 'sender@acme.com',
    to: 'recipient@acme.com',
    subject: 'Test',
    text: 'Hello',
    attachments: [
      {
        filename: 'test.txt',
        content: 'SGVsbG8gV29ybGQ=', // base64-encoded string for "Hello World"
        type: 'text/plain',
      },
    ],
  },
)
```

## Limitations

- **Port Restrictions:** Cloudflare Workers cannot make outbound connections on port 25. You won't be able to send emails via port 25, but common ports like 587 and 465 are supported.
- **Connection Limits:** Each Worker instance has a limit on the number of concurrent TCP connections. Make sure to properly close connections when done.

## Contributing

We welcome contributions from the community! Here's how you can help:

### Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Testing

1. Unit Tests:
   ```bash
   npm test
   ```
2. Integration Tests:
   ```bash
   pnpm dlx wrangler dev ./test/worker.ts
   ```
   Then, send a POST request to `http://127.0.0.1:8787` with the following JSON body:
   ```json
   {
     "config": {
       "credentials": {
         "username": "xxx@xx.com",
         "password": "xxxx"
       },
       "authType": "plain",
       "host": "smtp.acme.com",
       "port": 587,
       "secure": false,
       "startTls": true
     },
     "email": {
       "from": "xxx@xx.com",
       "to": "yyy@yy.com",
       "subject": "Test Email",
       "text": "Hello World"
     }
   }
   ```

### Pull Request Process

> For major changes, please open an issue first to discuss what you would like to change.

1. Update documentation to reflect any changes
2. Add or update tests as needed
3. Ensure all tests pass
4. Update the changelog if applicable
5. Submit a pull request with a clear description of your changes

### Reporting Issues

When reporting issues, please include:

- A clear description of the problem
- Steps to reproduce the issue
- Expected vs actual behavior
- Version of worker-mailer you're using
- Any relevant code snippets or error messages

## License

This project is licensed under the MIT License.
