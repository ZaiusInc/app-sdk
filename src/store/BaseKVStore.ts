// tslint:disable:unified-signatures

export type PrimitiveValue = string | number | boolean | null;
export type Value = PrimitiveValue | PrimitiveValue[] | {[key: string]: Value};
export interface ValueHash {
  [field: string]: Value;
}
export type PatchUpdater = (previous: ValueHash) => ValueHash;

/**
 * An interface all key-value stores implement
 */
export interface BaseKVStore {
  /**
   * Retrieve an object from the store given a key.
   * @async
   * @param key of the stored object
   * @param fields to retrieve from the stored object, or undefined to retrieve the full object
   * @returns hash of the complete object or only the specified fields, if supplied.
   * An empty object is returned if the object, or all specified fields, does not exist.
   */
  get(key: string, fields?: string[]): Promise<ValueHash>;

  /**
   * Write an object to the store at a given key. Overwrites the entire object.
   * @async
   * @param key of the stored object
   * @param value complete hash to write
   * @returns hash of all previous fields and values before the write.
   * An empty object is returned if the object previously did not exist.
   */
  put(key: string, value: ValueHash): Promise<true>;

  /**
   * Write a set of fields to an object in the store at a given key. Does not overwrite the entire object.
   * @async
   * @param key of the stored object
   * @param value hash of fields and values to update the object with. Leaves all other fields untouched.
   * @returns the complete object from before the update
   * An empty object is returned if the object previously did not exist.
   */
  patch(key: string, value: ValueHash): Promise<ValueHash>;

  /**
   * Update a stored object using a callback to make changes
   * @async
   * @param key of the stored object
   * @param updater function to manipulate the existing object (may be called multiple times to ensure an atomic change)
   * @returns the complete object from before the update
   * An empty object is returned if the object previously did not exist.
   */
  patch(key: string, updater: PatchUpdater): Promise<ValueHash>;

  /**
   * Delete an object or a single field from the store at a given key.
   * If fields is undefined, the entire object will be deleted.
   * @async
   * @param key of the stored object
   * @param fields to delete or undefined to delete all fields
   * @returns hash of all previous fields and values or only specified fields, if supplied, before the delete.
   * An empty object is returned if the object previously did not exist.
   */
  delete(key: string, fields?: string[]): Promise<true>;
}
