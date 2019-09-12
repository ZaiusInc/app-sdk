export interface ActivityLogger {
  /**
   * Write an information message to the activity log.
   * @param activity The activity
   * @param title The title
   * @param summary The activity summary
   * @param [details] The activity details
   */
  info(activity: string, title: string, summary: string, details?: string): void;

  /**
   * Write a sucess message to the activity log.
   * @param activity The activity
   * @param title The title
   * @param summary The activity summary
   * @param [details] The activity details
   */
  success(activity: string, title: string, summary: string, details?: string): void;

  /**
   * Write a warning message to the activity log.
   * @param activity The activity
   * @param title The title
   * @param summary The activity summary
   * @param [details] The activity details
   */
  warn(activity: string, title: string, summary: string, details?: string): void;

  /**
   * Write an error message to the activity log.
   * @param activity The activity
   * @param title The title
   * @param summary The activity summary
   * @param [details] The activity details
   */
  error(activity: string, title: string, summary: string, details?: string): void;
}
