import { describe, it, expect, beforeEach } from 'vitest'
import {
  BlockingQueue,
  execTimeout,
  encode,
  decode,
  encodeQuotedPrintable,
} from '../../src/utils'
import * as libqp from 'libqp'

describe('BlockingQueue', () => {
  let queue: BlockingQueue<number>

  beforeEach(() => {
    queue = new BlockingQueue<number>()
  })

  it('should enqueue and dequeue values in order', async () => {
    queue.enqueue(1)
    queue.enqueue(2)

    expect(await queue.dequeue()).toBe(1)
    expect(await queue.dequeue()).toBe(2)
  })

  it('should handle async dequeue before enqueue', async () => {
    const dequeuePromise = queue.dequeue()
    queue.enqueue(42)

    expect(await dequeuePromise).toBe(42)
  })

  it('should report correct length', () => {
    expect(queue.length).toBe(0)

    // When we call dequeue(), it creates a promise but immediately removes it from the queue
    const dequeuePromise = queue.dequeue()
    expect(queue.length).toBe(0)

    // When we have a pending dequeue and enqueue a value, the length remains 0
    // because the value is immediately consumed by the pending dequeue
    queue.enqueue(1)
    expect(queue.length).toBe(0)

    // If we enqueue without a pending dequeue, the value stays in the queue
    queue.enqueue(2)
    expect(queue.length).toBe(1)
  })

  it('should clear the queue', async () => {
    queue.enqueue(1)
    const dequeuePromise = queue.dequeue()
    queue.clear()

    expect(queue.length).toBe(0)
  })
})

describe('execTimeout', () => {
  it('should resolve when promise completes before timeout', async () => {
    const result = await execTimeout(
      Promise.resolve('success'),
      1000,
      new Error('timeout'),
    )
    expect(result).toBe('success')
  })

  it('should reject with timeout error when promise takes too long', async () => {
    const slowPromise = new Promise(resolve =>
      setTimeout(() => resolve('late'), 100),
    )

    await expect(
      execTimeout(slowPromise, 50, new Error('timeout')),
    ).rejects.toThrow('timeout')
  })
})

describe('encode/decode', () => {
  it('should correctly encode and decode strings', () => {
    const original = 'Hello, '
    const encoded = encode(original)
    const decoded = decode(encoded)

    expect(decoded).toBe(original)
  })

  it('should handle empty strings', () => {
    const original = ''
    const encoded = encode(original)
    const decoded = decode(encoded)

    expect(decoded).toBe(original)
  })

  it('should handle special characters', () => {
    const original = ' \\n \\t !@#$%^&*()'
    const encoded = encode(original)
    const decoded = decode(encoded)

    expect(decoded).toBe(original)
  })
})

