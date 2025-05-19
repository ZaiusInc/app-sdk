export interface SourceEventForwarderResponse {
  success: boolean;
  message?: string;
}

/**
 * Error thrown when source event api interaction fails
 */
export class SourceEventForwarderApiError extends Error { }

/**
 * Interface to forward source events
 */
export interface SourceEventForwarderApi {
  sendEvent(data: object): Promise<SourceEventForwarderResponse>;
}
