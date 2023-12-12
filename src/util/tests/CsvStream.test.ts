/* eslint max-classes-per-file: "off" */
import 'jest';
import {CsvRowProcessor, CsvStream} from '../CsvStream';
import * as nock from 'nock';
import {Stream} from 'stream';
import {Options} from 'csv-parser';
import * as ObjectHash from 'object-hash';
import {JsonLinesStream} from '../JsonLinesStream';

interface Row {
  col1: string;
  col2: string;
  col3: string;
}

class TestCsvRowProcessor implements CsvRowProcessor<Row> {
  public constructor(private completed = false, private readRows: Row[] = []) { }

  public get isCompleted() {
    return this.completed;
  }

  public get rows() {
    return this.readRows;
  }

  public async process(row: Row): Promise<boolean> {
    this.rows.push(row);
    return this.rows.length % 2 === 0;
  }

  public async complete(): Promise<void> {
    this.completed = true;
  }
}

class FailingCsvLinesRowProcessor extends TestCsvRowProcessor {
  public override async complete(): Promise<void> {
    throw new Error('complete failed');
  }
}

describe('CsvStream', () => {
  const processAndVerify = async (stream: CsvStream<Row>, processor: TestCsvRowProcessor) => {
    await stream.processSome();
    expect(processor.isCompleted).toBe(true);
    expect(processor.rows.length).toBe(1);
    expect(processor.rows[0]).toEqual({
      col1: 'val1',
      col2: 'val2',
      col3: 'val3'
    });
  };

  const processAndVerifyError = async (
    stream: JsonLinesStream<Row>,
    processor: TestCsvRowProcessor,
    error: string
  ) => {
    await expect(() => stream.processSome()).rejects.toThrowError(error);
    expect(processor.isCompleted).toBe(false);
  };

  it('builds instances processes from a stream', async () => {
    const readable = new Stream.Readable();
    readable.push('col1,col2,col3\nval1,val2,val3\n');
    readable.push(null);

    const processor = new TestCsvRowProcessor();
    await processAndVerify(
      CsvStream.fromStream(readable, processor),
      processor
    );
  });

  it('builds instances processes from a url', async () => {
    nock('https://zaius.app.sdk')
      .get('/csv')
      .reply(200, 'col1,col2,col3\nval1,val2,val3\n');

    const processor = new TestCsvRowProcessor();
    await processAndVerify(
      CsvStream.fromUrl('https://zaius.app.sdk/csv', processor),
      processor
    );
  });

  it('passes along config for csv-parser', async () => {
    const readable = new Stream.Readable();
    readable.push('COL1,COL2,COL3\nVAL1,VAL2,VAL3\n');
    readable.push(null);
    const options: Options = {
      mapHeaders: ({ header}) => header.toLowerCase(),
      mapValues: ({ value }) => (value as string).toLowerCase()
    };

    const processor = new TestCsvRowProcessor();
    await processAndVerify(
      CsvStream.fromStream(readable, processor, options),
      processor
    );
  });

  it('should pause and resume', async () => {
    const readable = new Stream.Readable();
    readable.push('col1,col2,col3\n');
    readable.push('val1,val2,val3\n');
    readable.push('val4,val5,val6\n');
    readable.push('val7,val8,val9\n');
    readable.push(null);

    const processor = new TestCsvRowProcessor();
    const stream = CsvStream.fromStream(readable, processor);
    await stream.processSome();
    expect(processor.isCompleted).toBe(false);
    expect(processor.rows.length).toBe(2);
    expect(processor.rows[0]).toEqual({
      col1: 'val1',
      col2: 'val2',
      col3: 'val3'
    });
    expect(processor.rows[1]).toEqual({
      col1: 'val4',
      col2: 'val5',
      col3: 'val6'
    });

    await stream.processSome();
    expect(processor.isCompleted).toBe(true);
    expect(processor.rows.length).toBe(3);
    expect(processor.rows[2]).toEqual({
      col1: 'val7',
      col2: 'val8',
      col3: 'val9'
    });
  });

  it('should fast forward to a specified record and resume', async () => {
    const readable = new Stream.Readable();
    readable.push('col1,col2,col3\n');
    readable.push('val1,val2,val3\n');
    readable.push('val4,val5,val6\n');
    readable.push(null);

    const processor = new TestCsvRowProcessor();
    const marker = ObjectHash.sha1({
      col1: 'val1',
      col2: 'val2',
      col3: 'val3'
    });

    const stream = CsvStream.fromStream(readable, processor);
    await stream.fastforward(marker);
    await stream.processSome();
    expect(processor.isCompleted).toBe(true);
    expect(processor.rows.length).toBe(1);
    expect(processor.rows[0]).toEqual({
      col1: 'val4',
      col2: 'val5',
      col3: 'val6'
    });
  });

  it('should throw error for broken stream', async () => {
    nock('https://zaius.app.sdk')
      .get('/csv')
      .replyWithError('streaming error');

    const processor = new TestCsvRowProcessor();
    await processAndVerifyError(
      JsonLinesStream.fromUrl('https://zaius.app.sdk/csv', processor, {tabularFormat: true}),
      processor,
      'streaming error'
    );
  });

  it('should throw error for invalid format', async () => {
    const readable = new Stream.Readable();
    readable.push('["col1","col2","col3"]\n');
    readable.push('["val1","val2","val3"]\n');
    readable.push('["val4","val5","val6"');
    readable.push(null);


    const processor = new TestCsvRowProcessor();
    await processAndVerifyError(
      JsonLinesStream.fromStream(readable, processor, {tabularFormat: true}),
      processor,
      'Unexpected end of JSON input'
    );
  });

  it('should throw error when complete method fails', async () => {
    const readable = new Stream.Readable();
    readable.push('["col1","col2","col3"]\n');
    readable.push(null);

    const processor = new FailingCsvLinesRowProcessor();
    await processAndVerifyError(
      JsonLinesStream.fromStream(readable, processor, {tabularFormat: true}),
      processor,
      'complete failed'
    );
  });
});
