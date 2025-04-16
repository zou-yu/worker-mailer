# worker-mailer

## 1.1.2

### Patch Changes

- cb77d2b: fix: Socket close timeout by ignoring promise result
- 90d0631: fix #23: some servers replied 550 MIME boundary length exceeded (see RFC 2046) to messages that were too long

## 1.1.1

### Patch Changes

- e14a156: fix: Add missing space before NOTIFY=NEVER

## 1.1.0

### Minor Changes

- 15a2961: Add DSN & attachment features
- 15a2961: Add startTls options(default: true), upgrade to TLS if SMTP server supported.

## 1.0.1

### Patch Changes

- 248bb4a: Export LogLevel Enum while packaging
