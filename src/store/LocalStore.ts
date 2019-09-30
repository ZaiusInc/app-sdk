import {BaseKVStore, PatchUpdater, ValueHash} from './BaseKVStore';

/**
 * A stub of the key value store
 *
 * @TODO implement the stub for local development purposes
 */
export class LocalStore implements BaseKVStore<ValueHash, true> {
  public get<T extends ValueHash>(_key: string, _fields?: string[]): Promise<T> {
    throw new Error('Method not implemented.');
  }

  public put(_key: string, _value?: ValueHash): Promise<true> {
    throw new Error('Method not implemented.');
  }

  public patch<T extends ValueHash>(_key: string, _value?: ValueHash | PatchUpdater): Promise<T> {
    throw new Error('Method not implemented.');
  }

  public delete(_key: string, _fields?: string[]): Promise<true> {
    throw new Error('Method not implemented.');
  }

  public exists(_key: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}
