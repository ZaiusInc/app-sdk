import {logger} from '../logging';
import * as csv from 'csv-parser';
import * as ObjectHash from 'object-hash';
import {Stream} from 'stream';
import fetch from 'node-fetch';
import {URL} from 'url';
import * as zlib from 'zlib';
import {Options} from 'csv-parser';

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

/**
 * Builds source streams for the CsvStream to process.
 */
export type CsvReadableStreamBuilder = () => Promise<NodeJS.ReadableStream>;

export class CsvStream<T> {
  /**
   * Build a CsvStream from an existing ReadableStream.
   * @param stream source stream for the csv data
   * @param processor the row processor
   * @param options options to provide the underlying parser,
   * see https://github.com/mafintosh/csv-parser#csvoptions--headers
   */
  public static fromStream<T>(stream: NodeJS.ReadableStream,
                              processor: CsvRowProcessor<T>,
                              options: Options = {}): CsvStream<T> {
    return new CsvStream(async () => stream, processor, options);
  }

  /**
   * Build a CsvStream that reads from a web resource.
   * @param url source url for the csv data
   * @param processor the row processor
   * @param options options to provide the underlying parser,
   * see https://github.com/mafintosh/csv-parser#csvoptions--headers
   */
  public static fromUrl<T>(url: string, processor: CsvRowProcessor<T>, options: Options = {}): CsvStream<T> {
    const builder: CsvReadableStreamBuilder = async () => {
      const response = await fetch(url);
      const pipeline = response.body;
      return /\.gz$/.test(new URL(url).pathname)
        ? pipeline.pipe(zlib.createGunzip())
        : pipeline;
    };

    return new CsvStream(builder, processor, options);
  }

  private readStream?: NodeJS.ReadableStream;
  private pipelineFinished = false;
  private onPause!: (marker: string | null) => void;
  private onError!: (error: Error) => void;
  private resume?: () => void;
  private fastforwardMarker?: string;

  constructor(private streamBuilder: CsvReadableStreamBuilder,
              private rowProcessor: CsvRowProcessor<T>,
              private options: Options = {}) { }

  public get isFinished() {
    return this.pipelineFinished;
  }

  public async fastforward(target: string) {
    this.fastforwardMarker = target;
    return this.processSome();
  }

  public async processSome(): Promise<string | null> {
    if (this.pipelineFinished) {
      return null;
    }

    if (!this.readStream) {
      await this.createPipe();
    }

    return new Promise((resolve, reject) => {
      this.onError = reject;
      this.onPause = (marker) => {
        resolve(marker);
      };

      if (this.resume) {
        this.resume();
      } else {
        this.readStream!.resume();
      }
    });
  }

  private async createPipe() {
    let pipeline = this.readStream = await this.streamBuilder();
    const rowProcessor = this.rowProcessor;
    pipeline = pipeline.pipe(csv(this.options)).pipe(new Stream.Transform({
      writableObjectMode: true,
      transform: (row, _, callback) => {
        // if we're fastforwarding in order to resume
        if (this.fastforwardMarker) {
          if (this.fastforwardMarker === ObjectHash.sha1(row)) {
            this.resume = callback;
            const hash = this.fastforwardMarker;
            this.fastforwardMarker = undefined;
            this.onPause(hash);
          } else {
            callback();
          }
        } else {
          rowProcessor.process(row).then((canPause: boolean) => {
            if (canPause) {
              this.resume = callback;
              this.onPause(ObjectHash.sha1(row));
            } else {
              callback();
            }
          }).catch((error) => {
            logger.error(error, 'on row:', row);
            this.onError(error);
          });
        }
      }
    }));

    pipeline.on('finish', async (error) => {
      this.pipelineFinished = true;
      this.resume = undefined;
      if (error) {
        console.error(error);
        this.onError(error);
      } else {
        await this.rowProcessor.complete();
        this.onPause(null);
      }
    });

    this.readStream.pause();
  }
}
