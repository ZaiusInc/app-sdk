import * as Zap from '@zaius/zap';
import {Response} from '../../../src/zap/lib';
import {LifecycleResult} from '../../../src/zap/types';

export class Lifecycle extends Zap.Lifecycle {
  public async onSetupForm(_page: string, _action: string, _formData: object): Promise<Response> {
    const response = new Response();
    response.status = 200;
    return Promise.resolve(response);
  }

  public async onUpgrade(_fromVersion: string): Promise<LifecycleResult> {
    return Promise.resolve({success: true});
  }

  public async onFinalizeUpgrade(_fromVersion: string): Promise<LifecycleResult> {
    return Promise.resolve({success: true});
  }

  public async onUninstall(): Promise<LifecycleResult> {
    return Promise.resolve({success: true});
  }
}
