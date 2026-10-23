export interface SourceResponse {
  success: boolean;
  message?: string;
}

/**
 * Reserved fields the data sync pipeline reads on emitted items and sets on delivered items.
 */
export interface DataSyncItemFlags {
  /** true marks a delete: set it when emitting from a source, check it when delivering to a destination. */
  _isDeleted?: boolean;
  /** BCP 47 locale of the record. */
  _locale?: string;
}

export interface SourceData<T extends object = DataSyncItemFlags> {
  data: T;
  /** @deprecated Ignored by the runtime. Set `_isDeleted: true` on `data` instead. */
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
