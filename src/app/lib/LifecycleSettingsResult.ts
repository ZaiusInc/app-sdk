import {FormResult, Intent} from './FormResult';

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
export class LifecycleSettingsResult extends FormResult {
  private redirectLocation?: string;

  /**
   * Add an error to display to the user for a particular form field (implicitly scoped to the submitted section)
   * @param field key to display the error under, as defined in the form schema
   * @param error message to display to the user
   */
  public addError(field: string, error: string): this {
    return this.addErrorInternal(field, error);
  }

  /**
   * Redirect the user to another page, such as for an OAuth flow
   * @param url The destination URL for the redirect (location header)
   */
  public redirect(url: string): this {
    this.redirectLocation = url;
    return this;
  }

  /**
   * @hidden
   * Used internally to get the complete response
   */
  public getResponse(section: string): LifecycleSettingsResponse {
    const errors: {[ref: string]: string[]} = {};
    for (const field of Object.keys(this.errors)) {
      errors[`${section}.${field}`] = this.errors[field];
    }

    return {
      redirect: this.redirectLocation,
      errors,
      toasts: this.toasts
    };
  }
}
