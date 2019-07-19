import 'jest';
import {BaseKVStore, initializeStores, storage} from '../store';
import {LocalStore} from './LocalStore';

// @ts-ignore
class SampleStore implements BaseKVStore {
}

describe('storage', () => {
  it('provides local stores if not configured', () => {
    expect(storage.secrets).toBeInstanceOf(LocalStore);
    expect(storage.settings).toBeInstanceOf(LocalStore);
    expect(storage.kvStore).toBeInstanceOf(LocalStore);
  });

  describe('initializeStores', () => {
    it('replaces the local stores with the provided stores', () => {
      initializeStores({
        // @ts-ignore
        secrets: new SampleStore(),
        // @ts-ignore
        settings: new SampleStore(),
        // @ts-ignore
        kvStore: new SampleStore()
      });

      expect(storage.secrets).toBeInstanceOf(SampleStore);
      expect(storage.settings).toBeInstanceOf(SampleStore);
      expect(storage.kvStore).toBeInstanceOf(SampleStore);
    });
  });
});
