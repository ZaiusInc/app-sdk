export interface CsvRow {
  [column: string]: string;
}

export interface CsvRowProcessor<T = CsvRow> {
  /**
   * Process a row from a csv file.
   * @param row to process
   * @return true if it is safe to pause after this row, false otherwise
   */
  process(row: T): Promise<boolean>;

  /**
   * Complete any pending work. Called when the source csv file has
   * been completely processed.
   */
  complete(): Promise<void>;
}
