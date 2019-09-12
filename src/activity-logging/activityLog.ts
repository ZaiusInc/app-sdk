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
  info(title: string, activity: string, summary: string, details: string) {
    activityLogger.info(title, activity, summary, details);
  },

  success(title: string, activity: string, summary: string, details: string) {
    activityLogger.success(title, activity, summary, details);
  },

  warn(title: string, activity: string, summary: string, details: string) {
    activityLogger.warn(title, activity, summary, details);
  },

  error(title: string, activity: string, summary: string, details: string) {
    activityLogger.error(title, activity, summary, details);
  }
};
