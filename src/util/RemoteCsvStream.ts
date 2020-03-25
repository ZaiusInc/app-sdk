import fetch from 'node-fetch';
import {URL} from 'url';
import * as zlib from 'zlib';
import {CsvStream} from './CsvStream';
import {CsvRowProcessor} from './CsvRowProcessor';

export class RemoteCsvStream extends CsvStream {
  constructor(private url: string, rowProcessor: CsvRowProcessor, options = {}) {
    super(rowProcessor, options);
  }

  protected async buildPipeline(): Promise<NodeJS.ReadableStream> {
    const response = await fetch(this.url);
    const pipeline = response.body;
    return /\.gz$/.test(new URL(this.url).pathname)
      ? pipeline.pipe(zlib.createGunzip())
      : pipeline;
  }
}
