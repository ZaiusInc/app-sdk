/* eslint-disable max-classes-per-file */
// Compile-time compatibility checks: ts-jest type-checks this file, so a type error fails the suite.
import {DataSyncItemFlags, Source, SourceData, SourceResponse, sources, initializeSourceApi} from '..';
import {SourceApi} from '../sources';

interface Product {
  id: string;
  price: number;
}

class RecordingSource implements Source {
  public emitted: Array<SourceData<object>> = [];

  public async emit<T extends object>(data: SourceData<T>): Promise<SourceResponse> {
    this.emitted.push(data);
    return {success: true};
  }
}

abstract class BaseEmitter<T extends object> {
  public constructor(protected source: Source) {}

  public emitItem(item: T): Promise<SourceResponse> {
    return this.source.emit<T>({data: item});
  }

  public emitToNamedSource(item: T): Promise<SourceResponse> {
    return sources.emit<T>('products', {data: item});
  }
}

class ProductEmitter extends BaseEmitter<Product> {}

describe('SourceData type compatibility', () => {
  let source: RecordingSource;

  beforeEach(() => {
    source = new RecordingSource();
    initializeSourceApi({emit: jest.fn(), emitToSource: jest.fn().mockResolvedValue({success: true})} as SourceApi);
  });

  it('accepts plain data types with no reserved fields', async () => {
    const product: Product = {id: 'p1', price: 10};
    await source.emit({data: product});
    await source.emit<Product>({data: product});
    await sources.emit('products', {data: product});
    await sources.emit<Product>('products', {data: product});
    expect(source.emitted).toEqual([{data: product}, {data: product}]);
  });

  it('accepts a generic T passed through base classes', async () => {
    const emitter = new ProductEmitter(source);
    await emitter.emitItem({id: 'p1', price: 10});
    await emitter.emitToNamedSource({id: 'p1', price: 10});
    expect(source.emitted).toEqual([{data: {id: 'p1', price: 10}}]);
  });

  it('accepts reserved fields', async () => {
    const data: SourceData<Product & DataSyncItemFlags> = {
      data: {id: 'p1', price: 10, _isDeleted: true, _locale: 'en'}
    };
    const defaulted: SourceData = {data: {_isDeleted: true}};
    await source.emit(data);
    await source.emit(defaulted);
    await sources.emit('products', {data: {id: 'p1', _locale: 'de'}});
    expect(source.emitted).toEqual([data, defaulted]);
  });
});
