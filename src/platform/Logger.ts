/**
 * Logging system for the 4TSS platform
 * Provides structured logging with different levels and destinations
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  module: string;
  data?: any;
  error?: Error;
}

export interface LogDestination {
  write(entry: LogEntry): Promise<void>;
}

/**
 * Console log destination
 */
export class ConsoleDestination implements LogDestination {
  write(entry: LogEntry): Promise<void> {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] ${levelName} [${entry.module}]`;
    
    const message = `${prefix} ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.ERROR:
        if (entry.error) {
          console.error(message, entry.error, entry.data);
        } else {
          console.error(message, entry.data);
        }
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.TRACE:
        console.trace(message, entry.data);
        break;
      default:
        console.log(message, entry.data);
    }
    
    return Promise.resolve();
  }
}

/**
 * Storage destination - logs to 4TSS storage
 */
export class StorageDestination implements LogDestination {
  private storage: any; // PlatformStorage reference
  private bufferSize: number;
  private buffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(storage: any, bufferSize = 100) {
    this.storage = storage;
    this.bufferSize = bufferSize;
  }

  async write(entry: LogEntry): Promise<void> {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    } else if (!this.flushTimer) {
      // Auto-flush after 5 seconds
      this.flushTimer = setTimeout(() => this.flush(), 5000);
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const entries = [...this.buffer];
    this.buffer = [];
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      const logKey = `logs:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      await this.storage.save(logKey, {
        entries,
        count: entries.length,
        startTime: entries[0]?.timestamp,
        endTime: entries[entries.length - 1]?.timestamp
      }, 'cold');
    } catch (error) {
      // Fall back to console if storage fails
      console.error('Failed to write logs to storage:', error);
      entries.forEach(entry => {
        console.log(`[LOG] ${LogLevel[entry.level]} [${entry.module}] ${entry.message}`);
      });
    }
  }
}

/**
 * Main logger class
 */
export class Logger {
  private static instance: Logger | null = null;
  private destinations: LogDestination[] = [];
  private minLevel: LogLevel = LogLevel.INFO;
  private module: string;

  constructor(module: string = 'default') {
    this.module = module;
    
    // Set environment-based log levels
    this.minLevel = this.getEnvironmentLogLevel();
  }

  private getEnvironmentLogLevel(): LogLevel {
    // Check environment variables first
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel) {
      switch (envLevel) {
        case 'ERROR': return LogLevel.ERROR;
        case 'WARN': return LogLevel.WARN;
        case 'INFO': return LogLevel.INFO;
        case 'DEBUG': return LogLevel.DEBUG;
        case 'TRACE': return LogLevel.TRACE;
      }
    }

    // Default based on NODE_ENV
    if (process.env.NODE_ENV === 'test') {
      return LogLevel.WARN; // Minimize test logging
    } else if (process.env.NODE_ENV === 'production') {
      return LogLevel.WARN; // Production: only warnings and errors
    } else {
      return LogLevel.DEBUG; // Development: more verbose
    }
  }

  static getInstance(module: string = 'default'): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(module);
      // Default to console logging
      Logger.instance.addDestination(new ConsoleDestination());
    }
    return new Logger(module);
  }

  static configure(options: { 
    minLevel?: LogLevel;
    destinations?: LogDestination[];
  }): void {
    const logger = Logger.getInstance();
    if (options.minLevel !== undefined) {
      logger.minLevel = options.minLevel;
    }
    if (options.destinations) {
      logger.destinations = options.destinations;
    }
  }

  addDestination(destination: LogDestination): void {
    this.destinations.push(destination);
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (level > this.minLevel) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      module: this.module,
      data,
      error
    };

    // Write to all destinations synchronously for console, async for storage
    this.destinations.forEach(dest => {
      if (dest instanceof ConsoleDestination) {
        // Console destinations should be synchronous
        dest.write(entry);
      } else {
        // Other destinations can be async
        dest.write(entry).catch(err => {
          console.error('Log destination failed:', err);
        });
      }
    });
  }

  error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  trace(message: string, data?: any): void {
    this.log(LogLevel.TRACE, message, data);
  }
}

/**
 * Create a logger for a specific module
 */
export function createLogger(module: string): Logger {
  return Logger.getInstance(module);
}

/**
 * Default logger instance
 */
export const logger = Logger.getInstance('4tss');
