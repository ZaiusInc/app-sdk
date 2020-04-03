import {Request} from './lib';
import {RequestHandler} from './RequestHandler';

export abstract class GlobalFunction extends RequestHandler {
  public constructor(request: Request) {
    super(request);
  }
}
