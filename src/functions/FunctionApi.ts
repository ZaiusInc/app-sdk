export class FunctionApiError extends Error {}

export interface FunctionApi {
  getEndpoints(): Promise<{[name: string]: string}>;
}
