import 'jest';
import {JsonLinesStream} from '../JsonLinesStream';
import * as nock from 'nock';
import {Stream} from 'stream';
import * as ObjectHash from 'object-hash';
import {FileRowProcessor} from '../FileStream';

interface Row {
  col1: string;
  col2: string;
  col3: string;
}

class TestJsonLinesRowProcessor implements FileRowProcessor<Row> {
  constructor(private completed = false, private readRows: Row[] = []) { }

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

describe('JsonLinesStream', () => {
  const processAndVerify = async (stream: JsonLinesStream<Row>, processor: TestJsonLinesRowProcessor) => {
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
    readable.push('["col1","col2","col3"]\n["val1","val2","val3"]\n');
    readable.push(null);

    const processor = new TestJsonLinesRowProcessor();
    await processAndVerify(
      JsonLinesStream.fromStream(readable, processor, {tabularFormat: true}),
      processor
    );
  });

  it('builds instances processes from a url', async () => {
    nock('https://zaius.app.sdk')
      .get('/csv')
      .reply(200, '["col1","col2","col3"]\n["val1","val2","val3"]\n');

    const processor = new TestJsonLinesRowProcessor();
    await processAndVerify(
      JsonLinesStream.fromUrl('https://zaius.app.sdk/csv', processor, {tabularFormat: true}),
      processor
    );
  });

  it('should pause and resume', async () => {
    const readable = new Stream.Readable();
    readable.push('["col1","col2","col3"]\n');
    readable.push('["val1","val2","val3"]\n');
    readable.push('["val4","val5","val6"]\n');
    readable.push('["val7","val8","val9"]\n');
    readable.push(null);

    const processor = new TestJsonLinesRowProcessor();
    const stream = JsonLinesStream.fromStream(readable, processor, {tabularFormat: true});
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
    readable.push('["col1","col2","col3"]\n');
    readable.push('["val1","val2","val3"]\n');
    readable.push('["val4","val5","val6"]\n');
    readable.push(null);

    const processor = new TestJsonLinesRowProcessor();
    const marker = ObjectHash.sha1({
      col1: 'val1',
      col2: 'val2',
      col3: 'val3'
    });

    const stream = JsonLinesStream.fromStream(readable, processor, {tabularFormat: true});
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
});
