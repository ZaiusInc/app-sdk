import * as Ajv from 'ajv';
import 'jest';
import * as jsYaml from 'js-yaml';
import * as mockFs from 'mock-fs';
import {Runtime} from './Runtime';
import {ZapManifest} from './types';
import deepFreeze = require('deep-freeze');

jest.mock('js-yaml');

const manifest = deepFreeze({
  meta: {
    app_id: 'appid',
    display_name: 'Display Name',
    version: '1.0.0',
    vendor: 'Zaius',
    support_url: '',
    summary: '',
    contact_email: '',
  },
  runtime: 'node11',
  functions: {
    foo: {
      method: 'GET',
      entry_point: 'Foo',
      description: 'gets foo'
    }
  }
} as ZapManifest);

describe('Runtime', () => {
  beforeAll(() => {
    mockFs({
      '/tmp/foo/': {
        'zap.yml': JSON.stringify(manifest)
      }
    });
  });

  afterAll(() => {
    mockFs.restore();
  });

  describe('initialize', () => {
    it('loads and validates the manifest', async () => {
      const yamlLoadFn = jest.spyOn(jsYaml, 'safeLoad').mockImplementation((data) => JSON.parse(data));
      const validateFn = jest.spyOn(Ajv.prototype, 'validate').mockReturnValue(true);

      const runtime = await Runtime.initialize('/tmp/foo');
      expect(yamlLoadFn).toHaveBeenCalled();
      expect(validateFn).toHaveBeenCalled();

      expect(JSON.parse(runtime.toJson())).toEqual({
        manifest,
        dirName: '/tmp/foo'
      });
    });

    it('throws an error when the manifest is invalid', async () => {
      jest.spyOn(jsYaml, 'safeLoad').mockImplementation((data) => JSON.parse(data));
      jest.spyOn(Ajv.prototype, 'validate').mockReturnValue(false);

      expect.assertions(1);
      try {
        await Runtime.initialize('/tmp/foo');
      } catch (e) {
        expect(e.message).toMatch(/Invalid zap.yml manifest/);
      }
    });
  });

  describe('fromJson', () => {
    it('restores from serialized json', () => {
      const runtime = Runtime.fromJson(JSON.stringify({manifest, dirName: '/tmp/foo'}));
      expect(runtime['manifest']).toEqual(manifest);
      expect(runtime['dirName']).toEqual('/tmp/foo');
    });
  });

  describe('toJson', () => {
    it('serializes to json', () => {
      const json = JSON.stringify({manifest, dirName: '/tmp/foo'});
      const runtime = Runtime.fromJson(json);
      expect(runtime.toJson()).toEqual(json);
    });
  });

  describe('getFunctionClass', () => {
    it('loads the specified module', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({manifest, dirName: '/tmp/foo'}));
      const importFn = jest.spyOn(runtime as any, 'import').mockReturnValue({Foo: 'Foo'});

      const foo = await runtime.getFunctionClass('foo');

      expect(importFn).toHaveBeenCalledWith('/tmp/foo/functions/Foo');
      expect(foo).toEqual('Foo');
    });

    it("throws an error the function isn't in the manifest", async () => {
      const runtime = Runtime.fromJson(JSON.stringify({manifest, dirName: '/tmp/foo'}));

      expect.assertions(1);
      try {
        await runtime.getFunctionClass('bar');
      } catch (e) {
        expect(e.message).toMatch(/^No function named bar/);
      }
    });
  });
});
