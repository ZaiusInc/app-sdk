import {Notifier} from './Notifier';
import {LocalNotifier} from './LocalNotifier';

let notifier: Notifier = new LocalNotifier();

/**
 * @hidden
 */
export const setNotifier = (logger: Notifier) => {
  notifier = logger;
};

/**
 * Namespace for accessing activity apis
 */
export const notifications: LocalNotifier = {
  info(activity: string, title: string, summary: string, details?: string) {
    notifier.info(activity, title, summary, details);
  },

  success(activity: string, title: string, summary: string, details?: string) {
    notifier.success(activity, title, summary, details);
  },

  warn(activity: string, title: string, summary: string, details?: string) {
    notifier.warn(activity, title, summary, details);
  },

  error(activity: string, title: string, summary: string, details?: string) {
    notifier.error(activity, title, summary, details);
  }
};
