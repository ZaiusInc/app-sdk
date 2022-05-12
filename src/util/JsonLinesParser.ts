import {Transform, TransformCallback} from 'stream';

export interface Options {
  /**
   * Specifies the headers to use. Headers define the property key for each value in a JsonLines row. If no `headers`
   * option is provided, `JsonLinesParser` will use the first line in a JsonLines file as the header specification.
   */
  readonly headers?: ReadonlyArray<string> | boolean;

  /**
   * Specifies a single-character string to denote the end of a line in a JsonLines file.
   * @default '\n'
   */
  readonly newline?: string;

  /**
   * Instructs the parser to ignore lines which represent comments in a JsonLines file. Since there is no specification
   * that dictates what a JsonLines comment looks like, comments should be considered non-standard. The "most common"
   * character used to signify a comment in a JsonLines file is `"#"`. If this option is set to `true`, lines which
   * begin with `#` will be skipped. If a custom character is needed to denote a commented line, this option may be set
   * to a string which represents the leading character(s) signifying a comment line.
   * @default false
   */
  readonly skipComments?: boolean | string;

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
   * If `true`, instructs the parser that the number of columns
   * in each row must match the number of `headers` specified.
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
    first: true,
    lineNumber: 0,
    previousEnd: 0,
    rowLength: 0,
  };
  private _prev?: Buffer;
  private headers?: ReadonlyArray<string>;
  private customNewline: boolean = false;
  private newline = nl;
  private skipComments?: number;
  private skipLines = 0;
  private maxRowBytes = Number.MAX_SAFE_INTEGER;
  private strict = false;

  constructor(opts: Options | ReadonlyArray<string> = {}) {
    super({objectMode: true, highWaterMark: 16});

    if ('length' in opts) {
      opts = {headers: opts} as Options;
    }

    if (opts.newline) {
      ([this.newline] = Buffer.from(opts.newline));
      this.customNewline = opts.newline !== '\n';
    }

    if (opts.headers || opts.headers === false) {
      this.state.first = false;
      if (opts.headers === false) {
        // enforce, as the column length check will fail if headers:false
        this.strict = false;
      }
      if (Array.isArray(opts.headers)) {
        this.headers = opts.headers;
      }
    }

    if (opts.skipComments) {
      const char = typeof opts.skipComments === 'string' ? opts.skipComments : '#';
      this.skipComments = Buffer.from(char)[0];
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
      const nextChr = i + 1 < bufferLength ? buffer[i + 1] : null;

      this.state.rowLength++;
      if (this.state.rowLength > this.maxRowBytes) {
        return cb(new Error('Row exceeds the maximum size'));
      }

      if (this.state.first && !this.customNewline) {
        if (chr === nl) {
          this.newline = nl;
        } else if (chr === cr) {
          if (nextChr !== nl) {
            this.newline = cr;
          }
        }
      }

      if (chr === this.newline) {
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
    if (!this.customNewline && buffer.length && buffer[end - 1] === cr) {
      end--;
    }

    if (this.skipComments) {
      if (buffer[start] === this.skipComments) {
        return;
      }
    }

    const cells: unknown = JSON.parse(buffer.subarray(start, end).toString());
    if (!Array.isArray(cells)) {
      const e = new TypeError('Each line must be an array of objects');
      this.emit('error', e);
    } else {
      const skip = this.skipLines > this.state.lineNumber;
      this.state.lineNumber++;

      if (!skip) {
        if (this.state.first) {
          if (cells.every((it) => typeof it === 'string')) {
            this.state.first = false;
            this.headers = cells;

            this.emit('headers', this.headers);
            return;
          } else {
            const e = new TypeError('The first line must be an array of strings');
            this.emit('error', e);
          }
        }

        if (this.strict && cells.length !== this.headers!.length) {
          const e = new RangeError('Row length does not match headers');
          this.emit('error', e);
        } else {
          this.writeRow(cells);
        }
      }
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
