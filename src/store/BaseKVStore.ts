// tslint:disable:unified-signatures

/**
 * A value type that is safe to write to any storage option
 */
export type Value = string | number | boolean | null | ValueHash;

/**
 * An object with some restrictions. An interface that follows the ValueHash interface
 * can be safely written to any storage option.
 */
export interface ValueHash {
  [field: string]: Value | Value[] | undefined;
}

/**
 * Used when patching data.
 * The previous value is provided as the first parameter.
 * The return value will be used to update the record.
 * WARNING: A patch updater may be called multiple times until the update is successful.
 */
export type PatchUpdater<T = ValueHash> = (previous: T) => T;

/**
 * The base interface all key-value stores implement
 */
export interface BaseKVStore<T = ValueHash, R = true> {
  /**
   * Retrieve an object from the store given a key.
   * @async
   * @param key of the stored object
   * @param fields to retrieve from the stored object, or undefined to retrieve the full object
   * @returns hash of the complete object or only the specified fields, if supplied.
   * An empty object is returned if the object, or all specified fields, does not exist.
   */
  get(key: string, fields?: string[]): Promise<T>;

  /**
   * Write an object to the store at a given key. Overwrites the entire object.
   * @async
   * @param key of the stored object
   * @param value complete hash to write
   * @returns true if successful. Otherwise throws an error.
   */
  put(key: string, value: T): Promise<R>;

  /**
   * Write a set of fields to an object in the store at a given key. Does not overwrite the entire object.
   * @async
   * @param key of the stored object
   * @param value hash of fields and values to update the object with. Leaves all other fields untouched.
   * @returns the complete object from before the update
   * An empty object is returned if the object previously did not exist.
   */
  patch(key: string, value: T): Promise<T>;

  /**
   * Update a stored object using a callback to make changes.
   * @async
   * @param key of the stored object
   * @param updater function to manipulate the existing object (may be called multiple times to ensure an atomic change)
   * @returns the complete object from before the update
   * An empty object is returned if the object previously did not exist.
   */
  patch(key: string, updater: PatchUpdater<T>): Promise<T>;

  /**
   * Delete an object or a single field from the store at a given key.
   * If fields is undefined, the entire object will be deleted.
   * @async
   * @param key of the stored object
   * @param fields to delete or undefined to delete all fields
   * @returns true if successful. Otherwise throws an error.
   */
  delete(key: string, fields?: string[]): Promise<R>;

  /**
   * Check if an object exists at a given key.
   * @async
   * @param key of the stored object
   * @returns true if the object exists
   */
  exists(key: string): Promise<boolean>;
}
