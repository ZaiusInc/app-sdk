import 'jest';
import {Request} from './lib';
import {RequestHandler} from './RequestHandler';

class SubClass extends RequestHandler {
  public async perform() {
    return this.response;
  }
}

describe('RequestHandler', () => {
  it('sets the request upon construction', () => {
    const request = new Request('GET', '/foo', {}, [], null);
    const handler = new SubClass(request);
    expect(handler['request']).toBe(request);
  });
});
