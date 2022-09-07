import * as util from 'util';

/**
 * Supported log levels, in order of least important to most.
 */
export enum LogLevel {
  Debug = 1,
  Info = 2,
  Warn = 3,
  Error = 4,
  /**
   * NEVER should only be used for testing purposes to silence all logs
   */
  NEVER = 5
}

/**
 * Visibility of the log output
 */
export enum LogVisibility {
  /**
   * Zaius: for SDK internal use only
   */
  Zaius = 'zaius',
  /**
   * Developer: Make the log visible to app developers
   */
  Developer = 'developer'
}

/**
 * @hidden
 * Format of logs output to stdout
 */
interface LogMessage {
  time: string;
  level: string;
  message: string;
  stacktrace: string;
  audience: LogVisibility.Zaius | LogVisibility.Developer;
  context: LogContext;
}

/**
 * @hidden
 * Context added to each log automatically by the SDK
 */
export interface LogContext {
  app_id: string;
  app_version: string;
  tracker_id?: string;
  install_id?: number;
  entry_point?: string; // e.g., function:fn_name
  request_id?: string;
  job_id?: string;
}

export interface LoggerOptions {
  maxLineLength: number;
  defaultVisibility: LogVisibility;
  level: LogLevel;
}

const visibilityValues = new Set([
  LogVisibility.Zaius,
  LogVisibility.Developer
]);

const LOG_LEVELS = {
  [LogLevel.Debug]: 'debug',
  [LogLevel.Info]: 'info',
  [LogLevel.Warn]: 'warn',
  [LogLevel.Error]: 'error',
  [LogLevel.NEVER]: 'NEVER',
};

const LOG_LEVEL_FROM_ENV: {[key: string]: LogLevel} = {
  debug: LogLevel.Debug,
  info: LogLevel.Info,
  warn: LogLevel.Warn,
  error: LogLevel.Error,
  NEVER: LogLevel.NEVER
};

const INSPECT_OPTIONS = {
  depth: 5,
  color: false
};

// tslint:disable-next-line:only-arrow-functions
const noop = function() { /**/};

let context: LogContext;

/**
 * @hidden
 * Set automatically when an app starts up
 * @param logContext configuration for runtime
 */
export function setLogContext(logContext: LogContext) {
  context = logContext;
}

/**
 * Zaius Logger interface
 */
export interface ILogger {
  /**
   * Write something to the logs at the Debug level
   *
   * @param args One or more values to log.
   * Objects are formatted using `util.inspect`, other values are converted to a string.
   * Multiple values are concatenated with a space between
   */
  debug(...args: any[]): void;

  /**
   * Write something to the logs at the Debug level
   *
   * @param visibility log visibility level (to override the default visibility)
   * @param args One or more values to log.
   * Objects are formatted using `util.inspect`, other values are converted to a string.
   * Multiple values are concatenated with a space between
   */
  debug(visibility: LogVisibility, ...args: any[]): void;

  /**
   * Write something to the logs at the Info level
   *
   * @param args One or more values to log.
   * Objects are formatted using `util.inspect`, other vaules are converted to a string.
   * Multiple values are concatenated with a space between
   */
  info(...args: any[]): void;

  /**
   * Write something to the logs at the Info level
   *
   * @param visibility log visibility level (to override the default visibility)
   * @param args One or more values to log.
   * Objects are formatted using `util.inspect`, other values are converted to a string.
   * Multiple values are concatenated with a space between
   */
  info(visibility: LogVisibility, ...args: any[]): void;

  /**
   * Write something to the logs at the Warning level
   *
   * @param args One or more values to log.
   * Objects are formatted using `util.inspect`, other values are converted to a string.
   * Multiple values are concatenated with a space between
   */
  warn(...args: any[]): void;

  /**
   * Write something to the logs at the Warning level
   *
   * @param visibility log visibility level (to override the default visibility)
   * @param args One or more values to log.
   * Objects are formatted using `util.inspect`, other values are converted to a string.
   * Multiple values are concatenated with a space between
   */
  warn(visibility: LogVisibility, ...args: any[]): void;

  /**
   * Write something to the logs at the Error level
   *
   * @param args One or more values to log.
   * Objects are formatted using `util.inspect`, other values are converted to a string.
   * Multiple values are concatenated with a space between
   */
  error(...args: any[]): void;

