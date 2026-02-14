
// Define the basic structure for your logs
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    cause?: unknown;
  };
}

export interface LoggerOptions {
  service?: string;
  [key: string]: unknown;
}

// Basic logger class
export class Logger {
  private baseContext: Record<string, unknown>;

  constructor(baseContext: Record<string, unknown> = {}) {
    // Clone the context to prevent mutation issues if the source object changes
    this.baseContext = { ...baseContext };
  }

  // Method to create a "child" logger with additional context
  child(additionalContext: Record<string, unknown>): Logger {
    return new Logger({ ...this.baseContext, ...additionalContext });
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>, error?: Error) {
    this.log('warn', message, context, error);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    // Allow calling as error(message, context) if no error object
    if (error && !(error instanceof Error) && !context) {
        context = error;
        error = undefined;
    }
    this.log('error', message, context, error);
  }

  // Central logging function
  private log(level: LogEntry['level'], message: string, context?: Record<string, unknown>, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      // Merge base context, method-specific context
      context: { ...this.baseContext, ...context },
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        // Include cause if available
        ...(error.cause ? { cause: error.cause } : {}),
      };
    }

    // output structured JSON via console.log
    // In Cloudflare Workers, this is captured by Logpush/Tail.
    // In Node.js, this is standard stdout.
    // In Browser, this puts an object in console.
    console.log(JSON.stringify(entry));
  }
}

export const createLogger = (options: LoggerOptions = {}) => {
  return new Logger(options);
};
