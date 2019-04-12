import * as Zap from '@zaius/zap';

export class Install extends Zap.Lifecycle {
  public async perform(): Promise<boolean> {
    return true;
  }
}
