import {FunctionApi} from './FunctionApi';

export class LocalFunctionApi implements FunctionApi {
  public getEndpoint(_functionName: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  public getAllEndpoints(): Promise<{[name: string]: string}> {
    throw new Error('Method not implemented.');
  }
}
