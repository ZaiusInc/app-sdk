export class FunctionApiError extends Error {}

export interface FunctionApi {
  getEndpoint(functionName: string): Promise<string>;
  getAllEndpoints(): Promise<{[name: string]: string}>;
}
