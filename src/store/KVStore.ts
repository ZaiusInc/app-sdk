import {BaseKVStore, PatchUpdater, Value} from './BaseKVStore';
import {NumberSet} from './NumberSet';
import {StringSet} from './StringSet';

/**
 * A value type that is safe to write to the key-value storage
 */
export declare type KVValue = Value | NumberSet | StringSet;

/**
 * An object with some restrictions. An interface that follows the KVHash interface
 * can be safely written to the key-value storage.
 */
export interface KVHash {
  [field: string]: KVValue | KVValue[] | undefined;
}

/**
 * A hash of fields to values of a specific type. Used in the key-value store's "multi" accessors.
 */
export interface MultiValue<T> {
  [field: string]: T;
}

/**
 * Used when patching data.
 * The previous value is provided as the first parameter. The current TTL is provided in the second parameter.
 * The return value will be used to update the record. Update the options object directly to make a change to the TTL.
 * WARNING: A patch updater may be called multiple times until the update is successful.
 */
type KVPatchUpdaterWithOptions<T extends KVHash> = (previous: T, options: KVRowOptions) => T;

export type KVPatchUpdater<T extends KVHash> = PatchUpdater<T> | KVPatchUpdaterWithOptions<T>;

/**
 * Options for writing a row to key-value storage.
 */
export interface KVRowOptions {
  /**
   * The number of seconds until the row should expire.
   * Set to undefined for no TTL.
   */
  ttl?: number;
}

export interface KVStore extends BaseKVStore<KVHash, KVHash> {
  /**
   * Retrieve an object from the store given a key.
   * @async
   * @param key of the stored object
   * @param fields to retrieve from the stored object, or undefined to retrieve the full object
   * @returns hash of the complete object or only the specified fields, if supplied.
   * An empty object is returned if the object, or all specified fields, does not exist.
   */
  get<T extends KVHash>(key: string, fields?: string[]): Promise<T>;

  /**
   * Write an object to the store at a given key. Overwrites the entire object.
   * @async
   * @param key of the stored object
   * @param value complete hash to write
   * @param options optionally set a TTL for this row
   * @returns the previous value found at the key if successful. Otherwise throws an error.
   */
  put<T extends KVHash>(key: string, value: T, options?: KVRowOptions): Promise<T>;

  /**
   * Write a set of fields to an object in the store at a given key. Does not overwrite the entire object.
   * @async
   * @param key of the stored object
   * @param value hash of fields and values to update the object with. Leaves all other fields untouched.
   * @returns the complete object from before the update
   * An empty object is returned if the object previously did not exist.
   */
  patch<T extends KVHash>(key: string, value: T): Promise<T>;

  /**
   * Update a stored object using a callback to make changes.
   * @async
   * @param key of the stored object
   * @param updater function to manipulate the existing object (may be called multiple times to ensure an atomic change)
   * @returns the complete object from before the update
   * An empty object is returned if the object previously did not exist.
   */
  // tslint:disable-next-line:unified-signatures
  patch<T extends KVHash>(key: string, updater: KVPatchUpdater<T>): Promise<T>;

  /**
   * Delete an object or a single field from the store at a given key.
   * If fields is undefined, the entire object will be deleted.
   * @async
   * @param key of the stored object
   * @param fields to delete or undefined to delete all fields
   * @returns the deleted value if successful, or an empty object if it did not exist.
   */
  delete<T extends KVHash>(key: string, fields?: string[]): Promise<T>;

  /**
   * Check if an object exists at a given key.
   * @async
   * @param key of the stored object
   * @returns true if the object exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Atomically increment the value of a numeric field. If the object or field did not previously exist, the resulting
   * field will be set to the given amount. If the field does already exist but is not a number, this will result in
   * an error.
   * @async
   * @param key of the stored object
   * @param field to increment
   * @param amount by which to increment (can be negative, defaults to 1)
   * @returns the value of the field after incrementing
   */
  increment(key: string, field: string, amount?: number): Promise<number>;

