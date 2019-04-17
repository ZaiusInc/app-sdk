import * as Zap from '@zaius/zap';

export class Foo extends Zap.Function {
  public async perform(): Promise<Zap.Response> {
    const response = new Zap.Response();
    response.status = 200;
    response.bodyJSON = {
      test: 'foo'
    };
    return response;
  }
}
