export interface DestinationBatch<T extends {_isDeleted?: boolean}> {
  items: T[];
  attempt: number;
  sync: DataSync;
}

export interface DataSync {
  id: string;
  name: string;
}

export interface DestinationDeliverResult {
  success: boolean;
  retryable?: boolean;
  failureReason?: string;
}

export interface DestinationReadyResult {
  ready: boolean;
  message?: string;
}

export interface GetDestinationSchemaResult {
  schema: DestinationSchemaResult;
}

export interface DestinationField {
  name: string;
  display_name: string;
  type: string;
}

export interface DestinationSchemaResult {
  destination_name: string;
  fields: DestinationField[];
}

export abstract class Destination<T extends {_isDeleted?: boolean}> {
  /**
   * Checks if the Destination ready to use.
   * This should ensure that any required credentials and/or other configuration exist and are valid.
   * Reasonable caching should be utilized to prevent excessive requests to external resources.
   * @async
   * @returns true if the destination ready to use
   */
  public abstract ready(): Promise<DestinationReadyResult>;

  /**
   * Delivers the given batch to i.e. an external system.
   * @param batch - The batch to be delivered. Each item in batch.items may have an _isDeleted flag
   *                to indicate delete operations. Check batchItem._isDeleted for each item to handle deletions.
   * @returns A DestinationDeliverResult with success/failure,
   *          if the batch should be retried and a failure reason if applicable.
   */
  public abstract deliver(batch: DestinationBatch<T>): Promise<DestinationDeliverResult>;
}
