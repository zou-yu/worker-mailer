---
'worker-mailer': patch
---

fix: stop emitting a `Bcc` header in the message data, so BCC recipients are no longer visible to other recipients. BCC addresses are sent only through the SMTP envelope, and any custom `Bcc` header is dropped
