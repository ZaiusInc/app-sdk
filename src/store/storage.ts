import {BaseKVStore} from './BaseKVStore';
import {LocalStore} from './LocalStore';

let settingsStore: BaseKVStore = new LocalStore();
let secretsStore: BaseKVStore = new LocalStore();
let kvStore: BaseKVStore = new LocalStore();

export interface InitialStores {
  settings: BaseKVStore;
  secrets: BaseKVStore;
  kvStore: BaseKVStore;
}

export const initializeStores = (config: InitialStores) => {
  settingsStore = config.settings;
  secretsStore = config.secrets;
  kvStore = config.kvStore;
};

export const storage = {
  get settings() {
    return settingsStore;
  },
  get secrets() {
    return secretsStore;
  },
  get kvStore() {
    return kvStore;
  }
};
