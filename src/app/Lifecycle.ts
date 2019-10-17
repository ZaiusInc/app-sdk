import {PrimitiveFormValue} from '@zaius/app-forms-schema';
import {LifecycleResult} from './types';
import {LifecycleSettingsResult} from './types/LifecycleSettingsResult';

/**
 * The format form data will be provided in when the user submits a form or performs a button action.
 * Keys will be the field key as provided in the form definition.
 */
export interface SubmittedFormData {
  [field: string]: PrimitiveFormValue | PrimitiveFormValue[];
}

/**
 * Handler for all application lifecycle events, such as install, uninstall, etc
 */
export abstract class Lifecycle {
  /**
   * Called when an app is installed, before any other lifecycle methods can be used.
   * Peform any app specific pre-requisites here before the user is able to use or configure the app.
   * @returns {LifecycleResult} e.g., {success: true} if the install was successful.
   * If false, the app will not be installed and any data stored will be deleted, however,
   * schema or other account changes are not transactional and will not be undone.
   */
  public abstract async onInstall(): Promise<LifecycleResult>;

  /**
   * Handle a submission of a form page/section. You are responsible for performing any validation or
   * changes to the form data and then writing it to the settings store for the page.
   * @param page the name of the page/section submitted
   * @param action the action of the button that triggered the call, or 'save' by default
   * @param formData the data for the section as a hash of key/value pairs
   * @returns {LifecycleSettingsResult} with any errors that should be displayed to the user
   */
  public abstract async onSettingsForm(
    page: string, action: string, formData: SubmittedFormData
  ): Promise<LifecycleSettingsResult>;

  /**
   * Handle an upgrade. Perform any upgrade tasks here. All actions must be idempotent
   * and backwards compatible in case of an upgrade failure. This function is called *before*
   * functions are migrated to the new version.
   * @param fromVersion the previous version of the app we are upgrading from
   * @returns {LifecycleResult} e.g., {success: true} if the upgrade was successful.
   * If false, the app will be rolled back to the fromVersion.
   */
  public abstract async onUpgrade(fromVersion: string): Promise<LifecycleResult>;

  /**
   * Perform any final actions, such as registering new functions that were added to this version.
   * This function is called *after* all functions have been created and migrated to this version.
   * @param fromVersion the previous version of the app we are upgrading from
   * @returns {LifecycleResult} e.g., {success: true} if the upgrade was successful.
   * If false, the app will be rolled back to the fromVersion.
   */
  public abstract async onFinalizeUpgrade(fromVersion: string): Promise<LifecycleResult>;

  /**
   * Perform any actions on the integrations platform to complete an uninstall, such as removing
   * webhooks pointing at this installation.
   * @returns {LifecycleResult} specifiy if the uninstall was successful. If false, it may be retried.
   */
  public abstract async onUninstall(): Promise<LifecycleResult>;
}

/**
 * @hidden
 */
export const LIFECYCLE_REQUIRED_METHODS = [
  'onInstall',
  'onSettingsForm',
  'onUpgrade',
  'onFinalizeUpgrade',
  'onUninstall'
];
