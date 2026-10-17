---
'worker-mailer': patch
---

fix: fail with "SMTP connection closed by server" instead of spinning when the server closes the connection while a reply is awaited, and honor the `responseTimeoutMs` option (#58)
