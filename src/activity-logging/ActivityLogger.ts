export interface ActivityLogger {
  /**
   * Write an information message to the activity log.
   * @param activity The activity
   * @param details The activity details
   */
  info(title: string, activity: string, summary: string, details: string): void;

  /**
   * Write a sucess message to the activity log.
   * @param title The title
   * @param activity The activity
   * @param summary The activity summary
   * @param details The activity details
   */
  success(title: string, activity: string, summary: string, details: string): void;

  /**
   * Write a warning message to the activity log.
   * @param title The title
   * @param activity The activity
   * @param summary The activity summary
   * @param details The activity details
   */
  warn(title: string, activity: string, summary: string, details: string): void;

  /**
   * Write an error message to the activity log.
   * @param title The title
   * @param activity The activity
   * @param summary The activity summary
   * @param details The activity details
   */
  error(title: string, activity: string, summary: string, details: string): void;
}
