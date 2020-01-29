import {Notifier} from './Notifier';
import {LocalNotifier} from './LocalNotifier';

let notifier: Notifier = new LocalNotifier();

/**
 * Error thrown when a notification is malformed.
 */
export class InvalidNotificationError extends Error {}

const validate = (activity: string, title: string, summary: string, _details?: string) => {
  if (activity.trim().length === 0) {
    throw new InvalidNotificationError('activity cannot be blank');
  }
  if (title.trim().length === 0) {
    throw new InvalidNotificationError('title cannot be blank');
  }
  if (summary.trim().length === 0) {
    throw new InvalidNotificationError('summary cannot be blank');
  }
};
/**
 * @hidden
 */
export const setNotifier = (logger: Notifier) => {
  notifier = logger;
};

/**
 * Namespace for accessing notifications
 */
export const notifications: LocalNotifier = {
  info(activity: string, title: string, summary: string, details?: string) {
    validate(activity, title, summary, details);
    notifier.info(activity, title, summary, details);
  },

  success(activity: string, title: string, summary: string, details?: string) {
    validate(activity, title, summary, details);
    notifier.success(activity, title, summary, details);
  },

  warn(activity: string, title: string, summary: string, details?: string) {
    validate(activity, title, summary, details);
    notifier.warn(activity, title, summary, details);
  },

  error(activity: string, title: string, summary: string, details?: string) {
    validate(activity, title, summary, details);
    notifier.error(activity, title, summary, details);
  }
};
