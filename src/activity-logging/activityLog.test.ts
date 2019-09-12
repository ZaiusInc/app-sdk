import 'jest';
import {ActivityLogger, setActivityLogger, activityLog} from '../activity-logging';

describe('activityLog', () => {
  describe('initialize', () => {
    it('replaces the local logger with the provided logger', () => {
      const mockLogger: ActivityLogger = {
        info: jest.fn(),
        success: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };

      setActivityLogger(mockLogger);

      activityLog.info('activity', 'title', 'summary', 'detail');
      expect(mockLogger.info).toHaveBeenCalled();

      activityLog.success('activity', 'title', 'summary', 'detail');
      expect(mockLogger.success).toHaveBeenCalled();

      activityLog.warn('activity', 'title', 'summary', 'detail');
      expect(mockLogger.warn).toHaveBeenCalled();

      activityLog.error('activity', 'title', 'summary', 'detail');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