describe('encodeQuotedPrintable', () => {
  describe('Basic encoding', () => {
    it('should encode equals sign', () => {
      const input = '2+2=4'
      const result = encodeQuotedPrintable(input)
      expect(result).toBe('2+2=3D4')
    })
  })

  describe('Line break handling', () => {
    it('should normalize LF to CRLF', () => {
      const input = 'Line 1\nLine 2'
      const result = encodeQuotedPrintable(input)
      expect(result).toBe('Line 1\r\nLine 2')
    })

    it('should encode standalone CR', () => {
      const input = 'Line 1\rLine 2'
      const result = encodeQuotedPrintable(input)
      expect(result).toBe('Line 1=0DLine 2')
    })
  })

  describe('Soft line breaks', () => {
    it('should respect maximum line length', () => {
      const input = 'a'.repeat(100)
      const result = encodeQuotedPrintable(input)

      // Verify no line exceeds 76 characters (excluding CRLF)
      const lines = result.split('\r\n')
      for (const line of lines) {
        const effectiveLength = line.endsWith('=')
          ? line.length - 1
          : line.length
        expect(effectiveLength).toBeLessThanOrEqual(76)
      }
    })
  })

  describe('Trailing whitespace', () => {
    it('should encode trailing spaces', () => {
      const input = 'Hello \nWorld'
      const result = encodeQuotedPrintable(input)
      expect(result).toBe('Hello=20\r\nWorld')
    })

    it('should encode trailing tabs', () => {
      const input = 'Hello\t\nWorld'
      const result = encodeQuotedPrintable(input)
      expect(result).toBe('Hello=09\r\nWorld')
    })

    it('should not encode non-trailing spaces', () => {
      const input = 'Hello World'
      const result = encodeQuotedPrintable(input)
      expect(result).toBe('Hello World')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const input = ''
      const result = encodeQuotedPrintable(input)
      expect(result).toBe('')
    })

    it('should normalize multiple line breaks', () => {
      const input = '\n\n\n'
      const result = encodeQuotedPrintable(input)
      expect(result).toBe('\r\n\r\n\r\n')
    })
  })

  describe('Real-world scenarios', () => {
    it('should preserve HTML structure', () => {
      const input = '<html><body><p>Hello 世界</p></body></html>'
      const result = encodeQuotedPrintable(input)

      // HTML tags should be preserved
      expect(result).toContain('<html>')
      expect(result).toContain('</html>')
      expect(result).toContain('=E4=B8=96') // 世
    })

    it('should preserve indentation in code', () => {
      const input = `  function hello() {
    console.log("Hello");
  }`

      const result = encodeQuotedPrintable(input)

      // Should decode back to original
      const decoded = libqp.decode(result).toString()
      expect(decoded.replace(/\r\n/g, '\n')).toBe(input)
    })
  })

  describe('Extended edge cases', () => {
    it('should handle text ending with space', () => {
      const input = 'Hello World '
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })

    it('should handle text ending with tab', () => {
      const input = 'Hello World\t'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })

    it('should handle multiple spaces', () => {
      const input = 'Hello    World'
      const result = encodeQuotedPrintable(input)
      expect(result).toBe('Hello    World')
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })

    it('should handle tabs in middle of line', () => {
      const input = 'Hello\tWorld\tTest'
      const result = encodeQuotedPrintable(input)
      expect(result).toBe('Hello\tWorld\tTest')
    })

    it('should handle equals sign in various positions', () => {
      const inputs = ['=test', 'test=', 'te=st', '===', 'a=b=c']
      inputs.forEach(input => {
        const result = encodeQuotedPrintable(input)
        const decoded = libqp.decode(result).toString()
        expect(decoded).toBe(input)
      })
    })

    it('should handle mixed line endings in same text', () => {
      const input = 'Line1\nLine2\r\nLine3\rLine4'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded.replace(/\r\n/g, '\n').replace(/\r/g, '\n')).toBe(
        'Line1\nLine2\nLine3\nLine4',
      )
    })

    it('should handle very long words', () => {
      const longWord = 'a'.repeat(150)
      const result = encodeQuotedPrintable(longWord)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(longWord)

      // Should have soft line breaks
      expect(result).toContain('=\r\n')
    })

    it('should handle punctuation and special ASCII characters', () => {
      const input = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })

    it('should handle numbers', () => {
      const input = '0123456789'
      const result = encodeQuotedPrintable(input)
      expect(result).toBe('0123456789')
    })

    it('should handle mixed case letters', () => {
      const input = 'AbCdEfGhIjKlMnOpQrStUvWxYz'
      const result = encodeQuotedPrintable(input)
      expect(result).toBe('AbCdEfGhIjKlMnOpQrStUvWxYz')
    })
  })

  describe('Multilingual content', () => {
    it('should handle Japanese', () => {
      const input = 'こんにちは世界'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })

    it('should handle Korean', () => {
      const input = '안녕하세요'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })

    it('should handle Arabic', () => {
      const input = 'مرحبا بالعالم'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })

    it('should handle Russian', () => {
      const input = 'Привет мир'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })

    it('should handle Greek', () => {
      const input = 'Γεια σου κόσμε'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })

    it('should handle mixed languages', () => {
      const input = 'Hello 你好 こんにちは مرحبا Привет'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })
  })

  describe('Email-specific scenarios', () => {
    it('should handle email addresses', () => {
      const input = 'Contact: user@example.com, admin@test.org'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })

    it('should handle URLs', () => {
      const input = 'Visit https://example.com/path?query=value&other=123'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })

    it('should handle quoted text', () => {
      const input = '> This is a quoted line\n> Another quoted line'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded.replace(/\r\n/g, '\n')).toBe(input)
    })

    it('should handle signature separator', () => {
      const input = 'Best regards,\nJohn\n-- \nSent from my phone'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded.replace(/\r\n/g, '\n')).toBe(input)
    })

    it('should handle table-like formatting', () => {
      const input =
        'Name    | Age  | City\n--------|------|--------\nJohn    | 30   | NYC'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded.replace(/\r\n/g, '\n')).toBe(input)
    })
  })

  describe('Boundary conditions', () => {
    it('should handle exactly 76 characters', () => {
      const input = 'a'.repeat(76)
      const result = encodeQuotedPrintable(input)
      // Our implementation reserves 3 chars for safety, so it may wrap before 76
      // This is acceptable and safe behavior
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)

      // Verify no line exceeds 76 chars
      const lines = result.split('\r\n')
      lines.forEach(line => {
        const effectiveLength = line.endsWith('=')
          ? line.length - 1
          : line.length
        expect(effectiveLength).toBeLessThanOrEqual(76)
      })
    })

    it('should handle 77 characters (just over limit)', () => {
      const input = 'a'.repeat(77)
      const result = encodeQuotedPrintable(input)
      expect(result).toContain('=\r\n')
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })

    it('should handle line with exactly 76 chars before non-ASCII', () => {
      const input = 'a'.repeat(75) + '世'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })

    it('should handle alternating ASCII and non-ASCII', () => {
      const input = 'a世b界c测d试'
      const result = encodeQuotedPrintable(input)
      const decoded = libqp.decode(result).toString()
      expect(decoded).toBe(input)
    })
  })

  describe('Comparison with libqp', () => {
    const testCases = [
      { name: 'pure ASCII', input: 'Hello World' },
      { name: 'Chinese characters', input: '你好世界' },
      { name: 'mixed content', input: 'Mixed: Hello 世界!' },
      { name: 'long ASCII line', input: 'a'.repeat(100) },
      { name: 'emoji', input: '😀🎉🎊' },
      {
        name: 'email with attachments mention',
        input: 'Please see attached file: document.pdf',
      },
      {
        name: 'multiline email',
        input: 'Dear Sir,\n\nThank you.\n\nBest regards,\nJohn',
      },
    ]

    testCases.forEach(({ name, input }) => {
      it(`should produce valid quoted-printable for: ${name}`, () => {
        const ourResult = encodeQuotedPrintable(input)
        const libqpResult = libqp.wrap(libqp.encode(input), 76)

        // Both should decode to the same original input
        const ourDecoded = libqp.decode(ourResult).toString()
        const libqpDecoded = libqp.decode(libqpResult).toString()

        // Normalize line endings for comparison
        const normalize = (str: string) => str.replace(/\r\n/g, '\n')
        expect(normalize(ourDecoded)).toBe(normalize(input))
        expect(normalize(libqpDecoded)).toBe(normalize(input))

        // Verify both respect line length limits
        const ourLines = ourResult.split('\r\n')
        const libqpLines = libqpResult.split(/\r?\n/)

        ourLines.forEach(line => {
          const effectiveLength = line.endsWith('=')
            ? line.length - 1
            : line.length
          expect(effectiveLength).toBeLessThanOrEqual(76)
        })

        libqpLines.forEach(line => {
          const effectiveLength = line.endsWith('=')
            ? line.length - 1
            : line.length
          expect(effectiveLength).toBeLessThanOrEqual(76)
        })
      })
    })

    it('should handle line breaks correctly (RFC 2046 compliance)', () => {
      // Our implementation normalizes to CRLF (required for email)
      const input = 'Line 1\nLine 2\nLine 3'
      const result = encodeQuotedPrintable(input)

      // Should use CRLF
      expect(result).toContain('\r\n')

      // Should decode correctly
      const decoded = libqp.decode(result).toString()
      expect(decoded.replace(/\r\n/g, '\n')).toBe(input)
    })
  })
})
