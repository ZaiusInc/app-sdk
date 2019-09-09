import * as Ajv from 'ajv';
import 'jest';
import * as fs from 'fs';
import * as jsYaml from 'js-yaml';
import * as mockFs from 'mock-fs';
import {ValueHash} from '../store';
import {Function} from './Function';
import {Job, JobStatus} from './Job';
import {Request, Response} from './lib';
import {Lifecycle} from './Lifecycle';
import {Runtime} from './Runtime';
import {AppManifest, LifecycleResult} from './types';
import {SchemaObject} from './types/SchemaObject';
import deepFreeze = require('deep-freeze');
import SpyInstance = jest.SpyInstance;

jest.mock('js-yaml');

const appManifest = deepFreeze({
  meta: {
    app_id: 'my_app',
    display_name: 'My App',
    version: '1.0.0',
    vendor: 'zaius',
    support_url: 'https://zaius.com',
    summary: 'This is an interesting app',
    contact_email: 'support@zaius.com',
    categories: ['eCommerce']
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

const schemaObjects = deepFreeze({
  'events.yml': {
    name: 'events',
    fields: [{
      name: 'my_app_coupon_id',
      type: 'string',
      display_name: 'My App Coupon ID',
      description: 'The coupon associated with this event'
    }],
    relations: [{
      name: 'my_app_coupon',
      display_name: 'My App Coupon',
      child_object: 'my_app_coupons',
      join_fields: [{
        parent: 'my_app_coupon_id',
        child: 'coupon_id'
      }]
    }]
  },
  'my_app_coupons.yml': {
    name: 'my_app_coupons',
    display_name: 'My App Coupons',
    fields: [{
      name: 'coupon_id',
      type: 'string',
      display_name: 'Coupon ID',
      description: 'The Coupon ID',
      primary: true
    }, {
      name: 'percent_off',
      type: 'number',
      display_name: 'Percent Off',
      description: 'Percentage discount'
    }]
  }
} as {[file: string]: SchemaObject}) as {[file: string]: SchemaObject};

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
      '/tmp/foo': {
        'app.yml': JSON.stringify(appManifest),
        'schema': {
          'events.yml': JSON.stringify(schemaObjects['events.yml']),
          'my_app_coupons.yml': JSON.stringify(schemaObjects['my_app_coupons.yml']),
          'something_else.yml.txt': 'something else'
        }
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

      yamlLoadFn.mockRestore();
      validateFn.mockRestore();
    });

    it('throws an error when the manifest is invalid', async () => {
      const yamlLoadFn = jest.spyOn(jsYaml, 'safeLoad').mockImplementation((data) => JSON.parse(data));
      const validateFn = jest.spyOn(Ajv.prototype, 'validate').mockReturnValue(false);

      try {
        await Runtime.initialize('/tmp/foo');
      } catch (e) {
        expect(e.message).toMatch(/Invalid app.yml manifest/);
      }

      yamlLoadFn.mockRestore();
      validateFn.mockRestore();
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

      importFn.mockRestore();
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

      importFn.mockRestore();
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

      importFn.mockRestore();
    });
  });

  describe('getSchemaObjects', () => {
    it('loads all yml files in the schema directory', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      const origReadFileSync = fs.readFileSync;
      const readFileSyncFn = jest.spyOn(fs, 'readFileSync').mockImplementation(origReadFileSync);
      const yamlLoadFn = jest.spyOn(jsYaml, 'safeLoad').mockImplementation((data) => JSON.parse(data));

      const result = await runtime.getSchemaObjects();
      expect(readFileSyncFn.mock.calls).toEqual([
        ['/tmp/foo/schema/events.yml', 'utf8'],
        ['/tmp/foo/schema/my_app_coupons.yml', 'utf8'],
      ]);
      expect(result).toEqual(schemaObjects);

      readFileSyncFn.mockRestore();
      yamlLoadFn.mockRestore();
    });
  });

  describe('validate', () => {
    let getFunctionClass: SpyInstance | undefined;
    let getLifecycleClass: SpyInstance | undefined;
    let getJobClass: SpyInstance | undefined;
    let getSchemaObjects: SpyInstance | undefined;

    beforeEach(() => {
      getFunctionClass = jest.spyOn(Runtime.prototype, 'getFunctionClass').mockResolvedValue(ProperFoo);
      getLifecycleClass = jest.spyOn(Runtime.prototype, 'getLifecycleClass').mockResolvedValue(ProperLifecycle);
      getJobClass = jest.spyOn(Runtime.prototype, 'getJobClass').mockResolvedValue(ProperBar);
      getSchemaObjects = jest.spyOn(Runtime.prototype, 'getSchemaObjects').mockResolvedValue({});
    });

    afterEach(() => {
      getFunctionClass!.mockRestore();
      getLifecycleClass!.mockRestore();
      getJobClass!.mockRestore();
      getSchemaObjects!.mockRestore();
    });

    it('captures json schema errors in the manifest', async () => {
      const manifest = {
        ...appManifest,
        meta: {...appManifest.meta, categories: ['Rocket Launchers']},
        runtime: 'node10',
        functions: {foo: {...appManifest.functions!.foo, entry_point: undefined}}
      };
      const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

      expect(await runtime.validate()).toEqual([
        "Invalid app.yml: functions.foo must have required property 'entry_point'",
        'Invalid app.yml: meta.categories[0] must be equal to one of the allowed values',
        'Invalid app.yml: runtime must be equal to one of the allowed values'
      ]);
    });

    it('detects invalid app id', async () => {
      const manifest = {...appManifest, meta: {...appManifest.meta, app_id: 'MyApp'}};
      const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

      expect(await runtime.validate()).toEqual([
        'Invalid app.yml: meta.app_id must start with a letter, contain only lowercase alpha-numeric and underscore, ' +
        'and be between 3 and 32 characters long (/^[a-z][a-z_0-9]{2,31}$/)'
      ]);
    });

    it('detects blank display name', async () => {
      const manifest = {...appManifest, meta: {...appManifest.meta, display_name: '\t'}};
      const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

      expect(await runtime.validate()).toEqual(['Invalid app.yml: meta.display_name must not be blank']);
    });

    it('detects invalid version', async () => {
      const manifest = {...appManifest, meta: {...appManifest.meta, version: '1.3'}};
      const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

      expect(await runtime.validate()).toEqual([
        'Invalid app.yml: meta.version must be a semantic version number, optionally with -dev/-beta (and increment) ' +
        'or -private (/^\\d+\\.\\d+\\.\\d+(-(((dev|beta)(\\.\\d+)?)|private))?$/)'
      ]);
    });

    it('detects invalid vendor', async () => {
      const manifest = {...appManifest, meta: {...appManifest.meta, vendor: 'MyCompany'}};
      const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

      expect(await runtime.validate()).toEqual([
        'Invalid app.yml: meta.vendor must be lower snake case (/^[a-z0-9]+(_[a-z0-9]+)*$/)'
      ]);
    });

    it('detects invalid support url', async () => {
      const manifest = {...appManifest, meta: {...appManifest.meta, support_url: 'foo.bar'}};
      const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

      expect(await runtime.validate()).toEqual(['Invalid app.yml: meta.support_url must be a valid web address']);
    });

    it('detects invalid contact email', async () => {
      const manifest = {...appManifest, meta: {...appManifest.meta, contact_email: 'foo@bar'}};
      const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

      expect(await runtime.validate()).toEqual(['Invalid app.yml: meta.contact_email must be a valid email address']);
    });

    it('detects blank summary', async () => {
      const manifest = {...appManifest, meta: {...appManifest.meta, summary: '  '}};
      const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

      expect(await runtime.validate()).toEqual(['Invalid app.yml: meta.summary must not be blank']);
    });

    it('detects missing categories', async () => {
      const manifest = {...appManifest, meta: {...appManifest.meta, categories: []}};
      const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

      expect(await runtime.validate()).toEqual(['Invalid app.yml: meta.categories must contain 1 or 2 categories']);
    });

    it('detects too many categories', async () => {
      const manifest = {...appManifest, meta: {...appManifest.meta, categories: [
        'eCommerce', 'Point of Sale', 'Lead Capture'
      ]}};
      const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

      expect(await runtime.validate()).toEqual(['Invalid app.yml: meta.categories must contain 1 or 2 categories']);
    });

    it('detects duplicate categories', async () => {
      const manifest = {...appManifest, meta: {...appManifest.meta, categories: ['eCommerce', 'eCommerce']}};
      const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

      expect(await runtime.validate()).toEqual(['Invalid app.yml: meta.categories contains two identical categories']);
    });

    it('detects missing function entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getFunctionClass!.mockRejectedValue(new Error('not found'));

      expect(await runtime.validate()).toEqual(['Entry point not found for function: foo']);
    });

    it('detects non-extended function entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getFunctionClass!.mockResolvedValue(NonExtendedFoo as any);

      expect(await runtime.validate()).toEqual(['Function entry point does not extend App.Function: Foo']);
    });

    it('detects partial function entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getFunctionClass!.mockResolvedValue(PartialFoo as any);

      expect(await runtime.validate()).toEqual(['Function entry point is missing the perform method: Foo']);
    });

    it('detects missing lifecycle implementation', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getLifecycleClass!.mockRejectedValue(new Error('not found'));

      expect(await runtime.validate()).toEqual(['Lifecycle implementation not found']);
    });

    it('detects non-extended lifecycle implementation', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getLifecycleClass!.mockResolvedValue(NonExtendedLifecycle as any);

      expect(await runtime.validate()).toEqual(['Lifecycle implementation does not extend App.Lifecycle']);
    });

    it('detects partial lifecycle implementation', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getLifecycleClass!.mockResolvedValue(PartialLifecycle as any);

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
      getJobClass!.mockRejectedValue(new Error('not found'));

      expect(await runtime.validate()).toEqual(['Entry point not found for job: bar']);
    });

    it('detects non-extended job entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getJobClass!.mockReturnValue(NonExtendedBar as any);

      expect(await runtime.validate()).toEqual(['Job entry point does not extend App.Job: Bar']);
    });

    it('detects partial function entry point', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getJobClass!.mockReturnValue(PartialBar);

      expect(await runtime.validate()).toEqual([
        'Job entry point is missing the prepare method: Bar',
        'Job entry point is missing the perform method: Bar'
      ]);
    });

    it('succeeds with a proper definition', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getFunctionClass!.mockResolvedValue(ProperFoo);
      getLifecycleClass!.mockResolvedValue(ProperLifecycle);
      getJobClass!.mockResolvedValue(ProperBar);

      const errors = await runtime.validate();

      expect(getFunctionClass).toHaveBeenCalledWith('foo');
      expect(getLifecycleClass).toHaveBeenCalled();
      expect(getJobClass).toHaveBeenCalledWith('bar');
      expect(errors).toEqual([]);
    });

    it('succeeds with proper schema', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getSchemaObjects!.mockResolvedValue(schemaObjects);

      expect(await runtime.validate()).toEqual([]);
    });

    it('detects invalid names', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getSchemaObjects!.mockResolvedValue({
        'events.yml': {
          ...schemaObjects['events.yml'],
          fields: [{...schemaObjects['events.yml'].fields[0], name: 'couponID'}],
          relations: [{...schemaObjects['events.yml'].relations![0], name: 'couponID'}]
        },
        'my_app_Coupons.yml': {
          ...schemaObjects['my_app_coupons.yml'],
          name: 'my_app_Coupons',
          alias: 'Foo',
          fields: [
            {...schemaObjects['my_app_coupons.yml'].fields[0], name: 'couponID'}
          ]
        }
      });

      expect(await runtime.validate()).toEqual([
        'Invalid schema/events.yml: fields[0].name must start with a letter, contain only lowercase alpha-numeric ' +
          'and underscore, and be between 2 and 64 characters long (/^[a-z][a-z0-9_]{1,61}$/)',
        'Invalid schema/events.yml: fields[0].name must be prefixed with my_app_',
        'Invalid schema/events.yml: relations[0].name must start with a letter, contain only lowercase alpha-numeric ' +
          'and underscore, and be between 2 and 64 characters long (/^[a-z][a-z0-9_]{1,61}$/)',
        'Invalid schema/events.yml: relations[0].name must be prefixed with my_app_',
        'Invalid schema/my_app_Coupons.yml: name must start with a letter, contain only lowercase alpha-numeric and ' +
          'underscore, and be between 2 and 64 characters long (/^[a-z][a-z0-9_]{1,61}$/)',
        'Invalid schema/my_app_Coupons.yml: alias must be prefixed with my_app_',
        'Invalid schema/my_app_Coupons.yml: fields[0].name must start with a letter, contain only lowercase ' +
          'alpha-numeric and underscore, and be between 2 and 64 characters long (/^[a-z][a-z0-9_]{1,61}$/)',
      ]);
    });

    it('requires detects invalid display name and description on custom items', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getSchemaObjects!.mockResolvedValue({
        'events.yml': {
          ...schemaObjects['events.yml'],
          fields: [{...schemaObjects['events.yml'].fields[0], display_name: '  ', description: '\t'}],
          relations: [{...schemaObjects['events.yml'].relations![0], display_name: ''}]
        },
        'my_app_coupons.yml': {
          ...schemaObjects['my_app_coupons.yml'],
          display_name: '',
          fields: [
            {...schemaObjects['my_app_coupons.yml'].fields[0], display_name: '\t', description: ''}
          ]
        }
      });

      expect(await runtime.validate()).toEqual([
        'Invalid schema/events.yml: fields[0].display_name must be specified',
        'Invalid schema/events.yml: fields[0].description must be specified',
        'Invalid schema/events.yml: fields[0].display_name must be prefixed with My App',
        'Invalid schema/events.yml: relations[0].display_name must be specified',
        'Invalid schema/events.yml: relations[0].display_name must be prefixed with My App',
        'Invalid schema/my_app_coupons.yml: display_name must be specified for custom object',
        'Invalid schema/my_app_coupons.yml: fields[0].display_name must be specified',
        'Invalid schema/my_app_coupons.yml: fields[0].description must be specified'
      ]);
    });

    it('does not allow display name or alias on non-custom objects', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getSchemaObjects!.mockResolvedValue({
        ...schemaObjects,
        'events.yml': {
          ...schemaObjects['events.yml'],
          display_name: 'Event-Like Stuff',
          alias: 'event_like_stuff'
        }
      });

      expect(await runtime.validate()).toEqual([
        'Invalid schema/events.yml: display_name cannot be specified for non-custom object',
        'Invalid schema/events.yml: alias cannot be specified for non-custom object'
      ]);
    });

    it('requires a join field', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getSchemaObjects!.mockResolvedValue({
        ...schemaObjects,
        'events.yml': {
          ...schemaObjects['events.yml'],
          relations: [{...schemaObjects['events.yml'].relations![0], join_fields: []}]
        }
      });

      expect(await runtime.validate()).toEqual([
        'Invalid schema/events.yml: relations[0].join_fields must contain at least one join field'
      ]);
    });

    it('requires a primary key on custom objects', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getSchemaObjects!.mockResolvedValue({
        ...schemaObjects,
        'my_app_coupons.yml': {
          ...schemaObjects['my_app_coupons.yml'],
          fields: [{...schemaObjects['my_app_coupons.yml'].fields[0], primary: false}]
        }
      });

      expect(await runtime.validate()).toEqual([
        'Invalid schema/my_app_coupons.yml: fields must contain at least one primary key for custom object'
      ]);
    });

    it('does not allow a primary key on non-custom objects', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getSchemaObjects!.mockResolvedValue({
        ...schemaObjects,
        'events.yml': {
          ...schemaObjects['events.yml'],
          fields: [{...schemaObjects['events.yml'].fields[0], primary: true}]
        }
      });

      expect(await runtime.validate()).toEqual([
        'Invalid schema/events.yml: fields[0].primary cannot be set for non-custom object'
      ]);
    });

    it('enforces custom object rules for non-prefixed objects when base object names are available', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getSchemaObjects!.mockResolvedValue({
        'coupons.yml': {
          ...schemaObjects['my_app_coupons.yml'],
          name: 'coupons',
          display_name: 'Coupons'
        }
      });

      expect(await runtime.validate(['events'])).toEqual([
        'Invalid schema/coupons.yml: name must be prefixed with my_app_ for custom object',
        'Invalid schema/coupons.yml: display_name must be prefixed with My App'
      ]);
    });

    it('captures json schema errors in schema objects', async () => {
      const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
      getSchemaObjects!.mockResolvedValue({
        'events.yml': {
          ...schemaObjects['events.yml'],
          name: undefined,
          fields: [{...schemaObjects['events.yml'].fields[0], type: 'text', description: undefined}]
        }
      } as any);

      expect(await runtime.validate(['events'])).toEqual([
        "Invalid schema/events.yml: fields[0] must have required property 'description'",
        'Invalid schema/events.yml: fields[0].type must be equal to one of the allowed values',
        "Invalid schema/events.yml: must have required property 'name'"
      ]);
    });
  });
});
