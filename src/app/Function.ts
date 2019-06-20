import {Request} from './lib';
import {RequestHandler} from './RequestHandler';

export abstract class Function extends RequestHandler {
  public constructor(request: Request) {
    super(request);
  }
}
