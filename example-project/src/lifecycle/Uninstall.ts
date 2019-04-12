import * as Zap from '@zaius/zap';

export class Uninstall extends Zap.Lifecycle {
  public async perform(): Promise<boolean> {
    return true;
  }
}
