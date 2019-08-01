import {FunctionApi} from './FunctionApi';
import {LocalFunctionApi} from './LocalFunctionApi';

let functionApi = new LocalFunctionApi();

export const initializeFunctionApi = (api: FunctionApi) => {
  functionApi = api;
};

export const functions: FunctionApi = {
  getEndpoint(functionName: string): Promise<string> {
    return functionApi.getEndpoint(functionName);
  },
  getAllEndpoints(): Promise<{[name: string]: string}> {
    return functionApi.getAllEndpoints();
  }
};
