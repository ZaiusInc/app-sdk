import {Request} from './lib/Request';
import {Response} from './lib/Response';

export abstract class RequestHandler {
  protected request: Request;
  protected response: Response = new Response();

  public constructor(request: Request) {
    this.request = request;
  }

  public abstract async perform(): Promise<Response>;
}
