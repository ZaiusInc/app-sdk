import 'jest';

import {Runtime} from '../../Runtime';
import {AppManifest} from '../../types';
import {validateAppTypeSeparation} from '../validateApp';

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

const uiExtensions = {sidebar: [{name: 'a', entry_point: 'A', display_name: 'A'}]};

function buildRuntime(manifest: Record<string, unknown>): Runtime {
  return Runtime.fromJson(JSON.stringify({appManifest: manifest, dirName: '/tmp/foo'}));
}

describe('validateAppTypeSeparation', () => {
  it('returns no errors for a manifest with no ui_extensions', () => {
    const runtime = buildRuntime({...baseManifest, sources: {foo: {}}, destinations: {bar: {}}});
    expect(validateAppTypeSeparation(runtime)).toEqual([]);
  });

  it('returns no errors for a manifest with ui_extensions and no conflicting features', () => {
    const runtime = buildRuntime({...baseManifest, ui_extensions: uiExtensions});
    expect(validateAppTypeSeparation(runtime)).toEqual([]);
  });

  it('rejects ui_extensions combined with sources', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      sources: {foo_source: {description: 'foo', schema: 'asset', function: {entry_point: 'FooSource'}}},
      ui_extensions: uiExtensions
    });
    expect(validateAppTypeSeparation(runtime)).toContain(
      'Invalid app.yml: ui_extensions cannot be combined with sources'
    );
  });

  it('rejects ui_extensions combined with destinations', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      destinations: {foo_dest: {entry_point: 'FooDest', description: 'foo', schema: 'asset'}},
      ui_extensions: uiExtensions
    });
    expect(validateAppTypeSeparation(runtime)).toContain(
      'Invalid app.yml: ui_extensions cannot be combined with destinations'
    );
  });

  it('rejects ui_extensions combined with OPAL tool functions', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      functions: {opal_fn: {entry_point: 'OpalFn', description: 'opal', opal_tool: true}},
      ui_extensions: uiExtensions
    });
    expect(validateAppTypeSeparation(runtime)).toContain(
      'Invalid app.yml: ui_extensions cannot be combined with opal_tool functions'
    );
  });

  it('returns all applicable errors when multiple conflicts exist', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      sources: {foo_source: {}},
      destinations: {foo_dest: {}},
      functions: {opal_fn: {entry_point: 'OpalFn', description: 'opal', opal_tool: true}},
      ui_extensions: uiExtensions
    });
    const errors = validateAppTypeSeparation(runtime);
    expect(errors).toContain('Invalid app.yml: ui_extensions cannot be combined with sources');
    expect(errors).toContain('Invalid app.yml: ui_extensions cannot be combined with destinations');
    expect(errors).toContain('Invalid app.yml: ui_extensions cannot be combined with opal_tool functions');
  });

  it('allows non-OPAL functions alongside ui_extensions', () => {
    const runtime = buildRuntime({
      ...baseManifest,
      functions: {regular_fn: {entry_point: 'Fn', description: 'fn', opal_tool: false}},
      ui_extensions: uiExtensions
    });
    expect(validateAppTypeSeparation(runtime)).toEqual([]);
  });
});
