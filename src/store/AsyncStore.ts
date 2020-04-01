import {CasError} from './CasError';

type PatchUpdater<T extends {}> = (previous: T, options: {ttl?: number}) => T;

interface CasEntry<T> {
  cas: number;
  expires?: number;
  value: T;
}

interface StoreEntry<T> {
  cas: number;
  ttl?: number;
  value: T;
}

/**
 * Simulates access to a remote data store by performing operations asynchronously
 */
export class AsyncStore<T extends {}> {
  private data: {[key: string]: CasEntry<T>} = {};

  /**
   * @param avgDelay Average delay per request in miliseconds
   */
  constructor(private avgDelay = 0) {}

  public async get<O extends T>(key: string): Promise<StoreEntry<O>> {
    return this.async(() => {
      const entry = this.data[key];
      const epoch = this.epoch();
      if (entry && !this.expired(entry.expires)) {
        return this.translateExpiresToTTL(entry, epoch);
      }
      return {cas: 0, value: {}};
    });
  }

  public async put<O extends T>(key: string, value: O, ttl?: number, cas?: number): Promise<O> {
    return this.async(() => {
      const entry = this.data[key];
      if (entry && !this.expired(entry.expires)) {
        if (this.check(entry.cas, cas)) {
          entry.cas++;
          const previous = entry.value;
          entry.value = this.copy(value);
          if (ttl != null) {
            entry.expires = this.epoch() + ttl;
          }
          return previous;
        } else {
          throw new CasError();
        }
      } else {
        this.data[key] = {
          cas: cas ?? 0,
          expires: ttl && this.epoch() + ttl,
          value: this.copy(value)
        };
        return {};
      }
    });
  }

  /**
   * Normal KV patch is not atomic without CAS and potentially retries. This implementation
   * is specifically for operations that are atomic on the data store side, such as mutating a list.
   * @param key to update
   * @param updater callback to perform atomic update
   */
  public async atomicPatch<O extends T>(key: string, updater: PatchUpdater<O>): Promise<O> {
    return this.async(() => {
      const entry = this.data[key];
      const epoch = this.epoch();
      if (entry && !this.expired(entry.expires)) {
        // Note: checking the CAS value is not required here because node is single threaded.
        // We can guarantee nothing has changed between now and when we set the value after calling the updater
        const options = {
          ttl: entry.expires ? entry.expires - epoch : undefined
        };
        entry.value = this.copy(updater(entry.value as O, options));
        entry.cas++;
        entry.expires = options.ttl == null ? undefined : (epoch + options.ttl!);
      } else {
        const options = {ttl: undefined};
        let value = {} as O;
        value = this.copy(updater(value as O, options));
        this.data[key] = {
          cas: 0,
          expires: options.ttl == null ? undefined : (epoch + options.ttl!),
          value: this.copy(value)
        };
      }
      return this.translateExpiresToTTL(this.data[key], epoch);
    });
  }

  public async delete<O extends T>(key: string): Promise<O> {
    return this.async(() => {
      let value: O | {} = {};
      if (this.data[key] && !this.expired(this.data[key].expires)) {
        value = this.data[key].value as O;
      }
      delete this.data[key];
      return value;
    });
  }

  public async exists(key: string): Promise<boolean> {
    return this.async(() => {
      const entry = this.data[key];
      return !!(entry && !this.expired(entry.expires));
    });
  }

  public reset() {
    this.data = {};
  }

  private expired(time?: number) {
    return time && time < this.epoch();
  }

  private check(cas: number, expected?: number) {
    return expected === undefined || cas === expected;
  }

  private async async<R>(operation: () => any): Promise<R> {
    return new Promise((resolve, reject) =>
      setTimeout(() => {
        try {
          resolve(operation());
        } catch (e) {
          reject(e);
        }
      }, this.avgDelay * (0.5 + Math.random()))
    );
  }

  private copy<O extends {}>(value: O): O {
    return JSON.parse(JSON.stringify(value));
  }

  private translateExpiresToTTL<O>(entry: CasEntry<O>, epoch: number): StoreEntry<O> {
    return {
      cas: entry.cas,
      value: this.copy(entry.value),
      ttl: entry.expires ? entry.expires - epoch : undefined
    };
  }

  private epoch() {
    return Math.floor(new Date().getTime() / 1000);
  }
}
