import {FunctionApi} from './FunctionApi';

export class LocalFunctionApi implements FunctionApi {
  public getEndpoints(): Promise<{[name: string]: string}> {
    throw new Error('Method not implemented.');
  }
}
