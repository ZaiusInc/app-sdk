import {FunctionApi} from './FunctionApi';
import {LocalFunctionApi} from './LocalFunctionApi';

let functionApi = new LocalFunctionApi();

export const initializeFunctionApi = (api: FunctionApi) => {
  functionApi = api;
};

export const functions: FunctionApi = {
  getEndpoints(): Promise<{[name: string]: string}> {
    return functionApi.getEndpoints();
  }
};
