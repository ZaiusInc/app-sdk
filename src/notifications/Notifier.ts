export interface Notifier {
  /**
   * Create an informational notification.
   * @param activity The activity
   * @param title The title
   * @param summary The activity summary
   * @param [details] The activity details
   */
  info(activity: string, title: string, summary: string, details?: string): void;

  /**
   * Create a success notification.
   * @param activity The activity
   * @param title The title
   * @param summary The activity summary
   * @param [details] The activity details
   */
  success(activity: string, title: string, summary: string, details?: string): void;

  /**
   * Create a warning notification.
   * @param activity The activity
   * @param title The title
   * @param summary The activity summary
   * @param [details] The activity details
   */
  warn(activity: string, title: string, summary: string, details?: string): void;

  /**
   * Create an error notification.
   * @param activity The activity
   * @param title The title
   * @param summary The activity summary
   * @param [details] The activity details
   */
  error(activity: string, title: string, summary: string, details?: string): void;
}
