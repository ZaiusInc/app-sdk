import 'jest';
import {CsvRowProcessor, CsvStream} from '../CsvStream';
import * as nock from 'nock';
import {Stream} from 'stream';
import {Options} from 'csv-parser';

interface Row {
  col1: string;
  col2: string;
  col3: string;
}

class TestCsvRowProcessor implements CsvRowProcessor<Row> {
  constructor(private completed = false, private readRows: Row[] = []) { }

  public get isCompleted() {
    return this.completed;
  }

  public get rows() {
    return this.readRows;
  }

  public async process(row: Row): Promise<boolean> {
    this.rows.push(row);
    return false;
  }

  public async complete(): Promise<void> {
    this.completed = true;
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
      mapValues: ({ value }) => value.toLowerCase()
    };

    const processor = new TestCsvRowProcessor();
    await processAndVerify(
      CsvStream.fromStream(readable, processor, options),
      processor
    );
  });
});
