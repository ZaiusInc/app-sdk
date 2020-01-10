import {logger} from '../logging';
import {Value} from './BaseKVStore';
import {KVHash, KVPatchUpdater, KVRowOptions, KVStore, MultiValue} from './KVStore';
import {NumberSet} from './NumberSet';
import {StringSet} from './StringSet';

let kvStoreData: {[key: string]: any} = {};

export function resetLocalKVStore() {
  kvStoreData = {};
}

function filterFields(result: any, fields?: string[]) {
  if (fields && fields.length > 0) {
    const filtered: any = {};
    fields.forEach((f) => filtered[f] = result[f]);
    return filtered;
  }
  return result;
}

/**
 * @hidden
 * A stub of the key value store
 *
 * @TODO implement the stub for local development purposes
 */
export class LocalKVStore implements KVStore {
  public async get<T extends KVHash>(key: string, fields?: string[]): Promise<T> {
    const result = kvStoreData[key] || {};
    return filterFields(result, fields);
  }

  public async put<T extends KVHash>(key: string, value: T, options?: KVRowOptions): Promise<T> {
    if (options?.ttl) {
      logger.debug('ttl will be ignored in local KV store');
    }
    return (kvStoreData[key] = value) || {};
  }

  public async patch<T extends KVHash>(
    key: string, value: T | KVPatchUpdater<T>, options?: KVRowOptions
  ): Promise<T> {
    if (options?.ttl) {
      logger.debug('ttl will be ignored in local KV store');
    }
    if (typeof value === 'function') {
      return (kvStoreData[key] = value(kvStoreData[key], options || {})) || {};
    } else {
      return (kvStoreData[key] = Object.assign({}, kvStoreData[key], value));
    }
  }

  public async delete<T extends KVHash>(key: string, fields?: string[]): Promise<T> {
    if (fields) {
      const value = kvStoreData[key] || {};
      fields.forEach((f) => delete value[f]);
      kvStoreData[key] = value;
    } else {
      delete kvStoreData[key];
    }
    return kvStoreData[key] || {};
  }

  public async exists(key: string): Promise<boolean> {
    return Object.keys(kvStoreData).includes(key) && Object.keys(kvStoreData[key]).length > 0;
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

  public addNumber(_key: string, _field: string, _value: number): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public addNumberMulti(_key: string, _fieldValues: MultiValue<number[]>): Promise<MultiValue<NumberSet>> {
    throw new Error('Method not implemented.');
  }

  public removeNumber(_key: string, _field: string, _value: number): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public removeNumberMulti(_key: string, _fieldValues: MultiValue<number[]>): Promise<MultiValue<NumberSet>> {
    throw new Error('Method not implemented.');
  }

  public hasNumber(_key: string, _field: string, _value: number): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public hasNumberMulti(_key: string, _fieldValues: MultiValue<number[]>): Promise<MultiValue<NumberSet>> {
    throw new Error('Method not implemented.');
  }

  public addString(_key: string, _field: string, _value: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public addStringMulti(_key: string, _fieldValues: MultiValue<string[]>): Promise<MultiValue<StringSet>> {
    throw new Error('Method not implemented.');
  }

  public removeString(_key: string, _field: string, _value: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public removeStringMulti(_key: string, _fieldValues: MultiValue<string[]>): Promise<MultiValue<StringSet>> {
    throw new Error('Method not implemented.');
  }

  public hasString(_key: string, _field: string, _value: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  public hasStringMulti(_key: string, _fieldValues: MultiValue<string[]>): Promise<MultiValue<StringSet>> {
    throw new Error('Method not implemented.');
  }
}
