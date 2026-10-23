/* eslint-disable max-classes-per-file */
// Compile-time compatibility checks: ts-jest type-checks this file, so a type error fails the suite.
import {
  DataSyncItemFlags,
  Destination,
  DestinationBatch,
  DestinationDeliverResult,
  DestinationReadyResult
} from '../..';

interface MyItem {
  id: string;
  name: string;
}

abstract class RecordingDestination<T> extends Destination<T> {
  public delivered: T[] = [];

  public async ready(): Promise<DestinationReadyResult> {
    return {ready: true};
  }

  public async deliver(batch: DestinationBatch<T>): Promise<DestinationDeliverResult> {
    this.delivered.push(...batch.items);
    return {success: true};
  }
}

class MyItemDestination extends RecordingDestination<MyItem> {}

class AnyDestination extends Destination<any> {
  public async ready(): Promise<DestinationReadyResult> {
    return {ready: true};
  }

  public async deliver(batch: DestinationBatch<any>): Promise<DestinationDeliverResult> {
    return {success: batch.items.every((item) => item.id)};
  }
}

class DeletingDestination extends Destination<MyItem & DataSyncItemFlags> {
  public deleted: string[] = [];

  public async ready(): Promise<DestinationReadyResult> {
    return {ready: true};
  }

  public async deliver(batch: DestinationBatch<MyItem & DataSyncItemFlags>): Promise<DestinationDeliverResult> {
    this.deleted.push(...batch.items.filter((item) => item._isDeleted).map((item) => item.id));
    return {success: true};
  }
}

class DefaultDestination extends Destination {
  public locales: Array<string | undefined> = [];

  public async ready(): Promise<DestinationReadyResult> {
    return {ready: true};
  }

  public async deliver(batch: DestinationBatch): Promise<DestinationDeliverResult> {
    this.locales.push(...batch.items.map((item) => item._locale));
    return {success: true};
  }
}

const sync = {id: 'sync-1', name: 'Sync'};

describe('Destination type compatibility', () => {
  it('accepts a plain item type', async () => {
    const destination = new MyItemDestination();
    await destination.deliver({items: [{id: '1', name: 'one'}], attempt: 1, sync});
    expect(destination.delivered).toEqual([{id: '1', name: 'one'}]);
  });

  it('accepts a generic T passed through base classes', async () => {
    class GenericDestination<T extends {id: string}> extends RecordingDestination<T> {}
    const destination = new GenericDestination<MyItem>();
    await destination.deliver({items: [{id: '1', name: 'one'}], attempt: 1, sync});
    expect(destination.delivered).toEqual([{id: '1', name: 'one'}]);
  });

  it('accepts any', async () => {
    const result = await new AnyDestination().deliver({items: [{id: '1'}], attempt: 1, sync});
    expect(result.success).toBe(true);
  });

  it('accepts reserved fields', async () => {
    const destination = new DeletingDestination();
    await destination.deliver({
      items: [
        {id: '1', name: 'one', _isDeleted: true},
        {id: '2', name: 'two'}
      ],
      attempt: 1,
      sync
    });
    expect(destination.deleted).toEqual(['1']);
  });

  it('defaults to the reserved fields without a type argument', async () => {
    const destination = new DefaultDestination();
    await destination.deliver({items: [{_locale: 'en'}, {}], attempt: 1, sync});
    expect(destination.locales).toEqual(['en', undefined]);
  });
});