  /**
   * Atomically increment the values of multiple numeric fields. If the object or fields did not previously exist, the
   * resulting fields will be set to their respective given amount. If any of the fields does already exist but is not a
   * number, this will result in an error.
   * @async
   * @param key of the stored object
   * @param fieldAmounts hash of fields to amounts by which to increment (can be negative)
   * @returns hash of fields to values after incrementing
   */
  incrementMulti(key: string, fieldAmounts: MultiValue<number>): Promise<MultiValue<number>>;

  /**
   * Atomically retrieve and remove the *first* element from a list. If the object or field does not exist or is empty,
   * the result will be `undefined`. Calling this method on a non-existent object will not cause it to be created. If
   * the field exists but is not a list, this will result in an error.
   * @async
   * @param key of the stored object
   * @param field that holds the list
   * @returns the first element of the list, if available, otherwise `undefined`
   */
  shift<T extends Value>(key: string, field: string): Promise<T | undefined>;

  /**
   * Atomically retrieve and remove *up to* the given number of elements from the *front* of the given lists. If the
   * object or fields do not exist or are empty, the result of each missing field will be an empty array. Calling this
   * method on a non-existent object will not cause it to be created. If any field exists but is not a list, this will
   * result in an error.
   * @async
   * @param key of the stored object
   * @param fieldCounts hash of fields to number of elements to retrieve and remove
   * @returns hash of fields to array of list elements
   */
  shiftMulti<T extends Value>(key: string, fieldCounts: MultiValue<number>): Promise<MultiValue<T[]>>;

  /**
   * Atomically insert an element at the *front* of a list. If the object or field does not exist, it will be created
   * with a list consisting of the given element. If the field exists but is not a list, this will result in an error.
   * @async
   * @param key of the stored object
   * @param field that holds the list
   * @param value to insert
   */
  unshift<T extends Value>(key: string, field: string, value: T): Promise<void>;

  /**
   * Atomically insert the given arrays of elements at the *front* of the given lists. If the object or fields do not
   * exist, they will be created from the given arrays. If any field exists but is not a list, this will result in an
   * error.
   * @async
   * @param key of the stored object
   * @param fieldValues hash of fields to array of values to insert
   */
  unshiftMulti<T extends Value>(key: string, fieldValues: MultiValue<T[]>): Promise<void>;

  /**
   * Retrieve (without removing) the first element from a list. If the object or field does not exist, is empty, or is
   * not a list, the result will be `undefined`.
   * @async
   * @param key of the stored object
   * @param field that holds the list
   * @returns the first element of the list, if available, otherwise `undefined`
   */
  peek<T extends Value>(key: string, field: string): Promise<T | undefined>;

  /**
   * Retrieve (without removing) *up to* the given number of elements from the *front* of the given lists. If the object
   * or fields do not exist, are empty, or are not lists, the result of each missing field will be an empty array.
   * @async
   * @param key of the stored object
   * @param fieldCounts hash of fields to number of elements to retrieve
   * @returns hash of fields to array of list elements
   */
  peekMulti<T extends Value>(key: string, fieldCounts: MultiValue<number>): Promise<MultiValue<T[]>>;

  /**
   * Atomically append an element to the *end* of a list. If the object or field does not exist, it will be created
   * with a list consisting of the given element. If the field exists but is not a list, this will result in an error.
   * @async
   * @param key of the stored object
   * @param field that holds the list
   * @param value to append
   */
  append<T extends Value>(key: string, field: string, value: T): Promise<void>;

  /**
   * Atomically append the given arrays of elements to the *end* of the given lists. If the object or fields do not
   * exist, they will be created from the given arrays. If any field exists but is not a list, this will result in an
   * error.
   * @async
   * @param key of the stored object
   * @param fieldValues hash of fields to array of values to append
   */
  appendMulti<T extends Value>(key: string, fieldValues: MultiValue<T[]>): Promise<void>;
}