  /**
   * Write something to the logs at the Error level
   *
   * @param visibility log visibility level (to override the default visibility)
   * @param args One or more values to log.
   * Objects are formatted using `util.inspect`, other values are converted to a string.
   * Multiple values are concatenated with a space between
   */
  error(visibility: LogVisibility, ...args: any[]): void;
}

const MAX_LINE_LENGTH = parseInt(process.env.LOG_MAX_MESSAGE_LENGTH || '4096', 10);
const DEFAULT_LOG_LEVEL = LOG_LEVEL_FROM_ENV[process.env.LOG_LEVEL || 'debug'] || LogLevel.Debug;
const DEFAULT_VISIBILITY = LogVisibility.Developer;

/**
 * @hidden
 * Internal Logger implementation. Use the instance provided by the App SDK exports instead.
 */
export class Logger implements ILogger {
  private maxLineLength: number;
  private defaultVisibility: LogVisibility;

  public constructor(options: Partial<LoggerOptions> = {}) {
    const level = options.level || DEFAULT_LOG_LEVEL;
    this.maxLineLength = Math.min(
      options.maxLineLength || MAX_LINE_LENGTH,
      MAX_LINE_LENGTH
    );
    this.defaultVisibility = options.defaultVisibility || DEFAULT_VISIBILITY;
    if (level > LogLevel.Debug) {
      this.debug = noop;
    }
    if (level > LogLevel.Info) {
      this.info = noop;
    }
    if (level > LogLevel.Warn) {
      this.warn = noop;
    }
    if (level > LogLevel.Error) {
      this.error = noop;
    }
  }

  public debug(...args: any[]) {
    if (typeof args[0] === 'string' && visibilityValues.has(args[0] as LogVisibility)) {
      this.log(LogLevel.Debug, args[0] as LogVisibility, ...args.slice(1));
    } else {
      this.log(LogLevel.Debug, this.defaultVisibility, ...args);
    }
  }

  public info(...args: any[]) {
    if (typeof args[0] === 'string' && visibilityValues.has(args[0] as LogVisibility)) {
      this.log(LogLevel.Info, args[0] as LogVisibility, ...args.slice(1));
    } else {
      this.log(LogLevel.Info, this.defaultVisibility, ...args);
    }
  }

  public warn(...args: any[]) {
    if (typeof args[0] === 'string' && visibilityValues.has(args[0] as LogVisibility)) {
      this.log(LogLevel.Warn, args[0] as LogVisibility, ...args.slice(1));
    } else {
      this.log(LogLevel.Warn, this.defaultVisibility, ...args);
    }
  }

  public error(...args: any[]) {
    if (typeof args[0] === 'string' && visibilityValues.has(args[0] as LogVisibility)) {
      this.log(LogLevel.Error, args[0] as LogVisibility, ...args.slice(1));
    } else {
      this.log(LogLevel.Error, this.defaultVisibility, ...args);
    }
  }

  private log(level: LogLevel, visibility: LogVisibility, ...args: any[]) {
    const time = new Date().toISOString();

    let stacktrace: string | undefined;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (typeof arg === 'object') {
        if (arg instanceof Error) {
          if (!stacktrace) {
            stacktrace = arg.stack;
            args[i] = `${arg.name}: ${arg.message}`;
            continue;
          }
        }
        args[i] = util.inspect(arg, INSPECT_OPTIONS);
      }
    }

    (level === LogLevel.Error ? process.stderr : process.stdout).write(JSON.stringify({
      time,
      level: LOG_LEVELS[level],
      message: this.truncateMessage(args.join(' ')),
      stacktrace,
      audience: visibility,
      context
    } as LogMessage) + '\n');
  }

  private truncateMessage(message: string): string {
    if (message.length <= this.maxLineLength) {
      return message;
    }
    return message.slice(0, this.maxLineLength - 3) + '...';
  }
}

/**
 * Logger instance to be used by Zaius apps.
 * Minimum log level can be configured by setting a environment variable, e.g.:
 * ```  LOG_LEVEL=warn```
 * Accepted levels include debug, info, warn, error (or NEVER for silencing logs)
 */
export const logger: ILogger = new Logger();
