import * as Zap from '@zaius/zap';

export class Foo extends Zap.Function {
  public async perform(): Promise<Zap.Response> {
    this.response.status = 200;
    this.response.bodyJSON = {
      test: 'foo'
    };
    return this.response;
  }
}
