import {KeyValueStore, SecretStore} from '../Store';

export * from './Function';
export * from './Job';
export * from './lib';
export * from './Lifecycle';
export * from './Runtime';
export * from './types';

export const store = new KeyValueStore();
export const secrets = new SecretStore();
