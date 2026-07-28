import type {JSONSchema7} from 'json-schema';
import mergeAllOf from 'json-schema-merge-allof';

import type {Runtime} from '../Runtime';
import manifestSchema from '../types/AppManifest.schema.json';

export type ManifestSchemaFragment = JSONSchema7;

export type AppValidator = (runtime: Runtime) => Promise<string[] | void> | string[] | void;

export interface AppSdkPlugin {
  id: string;
  exclusive?: boolean;
  manifestSchema?: ManifestSchemaFragment;
  validators?: AppValidator[];
}

function cloneSchema<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function buildManifestSchema(plugins: readonly AppSdkPlugin[] = []): JSONSchema7 {
  const schemas: JSONSchema7[] = [cloneSchema(manifestSchema) as JSONSchema7];

  for (const plugin of plugins) {
    if (plugin.manifestSchema) {
      schemas.push(cloneSchema(plugin.manifestSchema));
    }
  }

  return mergeAllOf(
    {
      allOf: schemas
    },
    {
      ignoreAdditionalProperties: true
    }
  ) as JSONSchema7;
}

export function validateExclusivePlugins(runtime: Runtime, plugins: readonly AppSdkPlugin[] = []): string[] {
  const exclusivePlugin = plugins.find((p) => p.exclusive);
  if (!exclusivePlugin) return [];

  const errors: string[] = [];
  const manifest = runtime.manifest;
  const id = exclusivePlugin.id;

  if (manifest.sources && Object.keys(manifest.sources).length > 0) {
    errors.push(`Invalid app.yml: '${id}' cannot be combined with sources`);
  }
  if (manifest.destinations && Object.keys(manifest.destinations).length > 0) {
    errors.push(`Invalid app.yml: '${id}' cannot be combined with destinations`);
  }
  const hasOpalTools = Object.values(manifest.functions ?? {}).some((fn) => fn.opal_tool === true);
  if (hasOpalTools) {
    errors.push(`Invalid app.yml: '${id}' cannot be combined with opal_tool functions`);
  }

  return errors;
}

export async function runPluginValidators(runtime: Runtime, plugins: readonly AppSdkPlugin[] = []): Promise<string[]> {
  const errors: string[] = [];

  for (const plugin of plugins) {
    for (const validator of plugin.validators || []) {
      const result = await validator(runtime);
      if (result && result.length > 0) {
        errors.push(...result);
      }
    }
  }

  return errors;
}
