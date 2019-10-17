export type Intent = 'info' | 'success' | 'warning' | 'danger';

/**
 * @hidden
 */
export interface LifecycleSettingsResponse {
  success: boolean;
  errors?: {[ref: string]: string[]};
  toasts?: Array<{intent: Intent, message: string}>;
}

/**
 * Used to compose a response to the onSettingsForm lifecycle request
 */
export class LifecycleSettingsResult {
  private errors: {[ref: string]: string[]} = {};
  private toasts: Array<{intent: Intent, message: string}> = [];

  constructor(private page: string) {
  }

  /**
   * Display a toast to user, such as, "Successfully authenticated with <Integration>" or
   * "Authentication failed, please check your credentials and try again."
   * @param intent One of the supported intents that will affect how the toast is displayed.
   * @param message The string message to display in the toast
   */
  public addToast(intent: Intent, message: string) {
    this.toasts.push({intent, message});
  }

  /**
   * Add an error to display to the user for a particular form field
   * @param field The field key to display the error under
   * @param error The error message to display to the user
   */
  public addError(field: string, error: string) {
    const ref = `${this.page}.${field}`;
    if (!this.errors[ref]) {
      this.errors[ref] = [error];
    } else {
      this.errors[ref].push(error);
    }
  }

  /**
   * @hidden
   * Used internally to get a proper status code for the result
   */
  public statusCode() {
    return Object.keys(this.errors).length === 0 ? 200 : 400;
  }

  /**
   * @hidden
   * Used internally to get the response body
   */
  public response(): LifecycleSettingsResponse {
    if (Object.keys(this.errors).length === 0) {
      return {success: true};
    }
    return {
      success: false,
      errors: this.errors,
      toasts: this.toasts
    };
  }
}
