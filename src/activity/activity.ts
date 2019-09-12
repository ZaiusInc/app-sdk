import {ActivityApi} from './ActivityApi';
import {LocalActivityApi} from './LocalActivityApi';

let activityApi: ActivityApi = new LocalActivityApi();

/**
 * @hidden
 */
export const initialize = (api: ActivityApi) => {
  activityApi = api;
};


/**
 * Namespace for accessing activity apis
 */
export const activity: ActivityApi = {
  info(activity: string, details: string) {
    activityApi.info(activity, details);
  },

  success(activity: string, details: string) {
    activityApi.success(activity, details);
  },

  warn(activity: string, details: string) {
    activityApi.warn(activity, details);
  },

  error(activity: string, details: string) {
    activityApi.error(activity, details);
  }
};
