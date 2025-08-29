import {Request} from './Request';
import {HttpMethod} from '../types';
import {QueryParams} from './QueryParams';

/**
 * @hidden
 */
export class InternalRequest extends Request {
  public readonly fullpath: string;

  public constructor(
    method: HttpMethod,
    fullpath: string,
    path: string,
    params: QueryParams,
    headers: string[][],
    body: Uint8Array | null
  ) {
    super(method, path, params, headers, body);
    this.fullpath = fullpath;
  }
}
