export interface SourceEventForwarderResponse {
  success: boolean;
}

/**
 * Error thrown when source event api interaction fails
 */
export class SourceEventForwarderApiError extends Error { }

/**
 * Interface to forward source events
 */
export interface SourceEventForwarderApi {
  sendEvent(data: any): Promise<SourceEventForwarderResponse>;
}
