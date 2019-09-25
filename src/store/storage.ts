import {BaseKVStore} from './BaseKVStore';
import {KVStore} from './KVStore';
import {LocalKVStore} from './LocalKVStore';
import {LocalStore} from './LocalStore';

let settingsStore: BaseKVStore = new LocalStore();
let secretsStore: BaseKVStore = new LocalStore();
let kvStore: KVStore = new LocalKVStore();

/**
 * @hidden
 */
export interface InitialStores {
  settings: BaseKVStore;
  secrets: BaseKVStore;
  kvStore: KVStore;
}

/**
 * @hidden
 */
export const initializeStores = (config: InitialStores) => {
  settingsStore = config.settings;
  secretsStore = config.secrets;
  kvStore = config.kvStore;
};

/**
 * Namespace for accessing storage apis
 */
export const storage = {
  /**
   * The settings store
   */
  get settings() {
    return settingsStore;
  },
  /**
   * The secrets store
   */
  get secrets() {
    return secretsStore;
  },
  /**
   * The key-value store
   */
  get kvStore() {
    return kvStore;
  }
};
