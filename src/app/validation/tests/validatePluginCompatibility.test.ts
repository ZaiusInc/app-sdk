import 'jest';

import {Runtime} from '../../Runtime';
import {AppManifest} from '../../types';
import {type AppSdkPlugin, validatePluginCompatibility} from '../plugins';

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

const exclusivePlugin: AppSdkPlugin = {id: 'test-exclusive-plugin', requiredInstallationScope: 'CMS'};
const nonExclusivePlugin: AppSdkPlugin = {id: 'test-plugin'};

function buildRuntime(manifest: Record<string, unknown>): Runtime {
  return Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));
}

describe('validatePluginCompatibility', () => {
  it('returns no errors when no exclusive plugins are registered', () => {
    const runtime = buildRuntime({...baseManifest, sources: {foo: {}}, destinations: {bar: {}}});
    expect(validatePluginCompatibility(runtime, [nonExclusivePlugin])).toEqual([]);
  });

  it('returns no errors when exclusive plugin is registered but no conflicting sections', () => {
    const runtime = buildRuntime({...baseManifest});
    expect(validatePluginCompatibility(runtime, [exclusivePlugin])).toEqual([]);
  });

  it('rejects sources when an exclusive plugin is registered', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      sources: {foo_source: {description: 'foo', schema: 'asset', function: {entry_point: 'FooSource'}}}
    });
    expect(validatePluginCompatibility(runtime, [exclusivePlugin])).toContain(
      "Invalid app.yml: plugin 'test-exclusive-plugin' requires CMS installation scope and cannot be combined with data sync sources"
    );
  });

  it('rejects destinations when an exclusive plugin is registered', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      destinations: {foo_dest: {entry_point: 'FooDest', description: 'foo', schema: 'asset'}}
    });
    expect(validatePluginCompatibility(runtime, [exclusivePlugin])).toContain(
      "Invalid app.yml: plugin 'test-exclusive-plugin' requires CMS installation scope and cannot be combined with data sync destinations"
    );
  });

  it('rejects OPAL tool functions when an exclusive plugin is registered', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      functions: {opal_fn: {entry_point: 'OpalFn', description: 'opal', opal_tool: true}}
    });
    expect(validatePluginCompatibility(runtime, [exclusivePlugin])).toContain(
      "Invalid app.yml: plugin 'test-exclusive-plugin' requires CMS installation scope and cannot be combined with opal tool functions"
    );
  });

  it('returns all applicable errors when multiple conflicts exist', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      sources: {foo_source: {}},
      destinations: {foo_dest: {}},
      functions: {opal_fn: {entry_point: 'OpalFn', description: 'opal', opal_tool: true}}
    });
    const errors = validatePluginCompatibility(runtime, [exclusivePlugin]);
    expect(errors).toContain(
      "Invalid app.yml: plugin 'test-exclusive-plugin' requires CMS installation scope and cannot be combined with data sync sources"
    );
    expect(errors).toContain(
      "Invalid app.yml: plugin 'test-exclusive-plugin' requires CMS installation scope and cannot be combined with data sync destinations"
    );
    expect(errors).toContain(
      "Invalid app.yml: plugin 'test-exclusive-plugin' requires CMS installation scope and cannot be combined with opal tool functions"
    );
  });

  it('allows non-OPAL functions alongside an exclusive plugin', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      functions: {regular_fn: {entry_point: 'Fn', description: 'fn', opal_tool: false}}
    });
    expect(validatePluginCompatibility(runtime, [exclusivePlugin])).toEqual([]);
  });

  it('rejects plugins with conflicting installation scopes', () => {
    const anotherScopedPlugin: AppSdkPlugin = {id: 'another-scoped-plugin', requiredInstallationScope: 'OTHER'};
    const runtime = buildRuntime({...baseManifest});
    const errors = validatePluginCompatibility(runtime, [exclusivePlugin, anotherScopedPlugin]);
    expect(errors[0]).toContain("can't be used together");
    expect(errors[0]).toContain("'test-exclusive-plugin' (CMS)");
    expect(errors[0]).toContain("'another-scoped-plugin' (OTHER)");
    expect(errors[0]).toContain("can't be used together");
  });

  it('allows multiple plugins with the same installation scope', () => {
    const sameScopePlugin: AppSdkPlugin = {id: 'another-cms-plugin', requiredInstallationScope: 'CMS'};
    const runtime = buildRuntime({...baseManifest});
    const errors = validatePluginCompatibility(runtime, [exclusivePlugin, sameScopePlugin]);
    expect(errors.some((e) => e.includes("can't be used together"))).toBe(false);
  });

  it('allows a plugin without scope alongside a scoped plugin', () => {
    const unscopedPlugin: AppSdkPlugin = {id: 'generic-plugin'};
    const runtime = buildRuntime({...baseManifest});
    const errors = validatePluginCompatibility(runtime, [exclusivePlugin, unscopedPlugin]);
    expect(errors.some((e) => e.includes("can't be used together"))).toBe(false);
  });
});
