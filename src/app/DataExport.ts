export interface DataExportBatch<T> {
  data: T[];
  attempt: number;
}

export interface DataSync {
  id: string;
  name: string;
}

export interface DataExportBatchResult {
  success: boolean;
  retryable: boolean;
  failureReason?: string;
}

export abstract class DataExport<T> {

  /**
   * Checks if the data export is ready to use.
   * This should ensure that any required credentials and/or other configuration exist and are valid.
   * Reasonable caching should be utilized to prevent excessive requests to external resources.
   * @async
   * @returns true if the data export is ready to use
   */
  public abstract ready(): Promise<boolean>;

  /**
   * Exports the given batch to i.e. an external system.
   * @param batch - The batch to be exported
   * @returns A DataExportBatchResult with success/failure,
   *          if the batch should be reried and a failurer reason if applicable.
   */
  public abstract export(sync: DataSync, batch: DataExportBatch<T>): Promise<DataExportBatchResult>;
}
