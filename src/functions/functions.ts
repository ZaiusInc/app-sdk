import {FunctionApi} from './FunctionApi';
import {LocalFunctionApi} from './LocalFunctionApi';
import {getOCPContext} from '../app';

const localFunctionApi = new LocalFunctionApi();

function getFunctionApi(): FunctionApi {
  return getOCPContext()?.ocpRuntime?.functionApi || localFunctionApi;
}

/**
 * The functions api implementation
 */
export const functions: FunctionApi = {

  getEndpoints(installId?: number): Promise<{[name: string]: string}> {
    return getFunctionApi().getEndpoints(installId);
  },

  getGlobalEndpoints(): Promise<{[name: string]: string}> {
    return getFunctionApi().getGlobalEndpoints();
  },

  getAuthorizationGrantUrl(): string {
    return getFunctionApi().getAuthorizationGrantUrl();
  }
};
