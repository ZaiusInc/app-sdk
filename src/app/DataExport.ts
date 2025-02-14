export interface DataExportBatch<T> {
  items: T[];
  attempt: number;
  sync: DataSync;
}

export interface DataSync {
  id: string;
  name: string;
}

export interface DataExportDeliverResult {
  success: boolean;
  retryable?: boolean;
  failureReason?: string;
}

export interface DataExportReadyResult {
  ready: boolean;
  message?: string;
}

export interface GetDestinationSchemaResult {
  schema: DestinationSchema;
}

export interface DestinationField {
  name: string;
  display_name: string;
  type: string;
}

export interface DestinationSchema {
  destination_name: string;
  fields: DestinationField[];
}


export abstract class DataExport<T> {

  /**
   * Checks if the data export is ready to use.
   * This should ensure that any required credentials and/or other configuration exist and are valid.
   * Reasonable caching should be utilized to prevent excessive requests to external resources.
   * @async
   * @returns true if the data export is ready to use
   */
  public abstract ready(): Promise<DataExportReadyResult>;

  /**
   * Exports the given batch to i.e. an external system.
   * @param batch - The batch to be exported
   * @returns A DataExportBatchResult with success/failure,
   *          if the batch should be reried and a failure reason if applicable.
   */
  public abstract deliver(batch: DataExportBatch<T>): Promise<DataExportDeliverResult>;

  public abstract getDestinationSchema(): Promise<GetDestinationSchemaResult>;
}
