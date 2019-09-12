import {ActivityLogger} from './ActivityLogger';
import {LocalActivityLogger} from './LocalActivityLogger';

let activityLogger: ActivityLogger = new LocalActivityLogger();

/**
 * @hidden
 */
export const initialize = (logger: ActivityLogger) => {
  activityLogger = logger;
};

/**
 * Namespace for accessing activity apis
 */
export const activityLog: ActivityLogger = {
  info(activity: string, details: string) {
    activityLogger.info(activity, details);
  },

  success(activity: string, details: string) {
    activityLogger.success(activity, details);
  },

  warn(activity: string, details: string) {
    activityLogger.warn(activity, details);
  },

  error(activity: string, details: string) {
    activityLogger.error(activity, details);
  }
};
