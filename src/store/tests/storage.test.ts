import 'jest';
import {BaseKVStore, initializeStores, LocalKVStore, storage} from '..';
import {LocalStore} from '../LocalStore';
import {resetLocalKvStore, resetLocalSecretsStore, resetLocalSettingsStore, resetLocalStores} from '../storage';

// @ts-ignore
class SampleStore implements BaseKVStore {
}

describe('storage', () => {
  it('provides local stores if not configured', () => {
    expect(storage.secrets).toBeInstanceOf(LocalStore);
    expect(storage.settings).toBeInstanceOf(LocalStore);
    expect(storage.kvStore).toBeInstanceOf(LocalKVStore);
  });

  describe('resetLocalStores', () => {
    it('resets local stores', async () => {
      await storage.secrets.put('foo', {foo: 'foo'});
      await storage.settings.put('foo', {foo: 'foo'});
      await storage.kvStore.put('foo', {foo: 'foo'});

      resetLocalStores();

      expect(await storage.secrets.get('foo')).toEqual({});
      expect(await storage.settings.get('foo')).toEqual({});
      expect(await storage.kvStore.get('foo')).toEqual({});
    });
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

    it('throws errors if you try to reset a non-local store', () => {
      expect(() => resetLocalSecretsStore()).toThrow();
      expect(() => resetLocalSettingsStore()).toThrow();
      expect(() => resetLocalKvStore()).toThrow();
    });
  });
});
