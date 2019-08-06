import * as Ajv from 'ajv';
import 'jest';
import * as jsYaml from 'js-yaml';
import * as mockFs from 'mock-fs';
import {ValueHash} from '../store';
import {Function} from './Function';
import {Job, JobStatus} from './Job';
import {Request, Response} from './lib';
import {Lifecycle} from './Lifecycle';
import {Runtime} from './Runtime';
import {AppManifest, LifecycleResult} from './types';
import deepFreeze = require('deep-freeze');

jest.mock('js-yaml');

const appManifest = deepFreeze({
  meta: {
    app_id: 'appid',
    display_name: 'Display Name',
    version: '1.0.0',
    vendor: 'Zaius',
    support_url: '',
    summary: '',
    contact_email: '',
  },
  runtime: 'node12',
  functions: {
    foo: {
      method: 'GET',
      entry_point: 'Foo',
      description: 'gets foo'
    }
  },
  jobs: {
    bar: {
      entry_point: 'Bar',
      description: 'Does a thing'
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

  public async onInstall(): Promise<LifecycleResult> {
    return {success: true};
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

class NonExtendedBar {
  public async prepare(_status?: JobStatus): Promise<JobStatus> {
    return {complete: false, state: {}};
  }
  public async perform(status: JobStatus): Promise<JobStatus> {
    return status;
  }
}

// @ts-ignore
class PartialBar extends Job {
}

class ProperBar extends Job {
  public async prepare(params: ValueHash, _status?: JobStatus): Promise<JobStatus> {
    return {complete: false, state: params};
  }
  public async perform(status: JobStatus): Promise<JobStatus> {
    return status;
  }
}
/* tslint:enable */

describe('Runtime', () => {
  beforeAll(() => {
    mockFs({
      '/tmp/foo/': {
        'app.yml': JSON.stringify(appManifest)
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
        appManifest,
        dirName: '/tmp/foo'
      });
    });

    it('throws an error when the manifest is invalid', async () => {
      jest.spyOn(jsYaml, 'safeLoad').mockImplementation((data) => JSON.parse(data));
      jest.spyOn(Ajv.prototype, 'validate').mockReturnValue(false);

      try {
        await Runtime.initialize('/tmp/foo');
      } catch (e) {
        expect(e.message).toMatch(/Invalid app.yml manifest/);
      }
    });
  });

  describe('fromJson', () => {
    it('restores from serialized json', () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      expect(runtime.manifest).toEqual(appManifest);
      expect(runtime['dirName']).toEqual('/tmp/foo');
    });
  });

  describe('toJson', () => {
    it('serializes to json', () => {
      const json = JSON.stringify({appManifest, dirName: '/tmp/foo'});
      const runtime = Runtime.fromJson(json);
      expect(runtime.toJson()).toEqual(json);
    });
  });

  describe('getFunctionClass', () => {
    it('loads the specified module', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      const importFn = jest.spyOn(runtime as any, 'import').mockResolvedValue({Foo: 'Foo'});

      const foo = await runtime.getFunctionClass('foo');

      expect(importFn).toHaveBeenCalledWith('/tmp/foo/functions/Foo');
      expect(foo).toEqual('Foo');
    });

    it("throws an error the function isn't in the manifest", async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));

      try {
        await runtime.getFunctionClass('bar');
      } catch (e) {
        expect(e.message).toMatch(/^No function named bar/);
      }
    });
  });

  describe('getJobClass', () => {
    it('loads the specified module', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      const importFn = jest.spyOn(runtime as any, 'import').mockResolvedValue({Bar: 'Bar'});

      const bar = await runtime.getJobClass('bar');

      expect(importFn).toHaveBeenCalledWith('/tmp/foo/jobs/Bar');
      expect(bar).toEqual('Bar');
    });

    it("throws an error the job isn't in the manifest", async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));

      try {
        await runtime.getJobClass('foo');
      } catch (e) {
        expect(e.message).toMatch(/^No job named foo/);
      }
    });
  });

  describe('getLifecycleClass', () => {
    it('loads the lifecycle module', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      const importFn = jest.spyOn(runtime as any, 'import').mockResolvedValue({Lifecycle: 'Lifecycle'});

      const lifecycle = await runtime.getLifecycleClass();

      expect(importFn).toHaveBeenCalledWith('/tmp/foo/lifecycle/Lifecycle');
      expect(lifecycle).toEqual('Lifecycle');
    });
  });

  describe('validate', () => {
    beforeEach(() => {
      jest.spyOn(Runtime.prototype, 'getFunctionClass').mockResolvedValue(ProperFoo);
      jest.spyOn(Runtime.prototype, 'getLifecycleClass').mockResolvedValue(ProperLifecycle);
      jest.spyOn(Runtime.prototype, 'getJobClass').mockResolvedValue(ProperBar);
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('detects missing function entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime, 'getFunctionClass').mockRejectedValue(new Error('not found'));

      expect(await runtime.validate()).toEqual(['Entry point not found for function: foo']);
    });

    it('detects non-extended function entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime, 'getFunctionClass').mockResolvedValue(NonExtendedFoo as any);

      expect(await runtime.validate()).toEqual(['Function entry point does not extend App.Function: Foo']);
    });

    it('detects partial function entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime, 'getFunctionClass').mockResolvedValue(PartialFoo as any);

      expect(await runtime.validate()).toEqual(['Function entry point is missing the perform method: Foo']);
    });

    it('detects missing lifecycle implementation', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime, 'getLifecycleClass').mockRejectedValue(new Error('not found'));

      expect(await runtime.validate()).toEqual(['Lifecycle implementation not found']);
    });

    it('detects non-extended lifecycle implementation', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime, 'getLifecycleClass').mockResolvedValue(NonExtendedLifecycle as any);

      expect(await runtime.validate()).toEqual(['Lifecycle implementation does not extend App.Lifecycle']);
    });

    it('detects partial lifecycle implementation', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime, 'getLifecycleClass').mockResolvedValue(PartialLifecycle as any);

      expect(await runtime.validate()).toEqual([
        'Lifecycle implementation is missing the onInstall method',
        'Lifecycle implementation is missing the onSetupForm method',
        'Lifecycle implementation is missing the onUpgrade method',
        'Lifecycle implementation is missing the onFinalizeUpgrade method',
        'Lifecycle implementation is missing the onUninstall method'
      ]);
    });

    it('detects missing job entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime, 'getJobClass').mockRejectedValue(new Error('not found'));

      expect(await runtime.validate()).toEqual(['Entry point not found for job: bar']);
    });

    it('detects non-extended job entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime, 'getJobClass').mockReturnValue(NonExtendedBar as any);

      expect(await runtime.validate()).toEqual(['Job entry point does not extend App.Job: Bar']);
    });

    it('detects partial function entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      jest.spyOn(runtime as any, 'getJobClass').mockReturnValue(PartialBar);

      expect(await runtime.validate()).toEqual([
        'Job entry point is missing the prepare method: Bar',
        'Job entry point is missing the perform method: Bar'
      ]);
    });

    it('succeeds with a proper definition', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      const getFunctionClass = jest.spyOn(runtime, 'getFunctionClass').mockResolvedValue(ProperFoo);
      const getLifecycleClass = jest.spyOn(runtime, 'getLifecycleClass').mockResolvedValue(ProperLifecycle);
      const getJobClass = jest.spyOn(runtime, 'getJobClass').mockResolvedValue(ProperBar);

      const errors = await runtime.validate();

      expect(getFunctionClass).toHaveBeenCalledWith('foo');
      expect(getLifecycleClass).toHaveBeenCalled();
      expect(getJobClass).toHaveBeenCalledWith('bar');
      expect(errors).toEqual([]);
    });
  });
});
