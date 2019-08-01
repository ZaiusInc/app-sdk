/**
 * Error thrown when function api interaction fails
 */
export class FunctionApiError extends Error {}

/**
 * Hash of function to name to endpoint url
 */
export interface FunctionEndpoints {
  [name: string]: string;
}

/**
 * Provides access to function endpoint urls
 */
export interface FunctionApi {
  /**
   * Retrieves the current set of available function endpoints urls. The urls do not contain a trailing slash.
   *
   * @return hash of function name to endpoint url
   */
  getEndpoints(): Promise<FunctionEndpoints>;
}
