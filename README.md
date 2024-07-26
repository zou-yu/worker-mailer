# Worker Mailer

Worker Mailer is an SMTP client that runs on Cloudflare Workers. It leverages [Cloudflare TCP Sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/) and doesn't rely on any other dependencies.

## Features

- Completely built on the Cloudflare Workers runtime with no other dependencies
- Full TypeScript type support
- Supports sending plain text and HTML emails
- Supports `plain`, `login`, and `CRAM-MD5` SMTP authentication

## Getting Started

### Installation

```shell
npm i worker-mailer@beta
```

### Usage

In your `wrangler.toml`, configure the following:
>compatibility_flags = ["nodejs_compat"]

```typescript
import { WorkerMailer } from 'worker-mailer'

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

await mailer.send({
  from: { name: 'Bob', email: 'bob@acme.com' },
  // from: 'bob@acme.com'
  subject: 'Test email',
  text: 'Plain message',
  // html: '<p>HTML message</p>',
  to: { name: 'Alice', email: 'alice@acme.com' },
  // to: [{ name: 'Alice', email: 'alice@acme.com' }, { name: 'Sam', email: 'sam@acme.com' }]
  // to: 'alice@acme.com'
})
```

For more API details, check out the TypeScript declaration file `dist/index.d.ts`.

## Limitations and Known Issues

- **Port Restrictions:** Cloudflare Workers cannot make outbound connections on port 25. You won't be able to send emails via port 25, but common ports like 587 and 465 are supported.
- **Beta Stage:** This library is currently in beta and is under rapid development. There might be bugs, and there's still a lot of unit testing to be done.

## Contributing

We welcome your contributions! If you encounter any issues or have suggestions while using this library, feel free to open an issue on our GitHub repository.
