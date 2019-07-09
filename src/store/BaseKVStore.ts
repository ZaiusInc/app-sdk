export type PrimitiveValue = string | number | boolean;
export type Value = PrimitiveValue[] | null;
export interface ValueHash {
  [field: string]: Value | undefined;
}

/**
 * An interface all key-value stores implement
 */
export interface BaseKVStore {
  /**
   * Retrieve an object from the store given a key.
   * @async
   * @param key of the stored object
   * @param fields to retrieve from the stored object, or undefined to retrieve the full object
   * @returns the complete object or the object with a subset of fields.
   * An empty object is returned if the object (or all specified fields) does not exist.
   */
  get(key: string, fields?: string[]): Promise<ValueHash>;

  /**
   * Write an object to the store at a given key. Overwrites the entire object.
   * @async
   * @param key of the stored object
   * @param value hash to write or undefined to delete the value
   * @returns hash of the previous values before the write.
   * An empty object is returned if the object previously did not exist.
   */
  put(key: string, value: ValueHash | undefined): Promise<ValueHash>;

  /**
   * Write a set of fields to an object in the store at a given key. Does not overwrite the entire object.
   * @async
   * @param key of the stored object
   * @param fields to overwrite using values from the value hash
   * @param value hash to update the object with
   * @returns the previous value of the field before the write
   * An empty object is returned if the specified fields previously did not exist.
   */
  put(key: string, fields: string[], value: ValueHash): Promise<ValueHash>;

  /**
   * Delete an object or a single field from the store at a given key.
   * If fields is undefined, the entire object will be deleted.
   * @async
   * @param key of the stored object
   * @param fields to delete or undefined to delete all fields
   * @returns the previous value of the object or specified fields before the delete.
   * An empty object is returned if the object previously did not exist.
   */
  delete(key: string, fields?: string[]): Promise<ValueHash>;
}
