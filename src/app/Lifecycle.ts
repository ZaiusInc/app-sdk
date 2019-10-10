import {Response} from './lib';
import {LifecycleResult} from './types';

export abstract class Lifecycle {
  public abstract async onInstall(): Promise<LifecycleResult>;

  public abstract async onSettingsForm(page: string, action: string, formData: object): Promise<Response>;

  public abstract async onUpgrade(fromVersion: string): Promise<LifecycleResult>;

  public abstract async onFinalizeUpgrade(fromVersion: string): Promise<LifecycleResult>;

  public abstract async onUninstall(): Promise<LifecycleResult>;
}

export const LIFECYCLE_REQUIRED_METHODS = ['onInstall', 'onSettingsForm', 'onUpgrade', 'onFinalizeUpgrade', 'onUninstall'];
