import {ActivityLogger} from './ActivityLogger';
import {LocalActivityLogger} from './LocalActivityLogger';

let activityLogger: ActivityLogger = new LocalActivityLogger();

/**
 * @hidden
 */
export const setActivityLogger = (logger: ActivityLogger) => {
  activityLogger = logger;
};

/**
 * Namespace for accessing activity apis
 */
export const activityLog: ActivityLogger = {
  info(activity: string, title: string, summary: string, details: string) {
    activityLogger.info(activity, title, summary, details);
  },

  success(activity: string, title: string, summary: string, details: string) {
    activityLogger.success(activity, title, summary, details);
  },

  warn(activity: string, title: string, summary: string, details: string) {
    activityLogger.warn(activity, title, summary, details);
  },

  error(activity: string, title: string, summary: string, details: string) {
    activityLogger.error(activity, title, summary, details);
  }
};
