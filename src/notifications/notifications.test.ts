import 'jest';
import {Notifier, setNotifier, notifications} from '../notifications';

describe('activityLog', () => {
  describe('initialize', () => {
    it('replaces the local notifier with the provided notifier', () => {
      const mockNotifier: Notifier = {
        info: jest.fn(),
        success: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };

      setNotifier(mockNotifier);

      notifications.info('activity', 'title', 'summary', 'detail');
      expect(mockNotifier.info).toHaveBeenCalled();

      notifications.success('activity', 'title', 'summary', 'detail');
      expect(mockNotifier.success).toHaveBeenCalled();

      notifications.warn('activity', 'title', 'summary', 'detail');
      expect(mockNotifier.warn).toHaveBeenCalled();

      notifications.error('activity', 'title', 'summary', 'detail');
      expect(mockNotifier.error).toHaveBeenCalled();
    });
  });
});
