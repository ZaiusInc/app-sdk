export interface ActivityApi {
  /**
   * Write an information message to the activity log.
   * @param activity The activity
   * @param details The activity details
   */
  info(activity: string, details: string): void;

  /**
   * Write a sucess message to the activity log.
   * @param activity The activity
   * @param details The activity details
   */
  success(activity: string, details: string): void;

  /**
   * Write a warning message to the activity log.
   * @param activity The activity
   * @param details The activity details
   */
  warn(activity: string, details: string): void;

  /**
   * Write an error message to the activity log.
   * @param activity The activity
   * @param details The activity details
   */
  error(activity: string, details: string): void;
}
