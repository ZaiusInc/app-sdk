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
 * Used when patching data.
 * The previous value is provided as the first parameter. The current TTL is provided in the second parameter.
 * The return value will be used to update the record. Update the options object directly to make a change to the TTL.
 * WARNING: A patch updater may be called multiple times until the update is successful.
 */
type KVPatchUpdaterWithOptions = (previous: KVHash, options: KVRowOptions) => KVHash;

export type KVPatchUpdater = PatchUpdater<KVHash> | KVPatchUpdaterWithOptions;

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
  get(key: string, fields?: string[]): Promise<KVHash>;

  /**
   * Write an object to the store at a given key. Overwrites the entire object.
   * @async
   * @param key of the stored object
   * @param value complete hash to write
   * @param options optionally set a TTL for this row
   * @returns the previous value found at the key if successful. Otherwise throws an error.
   */
  put(key: string, value: KVHash, options?: KVRowOptions): Promise<KVHash>;

  /**
   * Write a set of fields to an object in the store at a given key. Does not overwrite the entire object.
   * @async
   * @param key of the stored object
   * @param value hash of fields and values to update the object with. Leaves all other fields untouched.
   * @returns the complete object from before the update
   * An empty object is returned if the object previously did not exist.
   */
  patch(key: string, value: KVHash): Promise<KVHash>;

  /**
   * Update a stored object using a callback to make changes
   * @async
   * @param key of the stored object
   * @param updater function to manipulate the existing object (may be called multiple times to ensure an atomic change)
   * @returns the complete object from before the update
   * An empty object is returned if the object previously did not exist.
   */
  // tslint:disable-next-line:unified-signatures
  patch(key: string, updater: KVPatchUpdater): Promise<KVHash>;

  /**
   * Delete an object or a single field from the store at a given key.
   * If fields is undefined, the entire object will be deleted.
   * @async
   * @param key of the stored object
   * @param fields to delete or undefined to delete all fields
   * @returns the deleted value if successful, or an empty object if it did not exist.
   */
  delete(key: string, fields?: string[]): Promise<KVHash>;
}
