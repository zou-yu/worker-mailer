import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Logger, { LogLevel } from '../../src/logger'

describe('Logger', () => {
  let consoleSpy: {
    debug: any;
    info: any;
    warn: any;
    error: any;
  }

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    }
  })

  afterEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create logger with default level INFO', () => {
      const logger = new Logger(undefined, '[Test]')
      expect(logger).toBeInstanceOf(Logger)
    })

    it('should create logger with specified level', () => {
      const logger = new Logger(LogLevel.DEBUG, '[Test]')
      expect(logger).toBeInstanceOf(Logger)
    })
  })

  describe('logging methods', () => {
    it('should log debug messages when level is DEBUG', () => {
      const logger = new Logger(LogLevel.DEBUG, '[Test]')
      const message = 'debug message'
      logger.debug(message)
      expect(consoleSpy.debug).toHaveBeenCalledWith('[Test]debug message')
    })

    it('should not log debug messages when level is INFO', () => {
      const logger = new Logger(LogLevel.INFO, '[Test]')
      logger.debug('debug message')
      expect(consoleSpy.debug).not.toHaveBeenCalled()
    })

    it('should log info messages when level is INFO', () => {
      const logger = new Logger(LogLevel.INFO, '[Test]')
      const message = 'info message'
      logger.info(message)
      expect(consoleSpy.info).toHaveBeenCalledWith('[Test]info message')
    })

    it('should not log info messages when level is WARN', () => {
      const logger = new Logger(LogLevel.WARN, '[Test]')
      logger.info('info message')
      expect(consoleSpy.info).not.toHaveBeenCalled()
    })

    it('should log warn messages when level is WARN', () => {
      const logger = new Logger(LogLevel.WARN, '[Test]')
      const message = 'warn message'
      logger.warn(message)
      expect(consoleSpy.warn).toHaveBeenCalledWith('[Test]warn message')
    })

    it('should not log warn messages when level is ERROR', () => {
      const logger = new Logger(LogLevel.ERROR, '[Test]')
      logger.warn('warn message')
      expect(consoleSpy.warn).not.toHaveBeenCalled()
    })

    it('should log error messages when level is ERROR', () => {
      const logger = new Logger(LogLevel.ERROR, '[Test]')
      const message = 'error message'
      logger.error(message)
      expect(consoleSpy.error).toHaveBeenCalledWith('[Test]error message')
    })

    it('should not log any messages when level is NONE', () => {
      const logger = new Logger(LogLevel.NONE, '[Test]')
      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')
      expect(consoleSpy.debug).not.toHaveBeenCalled()
      expect(consoleSpy.info).not.toHaveBeenCalled()
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })
  })

  describe('log formatting', () => {
    it('should format message with additional arguments', () => {
      const logger = new Logger(LogLevel.INFO, '[Test]')
      logger.info('message with %s', 'argument')
      expect(consoleSpy.info).toHaveBeenCalledWith('[Test]message with %s', 'argument')
    })

    it('should handle multiple arguments', () => {
      const logger = new Logger(LogLevel.INFO, '[Test]')
      logger.info('message with %s and %d', 'string', 42)
      expect(consoleSpy.info).toHaveBeenCalledWith('[Test]message with %s and %d', 'string', 42)
    })

    it('should handle objects in arguments', () => {
      const logger = new Logger(LogLevel.INFO, '[Test]')
      const obj = { key: 'value' }
      logger.info('message with object:', obj)
      expect(consoleSpy.info).toHaveBeenCalledWith('[Test]message with object:', obj)
    })
  })
})
