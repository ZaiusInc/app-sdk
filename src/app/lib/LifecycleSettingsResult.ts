export type Intent = 'info' | 'success' | 'warning' | 'danger';

/**
 * @hidden
 */
export interface LifecycleSettingsResponse {
  errors?: {[ref: string]: string[]};
  toasts?: Array<{intent: Intent, message: string}>;
  redirect?: string;
}

/**
 * Used to compose a response to the onSettingsForm lifecycle request
 */
export class LifecycleSettingsResult {
  private errors: {[field: string]: string[]} = {};
  private toasts: Array<{intent: Intent, message: string}> = [];
  private redirectLocation?: string;

  /**
   * Display a toast to user, such as, "Successfully authenticated with <Integration>" or
   * "Authentication failed, please check your credentials and try again."
   * @param intent One of the supported intents that will affect how the toast is displayed.
   * @param message to display in the toast
   */
  public addToast(intent: Intent, message: string) {
    this.toasts.push({intent, message});
    return this;
  }

  /**
   * Add an error to display to the user for a particular form field
   * @param field key to display the error under, as defined in the form schema
   * @param error message to display to the user
   */
  public addError(field: string, error: string) {
    if (!this.errors[field]) {
      this.errors[field] = [error];
    } else {
      this.errors[field].push(error);
    }
    return this;
  }

  /**
   * Redirect the user to another page, such as for an OAuth flow
   * @param url The destination URL for the redirect (location header)
   */
  public redirect(url: string) {
    this.redirectLocation = url;
    return this;
  }

  /**
   * @hidden
   * Used internally to get the complete response
   */
  public getResponse(page: string): LifecycleSettingsResponse {
    const errors: {[ref: string]: string[]} = {};
    for (const field of Object.keys(this.errors)) {
      errors[`${page}.${field}`] = this.errors[field];
    }

    return {
      redirect: this.redirectLocation,
      errors,
      toasts: this.toasts
    };
  }
}
