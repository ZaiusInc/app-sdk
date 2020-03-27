import 'jest';
import {AsyncStore} from '../AsyncStore';
import {CasError} from '../CasError';

/**
 * Mostly exercised through LocalKVStore tests, but here we test some of the nuances we skipped over
 */
describe('AsyncStore', () => {
  let store: AsyncStore<any>;
  beforeEach(async () => {
    jest.spyOn(AsyncStore.prototype, 'epoch' as any).mockReturnValue(1585273000);
    store = new AsyncStore();
    await store.put('foo', {bar: 'bar'}, 500, 1);
  });

  describe('get', () => {
    it('retrives existing values and metadata', async () => {
      expect(await store.get('foo')).toEqual({
        cas: 1,
        ttl: 500,
        value: {
          bar: 'bar'
        }
      });
    });

    it('returns {} for expired values', async () => {
      jest.spyOn(AsyncStore.prototype, 'epoch' as any).mockReturnValue(1585273500);

      expect(await store.get('foo')).toEqual({
        cas: 1,
        ttl: 0,
        value: {
          bar: 'bar'
        }
      });

      jest.spyOn(AsyncStore.prototype, 'epoch' as any).mockReturnValue(1585273501);

      expect(await store.get('foo')).toEqual({
        cas: 0,
        value: {}
      });
    });
  });

  describe('put', () => {
    it('writes new values', async () => {
      await store.put('bar', {bar: 'bar'});
      expect(await store.get('bar')).toEqual({
        cas: 0,
        value: {
          bar: 'bar'
        }
      });

      await store.put('baz', {baz: 'baz'}, 600, 3);
      expect(await store.get('baz')).toEqual({
        cas: 3,
        ttl: 600,
        value: {
          baz: 'baz'
        }
      });
    });

    it('overwrites values if the cas matches or is not provided', async () => {
      await store.put('foo', {foo: 'foo'}, 600);
      expect(await store.get('foo')).toEqual({
        cas: 2,
        ttl: 600,
        value: {
          foo: 'foo'
        }
      });

      await store.put('foo', {foo: 'bar'}, undefined, 2);
      expect(await store.get('foo')).toEqual({
        cas: 3,
        ttl: 600,
        value: {
          foo: 'bar'
        }
      });
    });

    it('does not overwrite values if the cas does not match', async () => {
      await expect(store.put('foo', {foo: 'bar'}, undefined, 2)).rejects.toThrow(CasError);
      expect(await store.get('foo')).toEqual({
        cas: 1,
        ttl: 500,
        value: {
          bar: 'bar'
        }
      });
    });
  });

  describe('atomicPatch', () => {
    it('updates a value in place', async () => {
      expect(await store.atomicPatch('foo', (prev, options) => {
        options.ttl = 1000;
        return {
          ...prev,
          foo: 'foo'
        };
      })).toEqual({
        cas: 2,
        ttl: 1000,
        value: {
          foo: 'foo',
          bar: 'bar'
        }
      });
    });

    it('overwrites an expired value', async () => {
      jest.spyOn(AsyncStore.prototype, 'epoch' as any).mockReturnValue(1585273501);
      expect(await store.atomicPatch('foo', (prev, options) => {
        expect(options).toEqual({});
        expect(prev).toEqual({});
        return {
          ...prev,
          foo: 'foo'
        };
      })).toEqual({
        cas: 0,
        value: {
          foo: 'foo',
        }
      });
    });
  });

  describe('delete', () => {
    it('deletes a value', async () => {
      expect(await store.delete('foo')).toEqual({bar: 'bar'});
      expect(await store.get('foo')).toEqual({
        cas: 0,
        value: {}
      });
    });
  });

  describe('exists', () => {
    it('checks if a value exists', async () => {
      expect(await store.exists('foo')).toBeTruthy();
      expect(await store.exists('bar')).toBeFalsy();
      jest.spyOn(AsyncStore.prototype, 'epoch' as any).mockReturnValue(1585273501);
      expect(await store.exists('foo')).toBeFalsy();
    });
  });
});
