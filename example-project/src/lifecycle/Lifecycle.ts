import * as Zap from '@zaius/zap';

export class Lifecycle extends Zap.Lifecycle {
  public async onSetupForm(_page: string, _action: string, _formData: object): Promise<Zap.Response> {
    const response = new Zap.Response();
    response.status = 200;
    return Promise.resolve(response);
  }

  public async onUpgrade(_fromVersion: string): Promise<Zap.LifecycleResult> {
    return Promise.resolve({success: true});
  }

  public async onFinalizeUpgrade(_fromVersion: string): Promise<Zap.LifecycleResult> {
    return Promise.resolve({success: true});
  }

  public async onUninstall(): Promise<Zap.LifecycleResult> {
    return Promise.resolve({success: true});
  }
}
