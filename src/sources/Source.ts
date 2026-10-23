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
 * Interface to interact with sources
 */
export interface Source {
  /**
   * Emit data to be processed and send to the destination.
   * @param data - SourceData the data to be emitted
   * @returns A SourceResponse with success/failure and optional message in case
   *          of failure.
   */
  emit<T extends object>(data: SourceData<T>): Promise<SourceResponse>;
}
