import * as App from '@zaius/app-sdk';

export class Lifecycle extends App.Lifecycle {
  public async onSetupForm(_page: string, _action: string, _formData: object): Promise<App.Response> {
    const response = new App.Response();
    response.status = 200;
    return Promise.resolve(response);
  }

  public async onUpgrade(_fromVersion: string): Promise<App.LifecycleResult> {
    return Promise.resolve({success: true});
  }

  public async onFinalizeUpgrade(_fromVersion: string): Promise<App.LifecycleResult> {
    return Promise.resolve({success: true});
  }

  public async onUninstall(): Promise<App.LifecycleResult> {
    return Promise.resolve({success: true});
  }
}
