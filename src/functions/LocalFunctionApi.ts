import {FunctionApi, FunctionEndpoints} from './FunctionApi';

/**
 * A stub of the function api
 *
 * @TODO implement the stub for local development purposes
 */
export class LocalFunctionApi implements FunctionApi {
  public getEndpoints(): Promise<FunctionEndpoints> {
    throw new Error('Method not implemented.');
  }
}
