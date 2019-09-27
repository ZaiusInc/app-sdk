import {KVHash, KVPatchUpdater, KVRowOptions, KVStore} from './KVStore';

/**
 * A stub of the key value store
 *
 * @TODO implement the stub for local development purposes
 */
export class LocalKVStore implements KVStore {
  public get(_key: string, _fields?: string[]): Promise<KVHash> {
    throw new Error('Method not implemented.');
  }

  public put(_key: string, _value?: KVHash, _options?: KVRowOptions): Promise<KVHash> {
    throw new Error('Method not implemented.');
  }

  public patch(_key: string, _value?: KVHash | KVPatchUpdater, _options?: KVRowOptions): Promise<KVHash> {
    throw new Error('Method not implemented.');
  }

  public delete(_key: string, _fields?: string[]): Promise<KVHash> {
    throw new Error('Method not implemented.');
  }

  public exists(_key: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public increment(_key: string, _field: string, _amount?: number): Promise<number> {
    throw new Error('Method not implemented.');
  }

  public incrementMulti(_key: string, _fieldAmounts: {[field: string]: number}): Promise<{[field: string]: number}> {
    throw new Error('Method not implemented.');
  }
}
