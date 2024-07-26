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
