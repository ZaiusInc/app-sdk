import {Value} from './BaseKVStore';
import {KVHash, KVPatchUpdater, KVRowOptions, KVStore, MultiValue} from './KVStore';

/**
 * A stub of the key value store
 *
 * @TODO implement the stub for local development purposes
 */
export class LocalKVStore implements KVStore {
  public get<T extends KVHash>(_key: string, _fields?: string[]): Promise<T> {
    throw new Error('Method not implemented.');
  }

  public put<T extends KVHash>(_key: string, _value?: KVHash, _options?: KVRowOptions): Promise<T> {
    throw new Error('Method not implemented.');
  }

  public patch<T extends KVHash>(
    _key: string, _value?: T | KVPatchUpdater<T>, _options?: KVRowOptions
  ): Promise<T> {
    throw new Error('Method not implemented.');
  }

  public delete<T extends KVHash>(_key: string, _fields?: string[]): Promise<T> {
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

  public shift<T extends Value>(_key: string, _field: string): Promise<T | undefined> {
    throw new Error('Method not implemented.');
  }

  public shiftMulti<T extends Value>(_key: string, _fieldCounts: MultiValue<number>): Promise<MultiValue<T[]>> {
    throw new Error('Method not implemented.');
  }

  public unshift<T extends Value>(_key: string, _field: string, _value: T): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public unshiftMulti<T extends Value>(_key: string, _fieldValues: MultiValue<T[]>): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public peek<T extends Value>(_key: string, _field: string): Promise<T | undefined> {
    throw new Error('Method not implemented.');
  }

  public peekMulti<T extends Value>(_key: string, _fieldCounts: MultiValue<number>): Promise<MultiValue<T[]>> {
    throw new Error('Method not implemented.');
  }

  public append<T extends Value>(_key: string, _field: string, _value: T): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public appendMulti<T extends Value>(_key: string, _fieldValues: MultiValue<T[]>): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
