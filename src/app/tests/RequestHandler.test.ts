import 'jest';
import {Request, Response} from '../lib';
import {RequestHandler} from '../RequestHandler';

class SubClass extends RequestHandler {
  public async perform() {
    return new Response();
  }
}

describe('RequestHandler', () => {
  it('sets the request upon construction', () => {
    const request = new Request('GET', '/foo', {}, [], null);
    const handler = new SubClass(request);
    expect(handler['request']).toBe(request);
  });
});
