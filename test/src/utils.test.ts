import { describe, it, expect, beforeEach } from 'vitest'
import { BlockingQueue, execTimeout, encode, decode } from '../../src/utils'

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
    const slowPromise = new Promise(resolve => setTimeout(() => resolve('late'), 100))
    
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