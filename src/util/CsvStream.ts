import {logger} from '../logging';
import * as csv from 'csv-parser';
import * as ObjectHash from 'object-hash';
import {Stream} from 'stream';
import {CsvRowProcessor} from './CsvRowProcessor';

export abstract class CsvStream {
  private readStream?: NodeJS.ReadableStream;
  private pipelineFinished = false;
  private onPause!: (marker: string | null) => void;
  private onError!: (error: Error) => void;
  private resume?: () => void;
  private fastforwardMarker?: string;

  constructor(private rowProcessor: CsvRowProcessor, private options = {}) { }

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

  protected abstract async buildPipeline(): Promise<NodeJS.ReadableStream>;

  private async createPipe() {
    let pipeline = this.readStream = await this.buildPipeline();
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
