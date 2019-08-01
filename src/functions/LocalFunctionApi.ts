import {FunctionApi, FunctionEndpoints} from './FunctionApi';

export class LocalFunctionApi implements FunctionApi {
  public getEndpoints(): Promise<FunctionEndpoints> {
    throw new Error('Method not implemented.');
  }
}
