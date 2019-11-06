import {FunctionApi} from './FunctionApi';
import {LocalFunctionApi} from './LocalFunctionApi';

let functionApi = new LocalFunctionApi();

/**
 * @hidden
 */
export const initializeFunctionApi = (api: FunctionApi) => {
  functionApi = api;
};

/**
 * The functions api implementation
 */
export const functions: FunctionApi = {
  getEndpoints(): Promise<{[name: string]: string}> {
    return functionApi.getEndpoints();
  },

  getAuthorizationGrantUrl(): string {
    return functionApi.getAuthorizationGrantUrl();
  }
};
