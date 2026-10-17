export class BlockingQueue<T> {
  private values: Promise<T>[] = []
  private resolvers: ((value: T) => void)[] = []

  public enqueue(value: T) {
    if (!this.resolvers.length) {
      this.addWrapper()
    }
    this.resolvers.shift()!(value)
  }

  public async dequeue(): Promise<T> {
    if (!this.values.length) {
      this.addWrapper()
    }
    return this.values.shift()!
  }

  public get length(): number {
    return this.values.length
  }

  public clear() {
    this.values = []
    this.resolvers = []
  }

  private addWrapper() {
    this.values.push(
      new Promise<T>(resolve => {
        this.resolvers.push(resolve)
      }),
    )
  }
}

export async function execTimeout<T>(
  promise: Promise<T>,
  ms: number,
  e: Error,
) {
  return Promise.race<T>([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(e), ms)),
  ])
}

const encoder = new TextEncoder()
export function encode(data: string): Uint8Array {
  return encoder.encode(data)
}
const decoder = new TextDecoder('utf-8')
export function decode(data: Uint8Array): string {
  return decoder.decode(data)
}

export function encodeQuotedPrintable(text: string, lineLength = 76): string {
  const bytes = encode(text)
  let result = ''
  let currentLineLength = 0
  let i = 0

  while (i < bytes.length) {
    const byte = bytes[i]
    let encoded: string | undefined

    // Handle line breaks (LF, CR, CRLF)
    if (byte === 0x0a) {
      // LF
      result += '\r\n'
      currentLineLength = 0
      i++
      continue
    } else if (byte === 0x0d) {
      // CR
      if (i + 1 < bytes.length && bytes[i + 1] === 0x0a) {
        // CRLF
        result += '\r\n'
        currentLineLength = 0
        i += 2
        continue
      } else {
        // Standalone CR - encode it
        encoded = '=0D'
      }
    }

    // If not already encoded (e.g., standalone CR), check if encoding is needed
    if (encoded === undefined) {
      // Check if this is trailing whitespace (space or tab at end of line)
      const isWhitespace = byte === 0x20 || byte === 0x09
      const nextIsLineBreak =
        i + 1 >= bytes.length || bytes[i + 1] === 0x0a || bytes[i + 1] === 0x0d

      // Encode if:
      // 1. Non-printable (< 32 or > 126, excluding space and tab)
      // 2. Equals sign (=)
      // 3. Trailing whitespace (space or tab before line break or end of text)
      const needsEncoding =
        (byte < 32 && !isWhitespace) || // Control characters (but not space/tab)
        byte > 126 || // Non-ASCII
        byte === 61 || // Equals sign
        (isWhitespace && nextIsLineBreak) // Trailing whitespace

      if (needsEncoding) {
        encoded = `=${byte.toString(16).toUpperCase().padStart(2, '0')}`
      } else {
        encoded = String.fromCharCode(byte)
      }
    }

    // Check if we need a soft line break
    // Reserve 3 characters for potential '=XX' encoding at line end
    if (currentLineLength + encoded.length > lineLength - 3) {
      result += '=\r\n'
      currentLineLength = 0
    }

    result += encoded
    currentLineLength += encoded.length
    i++
  }

  return result
}
