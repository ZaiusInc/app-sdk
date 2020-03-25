import {CsvStream} from './CsvStream';
import {CsvRowProcessor} from './CsvRowProcessor';

export class ReadableStreamCsvStream extends CsvStream {
  constructor(private sourceStream: NodeJS.ReadableStream, rowProcessor: CsvRowProcessor, options = {}) {
    super(rowProcessor, options);
  }

  protected async buildPipeline(): Promise<NodeJS.ReadableStream> {
    return this.sourceStream;
  }
}
