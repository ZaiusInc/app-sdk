export type Intent = 'info' | 'error' | 'success' | 'danger';

export interface LifecycleSettingsResponse {
  success: boolean;
  errors?: {[ref: string]: string[]};
  toasts?: Array<{intent: Intent, message: string}>;
}

export class LifecycleSettingsResult {
  private errors: {[ref: string]: string[]} = {};
  private toasts: Array<{intent: Intent, message: string}> = [];

  public addToast(intent: Intent, message: string) {
    this.toasts.push({intent, message});
  }

  public addError(section: string, field: string, error: string) {
    const ref = `${section}.${field}`;
    if (!this.errors[ref]) {
      this.errors[ref] = [error];
    } else {
      this.errors[ref].push(error);
    }
  }

  public statusCode() {
    return Object.keys(this.errors).length === 0 ? 200 : 400;
  }

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
