import 'jest';
import {Notifier, setNotifier, notifications, InvalidNotificationError} from '../notifications';

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
  describe('validation', () => {
    it('validates activity', () => {
      expect(() => {
        notifications.info('', 'title', 'summary', 'detail');
      }).toThrowError(new InvalidNotificationError('activity cannot be blank'));

      expect(() => {
        notifications.success('', 'title', 'summary', 'detail');
      }).toThrowError(new InvalidNotificationError('activity cannot be blank'));

      expect(() => {
        notifications.warn('', 'title', 'summary', 'detail');
      }).toThrowError(new InvalidNotificationError('activity cannot be blank'));

      expect(() => {
        notifications.error('', 'title', 'summary', 'detail');
      }).toThrowError(new InvalidNotificationError('activity cannot be blank'));
    });
    it('validates title', () => {
      expect(() => {
        notifications.info('activity', '', 'summary', 'detail');
      }).toThrowError(new InvalidNotificationError('title cannot be blank'));

      expect(() => {
        notifications.success('activity', '', 'summary', 'detail');
      }).toThrowError(new InvalidNotificationError('title cannot be blank'));

      expect(() => {
        notifications.warn('activity', '', 'summary', 'detail');
      }).toThrowError(new InvalidNotificationError('title cannot be blank'));

      expect(() => {
        notifications.error('activity', '', 'summary', 'detail');
      }).toThrowError(new InvalidNotificationError('title cannot be blank'));
    });
    it('validates summary', () => {
      expect(() => {
        notifications.info('activity', 'title', '', 'detail');
      }).toThrowError(new InvalidNotificationError('summary cannot be blank'));

      expect(() => {
        notifications.success('activity', 'title', '', 'detail');
      }).toThrowError(new InvalidNotificationError('summary cannot be blank'));

      expect(() => {
        notifications.warn('activity', 'title', '', 'detail');
      }).toThrowError(new InvalidNotificationError('summary cannot be blank'));

      expect(() => {
        notifications.error('activity', 'title', '', 'detail');
      }).toThrowError(new InvalidNotificationError('summary cannot be blank'));
    });
  });
});
