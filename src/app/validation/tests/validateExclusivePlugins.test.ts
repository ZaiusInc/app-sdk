import 'jest';

import {Runtime} from '../../Runtime';
import {AppManifest} from '../../types';
import {type AppSdkPlugin, validateExclusivePlugins} from '../plugins';

const baseManifest: AppManifest = {
  meta: {
    app_id: 'my_app',
    display_name: 'My App',
    version: '1.0.0',
    vendor: 'zaius',
    support_url: 'https://zaius.com',
    summary: 'This is an interesting app',
    contact_email: 'support@zaius.com',
    categories: ['Commerce Platform'],
    availability: ['all']
  },
  runtime: 'node18',
  environment: ['APP_ENV_FOO'],
  functions: {
    foo: {entry_point: 'Foo', description: 'gets foo'}
  }
};

const exclusivePlugin: AppSdkPlugin = {id: 'test-exclusive-plugin', exclusive: true};
const nonExclusivePlugin: AppSdkPlugin = {id: 'test-plugin'};

function buildRuntime(manifest: Record<string, unknown>): Runtime {
  return Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));
}

describe('validateExclusivePlugins', () => {
  it('returns no errors when no exclusive plugins are registered', () => {
    const runtime = buildRuntime({...baseManifest, sources: {foo: {}}, destinations: {bar: {}}});
    expect(validateExclusivePlugins(runtime, [nonExclusivePlugin])).toEqual([]);
  });

  it('returns no errors when exclusive plugin is registered but no conflicting sections', () => {
    const runtime = buildRuntime({...baseManifest});
    expect(validateExclusivePlugins(runtime, [exclusivePlugin])).toEqual([]);
  });

  it('rejects sources when an exclusive plugin is registered', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      sources: {foo_source: {description: 'foo', schema: 'asset', function: {entry_point: 'FooSource'}}}
    });
    expect(validateExclusivePlugins(runtime, [exclusivePlugin])).toContain(
      "Invalid app.yml: 'test-exclusive-plugin' cannot be combined with sources"
    );
  });

  it('rejects destinations when an exclusive plugin is registered', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      destinations: {foo_dest: {entry_point: 'FooDest', description: 'foo', schema: 'asset'}}
    });
    expect(validateExclusivePlugins(runtime, [exclusivePlugin])).toContain(
      "Invalid app.yml: 'test-exclusive-plugin' cannot be combined with destinations"
    );
  });

  it('rejects OPAL tool functions when an exclusive plugin is registered', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      functions: {opal_fn: {entry_point: 'OpalFn', description: 'opal', opal_tool: true}}
    });
    expect(validateExclusivePlugins(runtime, [exclusivePlugin])).toContain(
      "Invalid app.yml: 'test-exclusive-plugin' cannot be combined with opal_tool functions"
    );
  });

  it('returns all applicable errors when multiple conflicts exist', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      sources: {foo_source: {}},
      destinations: {foo_dest: {}},
      functions: {opal_fn: {entry_point: 'OpalFn', description: 'opal', opal_tool: true}}
    });
    const errors = validateExclusivePlugins(runtime, [exclusivePlugin]);
    expect(errors).toContain("Invalid app.yml: 'test-exclusive-plugin' cannot be combined with sources");
    expect(errors).toContain("Invalid app.yml: 'test-exclusive-plugin' cannot be combined with destinations");
    expect(errors).toContain("Invalid app.yml: 'test-exclusive-plugin' cannot be combined with opal_tool functions");
  });

  it('allows non-OPAL functions alongside an exclusive plugin', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      functions: {regular_fn: {entry_point: 'Fn', description: 'fn', opal_tool: false}}
    });
    expect(validateExclusivePlugins(runtime, [exclusivePlugin])).toEqual([]);
  });
});
