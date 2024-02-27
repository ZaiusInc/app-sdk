import 'jest';
import {BaseKVStore, LocalKVStore, storage} from '..';
import {LocalStore} from '../LocalStore';
import {AsyncLocalStorage} from 'async_hooks';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
class SampleStore implements BaseKVStore {
}

describe('storage', () => {
  it('provides local stores if not configured', () => {
    expect(storage.secrets).toBeInstanceOf(LocalStore);
    expect(storage.settings).toBeInstanceOf(LocalStore);
    expect(storage.kvStore).toBeInstanceOf(LocalKVStore);
    expect(storage.sharedKvStore).toBeInstanceOf(LocalKVStore);
  });

  describe('stores configuration', () => {
    it('uses stores provided in OCP runtime global variable', () => {
      global.ocpContextStorage = new AsyncLocalStorage();
      global.ocpContextStorage.enterWith({
        ocpRuntime: {
          appContext: {} as any,
          functionApi: {} as any,
          jobApi: {} as any,
          logContext: {} as any,
          logLevel: {} as any,
          notifier: {} as any,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          secretsStore: new SampleStore(),
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          settingsStore: new SampleStore(),
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          kvStore: new SampleStore(),
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          sharedKvStore: new SampleStore()
        }
      });

      expect(storage.secrets).toBeInstanceOf(SampleStore);
      expect(storage.settings).toBeInstanceOf(SampleStore);
      expect(storage.kvStore).toBeInstanceOf(SampleStore);
      expect(storage.sharedKvStore).toBeInstanceOf(SampleStore);
    });
  });
});
