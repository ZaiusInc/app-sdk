import * as util from 'util';
import {CustomerVisibleError} from './CustomerVisibleError';

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
   * Auto: sets to Customer if you log an error that extends CustomerVisibleError, otherwise Developer
   */
  Auto = 'auto',
  /**
   * Zaius: for SDK internal use only
   */
  Zaius = 'zaius',
  /**
   * Developer: Make the log visible to app developers, but not customers using the apps
   */
  Developer = 'developer',
  /**
   * Customer: Make the log visible to the customer who installed the app
   */
  Customer = 'customer'
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
  audience: LogVisibility.Zaius | LogVisibility.Developer | LogVisibility.Customer;
  context: LogContext;
}

/**
 * @hidden
 * Context added to each log automatically by the SDK
 */
export interface LogContext {
  app_id: string;
  app_version: string;
  account?: string; // e.g., tracker_id:vdl
  install_id?: number;
  entry_point?: string; // e.g., function:fn_name
  request_id?: string;
  job_id?: string;
}

const visibilityValues = new Set([
  LogVisibility.Auto,
  LogVisibility.Zaius,
  LogVisibility.Developer,
  LogVisibility.Customer,
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
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other vaules are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  debug(...args: any[]): void;

  /**
   * Write something to the logs at the Debug level
   * @param visibility Specify LogVisibility.Customer if the log message should be surfaced to the customer.
   *   Note: you do not need to specify visibility if you log an error that extends CustomerVisibleError
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other vaules are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  debug(visibility: LogVisibility, ...args: any[]): void;

  /**
   * Write something to the logs at the Info level
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other vaules are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  info(...args: any[]): void;

  /**
   * Write something to the logs at the Info level
   * @param visibility Specify LogVisibility.Customer if the log message should be surfaced to the customer.
   *   Note: you do not need to specify visibility if you log an error that extends CustomerVisibleError
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other vaules are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  info(visibility: LogVisibility, ...args: any[]): void;

  /**
   * Write something to the logs at the Warning level
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other vaules are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  warn(...args: any[]): void;

  /**
   * Write something to the logs at the Warning level
   * @param visibility Specify LogVisibility.Customer if the log message should be surfaced to the customer.
   *   Note: you do not need to specify visibility if you log an error that extends CustomerVisibleError
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other vaules are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  warn(visibility: LogVisibility, ...args: any[]): void;

  /**
   * Write something to the logs at the Error level
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other vaules are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  error(...args: any[]): void;

  /**
   * Write something to the logs at the Error level
   * @param visibility Specify LogVisibility.Customer if the log message should be surfaced to the customer.
   *   Note: you do not need to specify visibility if you log an error that extends CustomerVisibleError
   * @param args One or more values to log.
   *   Objects are formatted using `util.inspect`, other vaules are converted to a string.
   *   Multiple values are concatenated with a space between
   */
  error(visibility: LogVisibility, ...args: any[]): void;
}

/**
 * @hidden
 * Internal Logger implementation. Use the instance provided by the App SDK exports instead.
 */
export class Logger implements ILogger {
  constructor(level: LogLevel, private defaultVisibility = LogVisibility.Auto) {
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

    // detect visibility if needed before producing log entry
    if (visibility === LogVisibility.Auto) {
      for (const arg of args) {
        if (arg instanceof CustomerVisibleError) {
          visibility = LogVisibility.Customer;
          break;
        }
      }
    }

    let stacktrace: string | undefined;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (typeof arg === 'object') {
        if (arg instanceof Error) {
          if (arg instanceof CustomerVisibleError) {
            if (!stacktrace) {
              stacktrace = arg.stack;
            }
            args[i] = arg.message;
            continue;
          } else if (!stacktrace) {
            stacktrace = arg.stack;
            args[i] = `${arg.name}: ${arg.message}`;
            continue;
          } else if (visibility === LogVisibility.Customer) {
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
      message: args.join(' '),
      stacktrace,
      audience: visibility === LogVisibility.Auto ? LogVisibility.Developer : visibility,
      context
    } as LogMessage));
  }
}

/**
 * Logger instance to be used by Zaius apps.
 * Minimum log level can be configured by setting a environment variable, e.g.:
 *   LOG_LEVEL=warn
 * Accepted levels include debug, info, warn, error (or NEVER for silencing logs)
 */
export const logger: ILogger = new Logger(LOG_LEVEL_FROM_ENV[process.env.LOG_LEVEL || 'debug'] || LogLevel.Debug);
