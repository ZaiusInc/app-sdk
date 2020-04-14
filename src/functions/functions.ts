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
  getEndpoints(installId?: number): Promise<{[name: string]: string}> {
    return functionApi.getEndpoints(installId);
  },

  getGlobalEndpoints(): Promise<{[name: string]: string}> {
    return functionApi.getGlobalEndpoints();
  },

  getAuthorizationGrantUrl(): string {
    return functionApi.getAuthorizationGrantUrl();
  }
};
