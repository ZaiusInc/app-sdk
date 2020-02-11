import {BaseKVStore, PatchUpdater, Value, ValueHash} from './BaseKVStore';

/**
 * @hidden
 * A stub of the key value store
 *
 * @TODO implement the stub for local development purposes
 */
export class LocalStore implements BaseKVStore<ValueHash, true> {
  private data: {[key: string]: ValueHash} = {};

  public reset() {
    this.data = {};
  }

  public async get<T extends ValueHash>(key: string, fields?: string[]): Promise<T> {
    return this.filter(this.data[key] || {}, fields) as T;
  }

  public async put(key: string, value?: ValueHash): Promise<true> {
    if (value) {
      this.data[key] = this.copy(value);
    } else {
      delete this.data[key];
    }
    return true;
  }

  public async patch<T extends ValueHash>(key: string, value?: ValueHash | PatchUpdater): Promise<T> {
    const original = this.copy(this.data[key] || {});
    if (typeof value === 'function') {
      this.data[key] = this.copy(value(this.copy(this.data[key] || {})));
    } else {
      this.data[key] = Object.assign(this.data[key] || {}, this.copy(value));
    }
    return original;
  }

  public async delete(key: string, fields?: string[]): Promise<true> {
    if (fields) {
      if (this.data[key]) {
        fields.forEach((f) => delete this.data[key][f]);
      }
    } else {
      delete this.data[key];
    }
    return true;
  }

  public async exists(key: string): Promise<boolean> {
    return Object.keys(this.data).includes(key);
  }

  private copy(value?: Value) {
    if (value === undefined) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(value));
  }

  private filter(result: ValueHash, fields?: string[]) {
    if (fields) {
      const copy: ValueHash = {};
      fields.forEach((f) => copy[f] = result[f]);
      return copy;
    }
    return this.copy(result);
  }
}
