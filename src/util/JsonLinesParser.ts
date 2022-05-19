import {Transform, TransformCallback} from 'stream';

declare const __NULL_VALUE_UNIQUE_KEY: unique symbol;
export type NullValue = typeof __NULL_VALUE_UNIQUE_KEY & {};
export const nullValue: NullValue = Object.create(null) as never;

export interface Options {
  /**
   * Specifies the number of lines at the beginning of a data file that the parser should skip over, prior to parsing
   * headers.
   * @default 0
   */
  readonly skipLines?: number;

  /**
   * Maximum number of bytes per row. An error is thrown if a line exceeds this value.
   * The default value is on 8 peta byte.
   * @default Number.MAX_SAFE_INTEGER
   */
  readonly maxRowBytes?: number;

  /**
   * If 'true', the parser will expect the data as arrays of values. Otherwise the data will be treated as regular
   * objects per line.
   * @default false
   */
  readonly tabularFormat?: boolean;

  /**
   * Specifies the headers to use. Headers define the property key for each value in a JsonLines row. If no `headers`
   * option is provided, `JsonLinesParser` will use the first line in a JsonLines file as the header specification.
   * This option needs {@link tabularFormat} in 'true'.
   */
  readonly headers?: ReadonlyArray<string> | boolean;

  /**
   * If `true`, instructs the parser that the number of columns
   * in each row must match the number of `headers` specified.
   * This option needs {@link tabularFormat} in 'true'.
   */
  readonly strict?: boolean;
}

const [cr] = Buffer.from('\r');
const [nl] = Buffer.from('\n');

/**
 * @hidden
 * This parser is based on the syntax showed on https://jsonlines.org/
 */
class JsonLinesParser extends Transform {
  private state = {
    first: false,
    lineNumber: 0,
    previousEnd: 0,
    rowLength: 0,
  };
  private _prev?: Buffer;
  private skipComments?: number;
  private skipLines = 0;
  private maxRowBytes = Number.MAX_SAFE_INTEGER;
  private tabularFormat: boolean = false;
  private headers?: ReadonlyArray<string>;
  private strict = false;

  constructor(opts: Options | ReadonlyArray<string> = {}) {
    super({objectMode: true, highWaterMark: 16});

    if ('length' in opts) {
      opts = {
        tabularFormat: true,
        headers: opts
      } as Options;
    }

    if (opts.tabularFormat) {
      this.tabularFormat = true;
      if (opts.headers || opts.headers === false) {
        if (opts.headers === false) {
          // enforce, as the column length check will fail if headers:false
          this.strict = false;
        } else if (opts.strict) {
          this.strict = true;
        }
        if (Array.isArray(opts.headers)) {
          this.headers = opts.headers;
        }
      } else {
        this.state.first = true;
        if (opts.strict) {
          this.strict = true;
        }
      }
    }
  }

  public _flush(cb: TransformCallback): void {
    if (!this._prev) return cb();
    this.parseLine(this._prev, this.state.previousEnd, this._prev.length + 1); // plus since online -1s
    cb();
  }

  public _transform(data: any, _enc: string, cb: TransformCallback) {
    if (typeof data === 'string') {
      data = Buffer.from(data);
    }
    let start = 0;
    let buffer = data;

    if (this._prev) {
      start = this._prev.length;
      buffer = Buffer.concat([this._prev, data]);
      this._prev = undefined;
    }

    const bufferLength = buffer.length;

    for (let i = start; i < bufferLength; i++) {
      const chr = buffer[i];

      this.state.rowLength++;
      if (this.state.rowLength > this.maxRowBytes) {
        return cb(new Error('Row exceeds the maximum size'));
      }

      if (chr === nl) {
        this.parseLine(buffer, this.state.previousEnd, i + 1);
        this.state.previousEnd = i + 1;
        this.state.rowLength = 0;
      }
    }

    if (this.state.previousEnd === bufferLength) {
      this.state.previousEnd = 0;
      return cb();
    }

    if (bufferLength - this.state.previousEnd < data.length) {
      this._prev = data;
      this.state.previousEnd -= (bufferLength - data.length);
      return cb();
    }

    this._prev = buffer;
    cb();
  }

  private parseLine(buffer: Buffer, start: number, end: number) {
    end--; // trim newline
    if (buffer.length && buffer[end - 1] === cr) {
      end--;
    }

    if (this.skipComments) {
      if (buffer[start] === this.skipComments) {
        return;
      }
    }

    try {
      const row: unknown = JSON.parse(buffer.subarray(start, end).toString());
      const skip = this.skipLines > this.state.lineNumber;
      this.state.lineNumber++;

      if (!skip) {
        if (this.tabularFormat) {
          if (Array.isArray(row)) {
            if (this.state.first) {
              if (row.every((it) => typeof it === 'string')) {
                this.state.first = false;
                this.headers = row;
                this.emit('headers', this.headers);
                return;
              } else {
                const e = new TypeError('The first line must be an array of strings (headers)');
                this.emit('error', e);
              }
            }

            if (this.strict && row.length !== this.headers!.length) {
              const e = new RangeError('Row length does not match headers');
              this.emit('error', e);
            } else {
              this.writeRow(row);
            }
          } else {
            const e = new TypeError('Each line must be an array of objects');
            this.emit('error', e);
          }
        } else {
          // Push directly the row as object
          if (row === null) {
            this.push(nullValue as never);
          } else {
            this.push(row);
          }
        }
      }
    } catch (e) {
      this.emit('error', e);
    }
  }

  private writeRow(cells: any[]): any {
    const headers = this.headers ? this.headers : cells.map((_value, index) => index);

    const row = cells.reduce((o, cell, index) => {
      const header = headers[index];
      if (header === null) return o; // skip columns
      if (header !== undefined) {
        o[header] = cell;
      } else {
        o[`_${index}`] = cell;
      }
      return o;
    }, {});

    this.push(row);
  }
}

export function parse(opts: Options): Transform {
  return new JsonLinesParser(opts);
}
