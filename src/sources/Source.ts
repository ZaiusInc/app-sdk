export interface SourceResponse {
  success: boolean;
  message?: string;
}

export interface SourceData<T extends object> {
  data: T;
  isDelete?: boolean;
}

/**
 * Error thrown when source interaction fails
 */
export class SourceError extends Error {}

/**
 * Interface to interact with sources from SourceFunction/SourceJob context.
 * @deprecated Use {@link sources.emit} instead, which allows emitting data to a source
 * from any function or job without requiring a SourceFunction/SourceJob context.
 */
export interface Source {
  /**
   * Emit data to be processed and sent to the destination.
   * Used by SourceFunction/SourceJob - data goes to the specific data sync.
   * @param data - SourceData the data to be emitted
   * @returns A SourceResponse with success/failure and optional message in case
   *          of failure.
   * @deprecated Use {@link sources.emit} instead, which allows emitting data to a source
   * from any function or job without requiring a SourceFunction/SourceJob context.
   */
  emit<T extends object>(data: SourceData<T>): Promise<SourceResponse>;
}
