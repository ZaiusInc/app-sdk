import 'jest';
import {notifications, Notifier} from '..';
import {LocalNotifier} from '../LocalNotifier';

describe('activityLog', () => {
  describe('initialize', () => {
    it('uses local notifier if not provided in OCP runtime in global context', async () => {
      const infoFunction = jest.spyOn(LocalNotifier.prototype, 'info')
        .mockImplementation(() => Promise.resolve());
      const successFunction = jest.spyOn(LocalNotifier.prototype, 'success')
        .mockImplementation(() => Promise.resolve());
      const warnFunction = jest.spyOn(LocalNotifier.prototype, 'warn')
        .mockImplementation(() => Promise.resolve());
      const errorFunction = jest.spyOn(LocalNotifier.prototype, 'error')
        .mockImplementation(() => Promise.resolve());

      await notifications.info('activity', 'title', 'summary', 'detail');
      await notifications.success('activity', 'title', 'summary', 'detail');
      await notifications.warn('activity', 'title', 'summary', 'detail');
      await notifications.error('activity', 'title', 'summary', 'detail');

      expect(infoFunction).toHaveBeenCalled();
      expect(successFunction).toHaveBeenCalled();
      expect(warnFunction).toHaveBeenCalled();
      expect(errorFunction).toHaveBeenCalled();
    });

    it('uses notifier from OCP runtime from global context if provided', async () => {
      const mockNotifier: Notifier = {
        info: jest.fn(),
        success: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };

      global.ocpRuntime = {
        notifier: mockNotifier
      } as any;

      await notifications.info('activity', 'title', 'summary', 'detail');
      expect(mockNotifier.info).toHaveBeenCalled();

      await notifications.success('activity', 'title', 'summary', 'detail');
      expect(mockNotifier.success).toHaveBeenCalled();

      await notifications.warn('activity', 'title', 'summary', 'detail');
      expect(mockNotifier.warn).toHaveBeenCalled();

      await notifications.error('activity', 'title', 'summary', 'detail');
      expect(mockNotifier.error).toHaveBeenCalled();
    });

    it('validates input - do not notify for invalid input', async () => {
      const mockNotifier: Notifier = {
        info: jest.fn(),
        success: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };

      global.ocpRuntime = {
        notifier: mockNotifier
      } as any;

      await notifications.info(' ', 'title', 'summary', 'detail');
      expect(mockNotifier.info).not.toHaveBeenCalled();

      await notifications.success('activity', ' ', 'summary', 'detail');
      expect(mockNotifier.success).not.toHaveBeenCalled();

      await notifications.warn('activity', 'title', ' ', 'detail');
      expect(mockNotifier.warn).not.toHaveBeenCalled();
    });
  });
});
