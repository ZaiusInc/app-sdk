import 'jest';

import {buildManifestSchema, runPluginValidators, type AppSdkPlugin} from '../plugins';

describe('validation plugins', () => {
  describe('buildManifestSchema', () => {
    it('merges plugin schema properties into manifest schema', () => {
      const plugins: AppSdkPlugin[] = [
        {
          id: 'ui-extensions',
          manifestSchema: {
            properties: {
              ui_extensions: {
                type: 'object'
              }
            }
          }
        }
      ];

      const schema = buildManifestSchema(plugins);

      expect(schema.properties).toBeDefined();
      expect((schema.properties as Record<string, unknown>)['ui_extensions']).toEqual({type: 'object'});
    });

    it('adds non-root fragment constraints under allOf', () => {
      const plugins: AppSdkPlugin[] = [
        {
          id: 'meta-version-guard',
          manifestSchema: {
            if: {
              properties: {
                runtime: {
                  const: 'node22'
                }
              }
            },
            then: {
              properties: {
                meta: {
                  properties: {
                    version: {
                      pattern: '^\\d+\\.\\d+\\.\\d+$'
                    }
                  }
                }
              }
            }
          }
        }
      ];

      const schema = buildManifestSchema(plugins);
      expect((schema as any).if).toBeDefined();
      expect((schema as any).then).toBeDefined();
    });

    it('throws on conflicting property definitions across plugins', () => {
      const plugins: AppSdkPlugin[] = [
        {
          id: 'plugin-a',
          manifestSchema: {
            properties: {
              ui_extensions: {
                type: 'object',
                additionalProperties: false
              }
            }
          }
        },
        {
          id: 'plugin-b',
          manifestSchema: {
            properties: {
              ui_extensions: {
                type: 'array'
              }
            }
          }
        }
      ];

      expect(() => buildManifestSchema(plugins)).toThrow();
    });
  });

  describe('runPluginValidators', () => {
    it('runs all plugin validators and collects errors', async () => {
      const runtime = {} as any;
      const plugins: AppSdkPlugin[] = [
        {
          id: 'plugin-a',
          validators: [() => ['plugin a error 1'], async () => ['plugin a error 2']]
        },
        {
          id: 'plugin-b',
          validators: [() => []]
        }
      ];

      const errors = await runPluginValidators(runtime, plugins);

      expect(errors).toEqual(['plugin a error 1', 'plugin a error 2']);
    });
  });
});
