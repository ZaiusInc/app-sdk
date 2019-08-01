import {BaseKVStore} from './BaseKVStore';
import {LocalStore} from './LocalStore';

let settingsStore: BaseKVStore = new LocalStore();
let secretsStore: BaseKVStore = new LocalStore();
let kvStore: BaseKVStore = new LocalStore();

/**
 * @hidden
 */
export interface InitialStores {
  settings: BaseKVStore;
  secrets: BaseKVStore;
  kvStore: BaseKVStore;
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
