import {BaseKVStore} from './BaseKVStore';
import {LocalStore} from './LocalStore';

export let settings: BaseKVStore = new LocalStore();
export let secrets: BaseKVStore = new LocalStore();
export let kvStore: BaseKVStore = new LocalStore();

export interface InitialStores {
  settings: BaseKVStore;
  secrets: BaseKVStore;
  kvStore: BaseKVStore;
}

export const initializeStores = (config: InitialStores) => {
  settings = config.settings;
  secrets = config.secrets;
  kvStore = config.kvStore;
};
