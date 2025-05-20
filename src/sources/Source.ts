export interface SourceResponse {
  success: boolean;
  message?: string;
}

export interface SourceData<T extends object> {
  data: T;
}

/**
 * Error thrown when source interaction fails
 */
export class SourceError extends Error { }

/**
 * Interface to interact with sources
 */
export interface Source {

  /**
   * Send send data to be processed and send to the destination.
   * @param data - SourceData the data   to be send
   * @returns A SourceResponse wiht success/failure and optional message in case
   *          of failure.
   */
  sendData<T extends object>(data: SourceData<T>): Promise<SourceResponse>;
}

