import * as deepFreeze from 'deep-freeze';
import 'jest';
import * as jsYaml from 'js-yaml';
import * as mockFs from 'mock-fs';
import {Runtime} from '../Runtime';
import {AppManifest} from '../types';
import {SchemaObject} from '../types/SchemaObject';
import {validateApp} from './validateApp';
import {validateChannel} from './validateChannel';
import {validateEnvironment} from './validateEnvironment';
import {validateFunctions} from './validateFunctions';
import {validateJobs} from './validateJobs';
import {validateLifecycle} from './validateLifecycle';
import {validateLiquidExtensions} from './validateLiquidExtensions';
import {validateMeta} from './validateMeta';
import {validateSchemaObject} from './validateSchemaObject';
import {validateAssets} from './validateAssets';

jest.mock('./validateMeta');
jest.mock('./validateEnvironment');
jest.mock('./validateFunctions');
jest.mock('./validateJobs');
jest.mock('./validateLiquidExtensions');
jest.mock('./validateLifecycle');
jest.mock('./validateChannel');
jest.mock('./validateSchemaObject');
jest.mock('./validateAssets');

const appManifest = deepFreeze({
  meta: {
    app_id: 'my_app',
    display_name: 'My App',
    version: '1.0.0',
    vendor: 'zaius',
    support_url: 'https://zaius.com',
    summary: 'This is an interesting app',
    contact_email: 'support@zaius.com',
    categories: ['Commerce Platform']
  },
  runtime: 'node12',
  environment: ['APP_ENV_FOO'],
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
  'schema/events.yml': {
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
  'schema/my_app_coupons.yml': {
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

describe('validateApp', () => {
  beforeAll(() => {
    mockFs({
      '/tmp/foo': {
        'app.yml': jsYaml.dump(appManifest),
        'schema': {
          'events.yml': jsYaml.dump(schemaObjects['schema/events.yml']),
          'my_app_coupons.yml': jsYaml.dump(schemaObjects['schema/my_app_coupons.yml']),
          'something_else.yml.txt': 'something else'
        }
      }
    });
  });

  afterAll(() => {
    mockFs.restore();
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (validateMeta as jest.Mock).mockReturnValue([]);
    (validateEnvironment as jest.Mock).mockReturnValue([]);
    (validateFunctions as jest.Mock).mockResolvedValue([]);
    (validateJobs as jest.Mock).mockResolvedValue([]);
    (validateLiquidExtensions as jest.Mock).mockResolvedValue([]);
    (validateLifecycle as jest.Mock).mockResolvedValue([]);
    (validateChannel as jest.Mock).mockResolvedValue([]);
    (validateSchemaObject as jest.Mock).mockReturnValue([]);
    (validateAssets as jest.Mock).mockReturnValue([]);
  });

  it('succeeds with a proper definition', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    expect(await validateApp(runtime)).toEqual([]);
  });

  it('captures json schema errors in the manifest', async () => {
    const manifest = {
      ...appManifest,
      meta: {...appManifest.meta, categories: ['Rocket Launchers']},
      runtime: 'node10',
      functions: {foo: {...appManifest.functions!.foo, entry_point: undefined}}
    };
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));

    expect(await validateApp(runtime)).toEqual([
      "Invalid app.yml: functions.foo must have required property 'entry_point'",
      'Invalid app.yml: meta.categories[0] must be equal to one of the allowed values',
      'Invalid app.yml: runtime must be equal to one of the allowed values'
    ]);
  });

  it('captures json schema errors in schema objects', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getSchemaObjects = jest.spyOn(runtime, 'getSchemaObjects').mockReturnValue({
      'schema/events.yml': {
        ...schemaObjects['schema/events.yml'],
        name: undefined,
        fields: [{...schemaObjects['schema/events.yml'].fields![0], type: 'text', description: undefined}]
      }
    } as any);

    expect(await validateApp(runtime)).toEqual([
      "Invalid schema/events.yml: fields[0] must have required property 'description'",
      'Invalid schema/events.yml: fields[0].type must be equal to one of the allowed values',
      "Invalid schema/events.yml: must have required property 'name'"
    ]);

    getSchemaObjects.mockRestore();
  });

  it('captures content errors', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));

    (validateMeta as jest.Mock).mockReturnValue(['meta error 1', 'meta error 2']);
    (validateEnvironment as jest.Mock).mockReturnValue(['environment error 1', 'environment error 2']);
    (validateFunctions as jest.Mock).mockResolvedValue(['functions error 1', 'functions error 2']);
    (validateJobs as jest.Mock).mockResolvedValue(['jobs error 1', 'jobs error 2']);
    (validateLiquidExtensions as jest.Mock).mockResolvedValue(['liquid error 1', 'liquid error 2']);
    (validateLifecycle as jest.Mock).mockResolvedValue(['lifecycle error 1', 'lifecycle error 2']);
    (validateChannel as jest.Mock).mockResolvedValue(['channel error 1', 'channel error 2']);
    let schemaErrorCounter = 1;
    (validateSchemaObject as jest.Mock)
      .mockImplementation(() => [`schema error ${schemaErrorCounter++}`, `schema error ${schemaErrorCounter++}`]);
    (validateAssets as jest.Mock).mockResolvedValue(['asset error 1', 'asset error 2']);

    expect(await validateApp(runtime, ['events', 'customers'])).toEqual([
      'meta error 1', 'meta error 2',
      'environment error 1', 'environment error 2',
      'functions error 1', 'functions error 2',
      'jobs error 1', 'jobs error 2',
      'liquid error 1', 'liquid error 2',
      'lifecycle error 1', 'lifecycle error 2',
      'channel error 1', 'channel error 2',
      'asset error 1', 'asset error 2',
      'schema error 1', 'schema error 2',
      'schema error 3', 'schema error 4'
    ]);

    expect(validateMeta).toBeCalledWith(runtime);
    expect(validateFunctions).toBeCalledWith(runtime);
    expect(validateJobs).toBeCalledWith(runtime);
    expect(validateLiquidExtensions).toBeCalledWith(runtime);
    expect(validateLifecycle).toBeCalledWith(runtime);
    expect(validateChannel).toBeCalledWith(runtime);
    expect((validateSchemaObject as jest.Mock).mock.calls).toEqual([
      [runtime, schemaObjects['schema/events.yml'], 'schema/events.yml', ['events', 'customers']],
      [runtime, schemaObjects['schema/my_app_coupons.yml'], 'schema/my_app_coupons.yml', ['events', 'customers']]
    ]);
    expect(validateAssets).toBeCalledWith(runtime);
  });
});
