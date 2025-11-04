// Logger utility for structured logging
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  [key: string]: any;
}

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";

    const logMessage = `[${timestamp}] [${levelStr}] [WormholePlugin] ${message}${contextStr}`;

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }
}

export const logger = new Logger(
  process.env.LOG_LEVEL === "debug" ? LogLevel.DEBUG : LogLevel.INFO
);

