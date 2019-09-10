import 'jest';
import {CustomerVisibleError} from './CustomerVisibleError';
import {Logger, logger, LogLevel, LogVisibility, setLogContext} from './Logger';

describe('Logger', () => {
  beforeAll(() => {
    jest.spyOn(process.stdout, 'write');
    jest.spyOn(process.stderr, 'write');
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('defaults to auto visibility', () => {
      const logFn = jest.spyOn(logger as any, 'log');
      logger.debug('debug');
      expect(logFn).toHaveBeenCalledWith(LogLevel.Debug, LogVisibility.Auto, 'debug');
      logFn.mockRestore();
    });

    it('sets the default visibility', () => {
      new Logger(LogLevel.Debug, LogVisibility.Zaius).debug('debug');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'zaius'}));
    });

    it('uses the provided log context', () => {
      setLogContext({
        app_id: 'sample',
        app_version: '1.0.0',
        account: 'tracker_id:vdl',
        install_id: 1234,
        entry_point: 'job:foo',
        job_id: '123-456'
      });
      logger.debug('debug');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({
        context: {
          app_id: 'sample',
          app_version: '1.0.0',
          account: 'tracker_id:vdl',
          install_id: 1234,
          entry_point: 'job:foo',
          job_id: '123-456'
        }
      }));
    });
  });

  describe('debug', () => {
    it('logs to stdout', () => {
      new Logger(LogLevel.Debug).debug('debug');
      expect(process.stdout.write).toHaveBeenCalledTimes(1);
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({message: 'debug'}));
    });

    it('does nothing if log level > debug', () => {
      new Logger(LogLevel.Warn).debug('debug');
      new Logger(LogLevel.Info).debug('debug');
      new Logger(LogLevel.Error).debug('debug');
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('sets the log level to debug on the log', () => {
      logger.debug('level check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'debug'}));
    });

    it('respects visibility', () => {
      logger.debug(LogVisibility.Customer, 'check check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'customer'}));
    });
  });

  describe('info', () => {
    it('logs to stdout when the log level is <= info', () => {
      new Logger(LogLevel.Debug).info('debug');
      new Logger(LogLevel.Info).info('info');
      expect(process.stdout.write).toHaveBeenCalledTimes(2);
      expect(process.stdout.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'debug'}));
      expect(process.stdout.write).toHaveBeenNthCalledWith(2, expect.jsonContaining({message: 'info'}));
    });

    it('does nothing if log level > info', () => {
      new Logger(LogLevel.Warn).info('info');
      new Logger(LogLevel.Error).info('info');
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('sets the log level to info on the log', () => {
      logger.info('level check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'info'}));
    });

    it('respects visibility', () => {
      logger.info(LogVisibility.Customer, 'check check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'customer'}));
    });
});

  describe('warn', () => {
    it('logs to stdout when the log level is <= warn', () => {
      new Logger(LogLevel.Debug).warn('debug');
      new Logger(LogLevel.Info).warn('info');
      new Logger(LogLevel.Warn).warn('warn');
      expect(process.stdout.write).toHaveBeenCalledTimes(3);
      expect(process.stdout.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'debug'}));
      expect(process.stdout.write).toHaveBeenNthCalledWith(2, expect.jsonContaining({message: 'info'}));
      expect(process.stdout.write).toHaveBeenNthCalledWith(3, expect.jsonContaining({message: 'warn'}));
    });

    it('does nothing if log level > warn', () => {
      new Logger(LogLevel.Error).warn('warn');
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('sets the log level to warn on the log', () => {
      logger.warn('level check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'warn'}));
    });

    it('respects visibility', () => {
      logger.warn(LogVisibility.Customer, 'check check');
      expect(process.stdout.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'customer'}));
    });
  });

  describe('error', () => {
    it('logs to stderr', () => {
      new Logger(LogLevel.Debug).error('debug');
      new Logger(LogLevel.Info).error('info');
      new Logger(LogLevel.Warn).error('warn');
      new Logger(LogLevel.Error).error('error');
      new Logger(LogLevel.NEVER).error('never'); // suppresses log
      expect(process.stderr.write).toHaveBeenCalledTimes(4);
      expect(process.stderr.write).toHaveBeenNthCalledWith(1, expect.jsonContaining({message: 'debug'}));
      expect(process.stderr.write).toHaveBeenNthCalledWith(2, expect.jsonContaining({message: 'info'}));
      expect(process.stderr.write).toHaveBeenNthCalledWith(3, expect.jsonContaining({message: 'warn'}));
      expect(process.stderr.write).toHaveBeenNthCalledWith(4, expect.jsonContaining({message: 'error'}));
    });

    it('logs even if log level is error', () => {
      new Logger(LogLevel.Error).error('error');
      expect(process.stderr.write).toHaveBeenCalledWith(expect.jsonContaining({message: 'error'}));
    });

    it('sets the log level to info on the log', () => {
      logger.error('level check');
      expect(process.stderr.write).toHaveBeenCalledWith(expect.jsonContaining({level: 'error'}));
    });

    it('respects visibility', () => {
      logger.error(LogVisibility.Customer, 'check check');
      expect(process.stderr.write).toHaveBeenCalledWith(expect.jsonContaining({audience: 'customer'}));
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

    it('hides stacktraces from customer visible logs', () => {
      logger.error(new Error('something went wrong'), new CustomerVisibleError('with the app'));
      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.jsonContaining({message: 'Error: something went wrong with the app'})
      );
      logger.error(new CustomerVisibleError('Problem!'), new Error('something went wrong'));
      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.jsonContaining({message: 'Problem! Error: something went wrong'})
      );
    });

    it('fills in all the expected details', () => {
      setLogContext({
        app_id: 'sample1',
        app_version: '1.1.0',
        account: 'tracker_id:abc123',
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
          account: 'tracker_id:abc123',
          install_id: 123,
          entry_point: 'function:foo',
          request_id: '12345-678-90'
        }
      }));
    });
  });
});
