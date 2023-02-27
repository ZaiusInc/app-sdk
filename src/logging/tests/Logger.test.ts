import 'jest';
import {Logger, logger, LogLevel, LogVisibility, setLogContext, setLogLevel} from '../Logger';

describe('Logger', () => {
  beforeAll(() => {
    jest.spyOn(process.stdout, 'write');
    jest.spyOn(process.stderr, 'write');
  });

  beforeEach(() => {
    jest.resetAllMocks();
    setLogLevel(LogLevel.Info);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('defaults to developer visibility', () => {
      const logFn = jest.spyOn(logger as any, 'log');
      logger.info('info');
      expect(logFn).toHaveBeenCalledWith(LogLevel.Info, LogVisibility.Developer, 'info');
      logFn.mockRestore();
    });

    it('sets the default visibility', () => {
      new Logger({level: LogLevel.Info, defaultVisibility: LogVisibility.Zaius}).info('info');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
    });

    it('uses the provided log context', () => {
      setLogContext({
        app_id: 'sample',
        app_version: '1.0.0',
        tracker_id: 'vdl',
        install_id: 1234,
        entry_point: 'job:foo',
        job_id: '123-456'
      });
      logger.info('info');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({
        context: {
          app_id: 'sample',
          app_version: '1.0.0',
          tracker_id: 'vdl',
          install_id: 1234,
          entry_point: 'job:foo',
          job_id: '123-456'
        }
      }));
    });
  });

  describe('debug', () => {
    it('logs to stdout', () => {
      new Logger({level: LogLevel.Debug}).debug('debug');
      expect(process.stdout.write).toHaveBeenCalledTimes(1);
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({message: 'debug'}));
    });

    it('does nothing if log level > debug', () => {
      new Logger({level: LogLevel.Warn}).debug('debug');
      new Logger({level: LogLevel.Info}).debug('debug');
      new Logger({level: LogLevel.Error}).debug('debug');
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('sets the log level to debug on the log', () => {
      setLogLevel(LogLevel.Debug);
      logger.debug('level check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'debug'}));
    });

    it('respects visibility', () => {
      setLogLevel(LogLevel.Debug);
      logger.debug(LogVisibility.Zaius, 'check check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
    });
  });

  describe('info', () => {
    it('logs to stdout when the log level is <= info', () => {
      new Logger({level: LogLevel.Debug}).info('debug');
      new Logger({level: LogLevel.Info}).info('info');
      expect(process.stdout.write).toHaveBeenCalledTimes(2);
      expect(process.stdout.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'debug'}));
      expect(process.stdout.write).toHaveBeenNthCalledWith(2, expect.jsonContaining({message: 'info'}));
    });

    it('does nothing if log level > info', () => {
      new Logger({level: LogLevel.Warn}).info('info');
      new Logger({level: LogLevel.Error}).info('info');
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('sets the log level to info on the log', () => {
      logger.info('level check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'info'}));
    });

    it('respects visibility', () => {
      logger.info(LogVisibility.Zaius, 'check check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
    });
  });

  describe('warn', () => {
    it('logs to stdout when the log level is <= warn', () => {
      new Logger({level: LogLevel.Debug}).warn('debug');
      new Logger({level: LogLevel.Info}).warn('info');
      new Logger({level: LogLevel.Warn}).warn('warn');
      expect(process.stdout.write).toHaveBeenCalledTimes(3);
      expect(process.stdout.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'debug'}));
      expect(process.stdout.write).toHaveBeenNthCalledWith(2, expect.jsonContaining({message: 'info'}));
      expect(process.stdout.write).toHaveBeenNthCalledWith(3, expect.jsonContaining({message: 'warn'}));
    });

    it('does nothing if log level > warn', () => {
      new Logger({level: LogLevel.Error}).warn('warn');
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('sets the log level to warn on the log', () => {
      logger.warn('level check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'warn'}));
    });

    it('respects visibility', () => {
      logger.warn(LogVisibility.Zaius, 'check check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
    });
  });

  describe('error', () => {
    it('logs to stderr', () => {
      new Logger({level: LogLevel.Debug}).error('debug');
      new Logger({level: LogLevel.Info}).error('info');
      new Logger({level: LogLevel.Warn}).error('warn');
      new Logger({level: LogLevel.Error}).error('error');
      new Logger({level: LogLevel.NEVER}).error('never'); // suppresses log
      expect(process.stderr.write).toHaveBeenCalledTimes(4);
      expect(process.stderr.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'debug'}));
      expect(process.stderr.write).toHaveBeenNthCalledWith(2, expect.jsonContaining({message: 'info'}));
      expect(process.stderr.write).toHaveBeenNthCalledWith(3, expect.jsonContaining({message: 'warn'}));
      expect(process.stderr.write).toHaveBeenNthCalledWith(4, expect.jsonContaining({message: 'error'}));
    });

    it('logs even if log level is error', () => {
      new Logger({level: LogLevel.Error}).error('error');
      expect(process.stderr.write).toHaveBeenCalledWith(expect.jsonContaining({message: 'error'}));
    });

    it('sets the log level to info on the log', () => {
      logger.error('level check');
      expect(process.stderr.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'error'}));
    });

    it('respects visibility', () => {
      logger.error(LogVisibility.Zaius, 'check check');
      expect(process.stderr.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
    });
  });

  describe('log', () => {
    it('formats objects', () => {
      logger.info({foo: [1, {bar: 'bar'}]});
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.jsonContaining({message: "{ foo: [ 1, { bar: 'bar' } ] }"})
      );
    });

    it('extracts the stacktrace from the first error', () => {
      logger.error(new Error('i have a stacktrace'));
      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.stringMatching(/"stacktrace":".+"/)
      );

      logger.error('Error:', new Error('i have a stacktrace'));
      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.stringMatching(/"stacktrace":".+"/)
      );

      logger.error('no stacktrace');
      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.not.stringMatching(/"stacktrace":".+"/)
      );
    });

    it('concatenates different values logged in one call', () => {
      logger.error('!!!', new Error('something went wrong'), 5, 'times');
      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.jsonContaining({message: '!!! Error: something went wrong 5 times'})
      );
    });

    it('fills in all the expected details', () => {
      setLogContext({
        app_id: 'sample1',
        app_version: '1.1.0',
        tracker_id: 'abc123',
        install_id: 123,
        entry_point: 'function:foo',
        request_id: '12345-678-90'
      });
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValueOnce('2019-09-04T19:49:22.275Z');
      logger.info('This is a test');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonRepresenting({
        time: '2019-09-04T19:49:22.275Z',
        level: 'info',
        message: 'This is a test',
        audience: 'developer',
        context: {
          app_id: 'sample1',
          app_version: '1.1.0',
          tracker_id: 'abc123',
          install_id: 123,
          entry_point: 'function:foo',
          request_id: '12345-678-90'
        }
      }));
    });

    it.each([
      ['a'.repeat(15), 'a'.repeat(15)],
      ['a'.repeat(16), 'a'.repeat(16)],
      ['a'.repeat(17), 'a'.repeat(13) + '...'],
      ['a'.repeat(18), 'a'.repeat(13) + '...']
    ])('truncates long messages', (input, expected) => {
      new Logger({maxLineLength: 16}).info(input);
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.jsonContaining({message: expected})
      );
    });
  });

  describe('override default log level', () => {
    it('logs to stdout only logs with level >= overriden log level ', () => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValueOnce('2019-09-04T19:49:22.275Z');
      setLogLevel(LogLevel.Warn);
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      expect(process.stdout.write).toHaveBeenCalledTimes(1);
      expect(process.stdout.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'warn'}));
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
      expect(process.stderr.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'error'}));
    });

    it('does nothing if the overriden log level < overriden log level', () => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValueOnce('2019-09-04T19:49:22.275Z');
      setLogLevel(LogLevel.Warn);
      logger.debug('debug');
      logger.info('info');
      expect(process.stdout.write).not.toHaveBeenCalled();
    });
  });
});
