# Worker Mailer

Worker Mailer 是一个运行在 Cloudflare Workers 上 SMTP 客户端库，通过 [Cloudflare TCP Sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/) 实现且不依赖任何其他第三库。

## 特性

- 完全基于 Cloudflare Workers 运行时，无第三方依赖
- 完整的 Typescript 类型支持
- 支持纯文本和 HTML 邮件发送
- 支持 plain、login 和 CRAM-MD5 SMTP认证

## 快速开始

### 安装
```shell
npm i worker-mailer@beta
```


### 使用
在 `wranger.toml` 中配置
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
For more API details, check out the TypeScript declaration file `dist/index.d.ts`

## 限制和已知的问题

- **端口限制：** Cloudflare Workers 禁用 25 端口的出站连接，您无法在 25 端口提交邮件，但是主流的 587 和 465 等端口是支持的

- **beta 阶段：** 该库目前处于 beta 阶段，正在快速开发中，可能会出现 bug，还有大量单元测试工作需完成

## 参与项目

欢迎您的贡献！如果在使用过程中遇到任何问题或有建议，请随时在 GitHub 仓库中提出 issue
