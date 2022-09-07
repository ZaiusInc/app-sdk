import 'jest';
import {notifications, Notifier, setNotifier} from '..';

describe('activityLog', () => {
  describe('initialize', () => {
    it('replaces the local notifier with the provided notifier', async () => {
      const mockNotifier: Notifier = {
        info: jest.fn(),
        success: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };

      setNotifier(mockNotifier);

      await notifications.info('activity', 'title', 'summary', 'detail');
      expect(mockNotifier.info).toHaveBeenCalled();

      await notifications.success('activity', 'title', 'summary', 'detail');
      expect(mockNotifier.success).toHaveBeenCalled();

      await notifications.warn('activity', 'title', 'summary', 'detail');
      expect(mockNotifier.warn).toHaveBeenCalled();

      await notifications.error('activity', 'title', 'summary', 'detail');
      expect(mockNotifier.error).toHaveBeenCalled();
    });
  });
});
