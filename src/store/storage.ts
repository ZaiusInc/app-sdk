import {BaseKVStore} from './BaseKVStore';
import {KVStore} from './KVStore';
import {LocalAsyncStoreBackend} from './LocalAsyncStoreBackend';
import {LocalKVStore} from './LocalKVStore';
import {LocalStore} from './LocalStore';

const localSettingsStore: BaseKVStore = new LocalStore(new LocalAsyncStoreBackend());
const localSecretsStore: BaseKVStore = new LocalStore(new LocalAsyncStoreBackend());
const localKvStore: KVStore = new LocalKVStore(new LocalAsyncStoreBackend());
const localSharedKvStore: KVStore = new LocalKVStore(new LocalAsyncStoreBackend());

/**
 * @hidden
 */
export interface InitialStores {
  settings: BaseKVStore;
  secrets: BaseKVStore;
  kvStore: KVStore;
  sharedKvStore: KVStore;
}

/**
 * Namespace for accessing storage apis
 */
export const storage = {
  /**
   * The settings store
   */
  get settings() {
    return global.ocpRuntime?.settingsStore || localSettingsStore;
  },
  /**
   * The secrets store
   */
  get secrets() {
    return global.ocpRuntime?.secretsStore || localSecretsStore;
  },
  /**
   * The key-value store
   */
  get kvStore() {
    return global.ocpRuntime?.kvStore || localKvStore;
  },
  /**
   * The shared key-value store
   */
  get sharedKvStore() {
    return global.ocpRuntime?.sharedKvStore || localSharedKvStore;
  }
};
