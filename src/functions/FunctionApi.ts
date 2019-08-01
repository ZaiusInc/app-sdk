export class FunctionApiError extends Error {}

export interface FunctionEndpoints {
  [name: string]: string;
}

export interface FunctionApi {
  getEndpoints(): Promise<FunctionEndpoints>;
}
