import {BaseKVStore, PatchUpdater, ValueHash} from './BaseKVStore';

/**
 * A stub of the key value store
 *
 * @TODO impelement the stub for local development purposes
 */
export class LocalStore implements BaseKVStore {
  public get(_key: string, _fields?: string[]): Promise<ValueHash> {
    throw new Error('Method not implemented.');
  }

  public put(_key: string, _value?: ValueHash): Promise<true> {
    throw new Error('Method not implemented.');
  }

  public patch(_key: string, _value?: ValueHash | PatchUpdater): Promise<ValueHash> {
    throw new Error('Method not implemented.');
  }

  public delete(_key: string, _fields?: string[]): Promise<true> {
    throw new Error('Method not implemented.');
  }
}
