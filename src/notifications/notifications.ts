import {Notifier} from './Notifier';
import {LocalNotifier} from './LocalNotifier';
import {logger} from '../logging';
import {getOCPContext} from '../app';

const localNotifier: Notifier = new LocalNotifier();

const validate = (activity: string, title: string, summary: string, _details?: string) => {
  const errors = [];

  if (activity.trim().length === 0) {
    errors.push('activity cannot be blank');
  }
  if (title.trim().length === 0) {
    errors.push('title cannot be blank');
  }
  if (summary.trim().length === 0) {
    errors.push('summary cannot be blank');
  }
  if (errors.length === 0) {
    return true;
  } else {
    logger.error(`Unable to send notification: ${errors.join(', ')}`);
    return false;
  }
};

function getNotifier(): Notifier {
  return getOCPContext()?.ocpRuntime?.notifier || localNotifier;
}

/**
 * Namespace for accessing notifications
 */
export const notifications: LocalNotifier = {
  async info(activity: string, title: string, summary: string, details?: string): Promise<void> {
    if (validate(activity, title, summary, details)) {
      await getNotifier().info(activity, title, summary, details);
    }
  },

  async success(activity: string, title: string, summary: string, details?: string): Promise<void> {
    if (validate(activity, title, summary, details)) {
      await getNotifier().success(activity, title, summary, details);
    }
  },

  async warn(activity: string, title: string, summary: string, details?: string): Promise<void> {
    if (validate(activity, title, summary, details)) {
      await getNotifier().warn(activity, title, summary, details);
    }
  },

  async error(activity: string, title: string, summary: string, details?: string): Promise<void> {
    if (validate(activity, title, summary, details)) {
      await getNotifier().error(activity, title, summary, details);
    }
  }
};
