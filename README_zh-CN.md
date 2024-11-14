# Worker Mailer

[English](./README.md) | [简体中文](./README_zh-CN.md)

[![npm version](https://badge.fury.io/js/worker-mailer.svg)](https://badge.fury.io/js/worker-mailer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Worker Mailer 是一个运行在 Cloudflare Workers 上的 SMTP 客户端库，通过 [Cloudflare TCP Sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/) 实现且不依赖任何其他第三方库。

## 特性

- 🚀 完全基于 Cloudflare Workers 运行时，无第三方依赖
- 📝 完整的 TypeScript 类型支持
- 📧 支持纯文本和 HTML 邮件发送
- 🔒 支持多种 SMTP 认证方式：`plain`、`login` 和 `CRAM-MD5`
- 👥 丰富的收件人选项：收件人、抄送、密送和回复地址
- 🎨 支持自定义邮件头部

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [API 参考](#api-参考)
- [使用限制](#使用限制)
- [参与贡献](#参与贡献)
- [许可证](#许可证)

## 安装

```shell
npm i worker-mailer
```

## 快速开始

1. 配置 `wrangler.toml`：
```toml
compatibility_flags = ["nodejs_compat"]
# or compatibility_flags = ["nodejs_compat_v2"]
```

2. 在代码中使用：
```typescript
import { WorkerMailer } from 'worker-mailer'

// 连接到 SMTP 服务器
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

// 发送邮件
await mailer.send({
  from: { name: 'Bob', email: 'bob@acme.com' },
  to: { name: 'Alice', email: 'alice@acme.com' },
  subject: '来自 Worker Mailer 的问候',
  text: '这是一条纯文本消息',
  html: '<h1>你好</h1><p>这是一条 HTML 消息</p>'
})
```

## API 参考

### WorkerMailer.connect(options)

创建一个新的 SMTP 连接。

```typescript
type WorkerMailerOptions = {
  host: string;              // SMTP 服务器主机名
  port: number;              // SMTP 服务器端口（通常是 587 或 465）
  secure?: boolean;          // 使用 TLS（默认：false）
  credentials?: {            // SMTP 认证凭据
    username: string;
    password: string;
  };
  authType?: 'plain' | 'login' | 'cram-md5' | Array<'plain' | 'login' | 'cram-md5'>;
  logLevel?: LogLevel;       // 日志级别（默认：LogLevel.INFO）
  socketTimeoutMs?: number;  // Socket 超时时间（毫秒）
  responseTimeoutMs?: number;// 服务器响应超时时间（毫秒）
}
```

### mailer.send(options)

发送邮件。

```typescript
type EmailOptions = {
  from: string | {          // 发件人邮箱
    name?: string;
    email: string;
  };
  to: string | string[] | { // 收件人
    name?: string;
    email: string;
  } | Array<{ name?: string; email: string }>;
  reply?: string | {        // 回复地址
    name?: string;
    email: string;
  };
  cc?: string | string[] | { // 抄送收件人
    name?: string;
    email: string;
  } | Array<{ name?: string; email: string }>;
  bcc?: string | string[] | { // 密送收件人
    name?: string;
    email: string;
  } | Array<{ name?: string; email: string }>;
  subject: string;          // 邮件主题
  text?: string;            // 纯文本内容
  html?: string;            // HTML 内容
  headers?: Record<string, string>; // 自定义邮件头部
}
```

### 静态方法：WorkerMailer.send()

发送单次邮件，不保持连接。

```typescript
await WorkerMailer.send(
  {
    // WorkerMailerOptions
    host: 'smtp.acme.com',
    port: 587,
    credentials: {
      username: 'user',
      password: 'pass'
    }
  },
  {
    // EmailOptions
    from: 'sender@acme.com',
    to: 'recipient@acme.com',
    subject: '测试',
    text: '你好'
  }
)
```

## 使用限制

- **端口限制：** Cloudflare Workers 禁用 25 端口的出站连接，您无法在 25 端口提交邮件，但是主流的 587 和 465 等端口是支持的
- **连接限制：** 每个 Worker 实例对并发 TCP 连接数有限制，请确保在使用完毕后正确关闭连接

## 参与贡献

欢迎您的贡献！如果在使用过程中遇到任何问题或有建议，请随时在 GitHub 仓库中提出 issue。

## 许可证

本项目基于 MIT 许可证开源。