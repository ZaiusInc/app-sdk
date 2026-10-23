/* eslint-disable max-classes-per-file */
// Compile-time compatibility checks: ts-jest type-checks this file, so a type error fails the suite.
import {DataSyncItemFlags, Source, SourceData, SourceResponse} from '..';

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
}

class ProductEmitter extends BaseEmitter<Product> {}

describe('SourceData type compatibility', () => {
  let source: RecordingSource;

  beforeEach(() => {
    source = new RecordingSource();
  });

  it('accepts plain data types with no reserved fields', async () => {
    const product: Product = {id: 'p1', price: 10};
    await source.emit({data: product});
    await source.emit<Product>({data: product});
    expect(source.emitted).toEqual([{data: product}, {data: product}]);
  });

  it('accepts a generic T passed through base classes', async () => {
    await new ProductEmitter(source).emitItem({id: 'p1', price: 10});
    expect(source.emitted).toEqual([{data: {id: 'p1', price: 10}}]);
  });

  it('accepts reserved fields', async () => {
    const data: SourceData<Product & DataSyncItemFlags> = {data: {id: 'p1', price: 10, _isDeleted: true}};
    const defaulted: SourceData = {data: {_isDeleted: true}};
    await source.emit(data);
    await source.emit(defaulted);
    expect(source.emitted).toEqual([data, defaulted]);
  });

  it('accepts the deprecated isDelete flag', async () => {
    const data: SourceData<Product> = {data: {id: 'p1', price: 10}, isDelete: true};
    await source.emit(data);
    expect(source.emitted).toEqual([data]);
  });
});
