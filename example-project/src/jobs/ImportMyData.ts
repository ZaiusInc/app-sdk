import * as Zap from '@zaius/zap';

export class Foo extends Zap.Job {
  public async perform(state: any): Promise<any> {

    // ... do a batch of work ...

    return state;
  }
}
