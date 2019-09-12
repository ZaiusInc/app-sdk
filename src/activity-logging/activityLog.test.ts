import 'jest';
import {ActivityLogger, initialize, activityLog} from '../activity-logging';

describe('activityLog', () => {
  describe('initialize', () => {
    it('replaces the local logger with the provided logger', () => {
      const mockLogger: ActivityLogger = {
        info: jest.fn(),
        success: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };

      initialize(mockLogger);

      activityLog.info('activity', 'detail');
      expect(mockLogger.info).toHaveBeenCalled();

      activityLog.success('activity', 'detail');
      expect(mockLogger.success).toHaveBeenCalled();

      activityLog.warn('activity', 'detail');
      expect(mockLogger.warn).toHaveBeenCalled();

      activityLog.error('activity', 'detail');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
