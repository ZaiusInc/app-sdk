import * as Ajv from 'ajv';
import 'jest';
import * as jsYaml from 'js-yaml';
import * as mockFs from 'mock-fs';
import {Request, Response} from './lib';
import {Lifecycle} from './Lifecycle';
import {Runtime} from './Runtime';
import {AppManifest, LifecycleResult} from './types';
import {Function} from './Function';
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
} as AppManifest);

/* tslint:disable */
class NonExtendedFoo {
  // Nothing
}

abstract class PartialFoo extends Function {
  protected constructor(request: Request) {
    super(request);
  }
}

class ProperFoo extends Function {
  public constructor(request: Request) {
    super(request);
  }

  public async perform(): Promise<Response> {
    return new Response();
  }
}

class NonExtendedLifecycle {
  // Nothing
}

abstract class PartialLifecycle extends Lifecycle {
  protected constructor() {
    super();
  }
}

class ProperLifecycle extends Lifecycle {
  public constructor() {
    super();
  }

  public async onSetupForm(_page: string, _action: string, _formData: object): Promise<Response> {
    return new Response();
  }

  public async onUpgrade(_fromVersion: string): Promise<LifecycleResult> {
    return {success: true};
  }

  public async onFinalizeUpgrade(_fromVersion: string): Promise<LifecycleResult> {
    return {success: true};
  }

  public async onUninstall(): Promise<LifecycleResult> {
    return {success: true};
  }
}
/* tslint:enable */

describe('Runtime', () => {
  beforeAll(() => {
    mockFs({
      '/tmp/foo/': {
        'app.yml': JSON.stringify(manifest)
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
        expect(e.message).toMatch(/Invalid app.yml manifest/);
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

  describe('getLifecycleClass', () => {
    it('loads the lifecycle module', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({manifest, dirName: '/tmp/foo'}));
      const importFn = jest.spyOn(runtime as any, 'import').mockReturnValue({Lifecycle: 'Lifecycle'});

      const lifecycle = await runtime.getLifecycleClass();

      expect(importFn).toHaveBeenCalledWith('/tmp/foo/lifecycle/Lifecycle');
      expect(lifecycle).toEqual('Lifecycle');
    });
  });

  describe('validate', () => {
    it('detects missing function entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({manifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime as any, 'getFunctionClass').mockReturnValue(null);
      jest.spyOn(runtime as any, 'getLifecycleClass').mockReturnValue(ProperLifecycle);

      expect(await runtime.validate()).toEqual(['Entry point not found for function: foo']);
    });

    it('detects non-extended function entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({manifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime as any, 'getFunctionClass').mockReturnValue(NonExtendedFoo);
      jest.spyOn(runtime as any, 'getLifecycleClass').mockReturnValue(ProperLifecycle);

      expect(await runtime.validate()).toEqual(['Function entry point does not extend App.Function: Foo']);
    });

    it('detects partial function entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({manifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime as any, 'getFunctionClass').mockReturnValue(PartialFoo);
      jest.spyOn(runtime as any, 'getLifecycleClass').mockReturnValue(ProperLifecycle);

      expect(await runtime.validate()).toEqual(['Function entry point is missing the perform method: Foo']);
    });

    it('detects missing lifecycle implementation', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({manifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime as any, 'getFunctionClass').mockReturnValue(ProperFoo);
      jest.spyOn(runtime as any, 'getLifecycleClass').mockReturnValue(null);

      expect(await runtime.validate()).toEqual(['Lifecycle implementation not found']);
    });

    it('detects non-extended lifecycle implementation', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({manifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime as any, 'getFunctionClass').mockReturnValue(ProperFoo);
      jest.spyOn(runtime as any, 'getLifecycleClass').mockReturnValue(NonExtendedLifecycle);

      expect(await runtime.validate()).toEqual(['Lifecycle implementation does not extend App.Lifecycle']);
    });

    it('detects partial lifecycle implementation', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({manifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime as any, 'getFunctionClass').mockReturnValue(ProperFoo);
      jest.spyOn(runtime as any, 'getLifecycleClass').mockReturnValue(PartialLifecycle);

      expect(await runtime.validate()).toEqual([
        'Lifecycle implementation is missing the onSetupForm method',
        'Lifecycle implementation is missing the onUpgrade method',
        'Lifecycle implementation is missing the onFinalizeUpgrade method',
        'Lifecycle implementation is missing the onUninstall method'
      ]);
    });

    it('succeeds with a proper definition', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({manifest, dirName: '/tmp/foo'}));
      const getFunctionClass = jest.spyOn(runtime as any, 'getFunctionClass').mockReturnValue(ProperFoo);
      const getLifecycleClass = jest.spyOn(runtime as any, 'getLifecycleClass').mockReturnValue(ProperLifecycle);

      const errors = await runtime.validate();

      expect(getFunctionClass).toHaveBeenCalledWith('foo');
      expect(getLifecycleClass).toHaveBeenCalled();
      expect(errors).toEqual([]);
    });
  });
});
