import type {JSONSchema7} from 'json-schema';
import mergeAllOf from 'json-schema-merge-allof';

import type {Runtime} from '../Runtime';
import {AppFunction, FunctionAccepts} from '../types';
import manifestSchema from '../types/AppManifest.schema.json';

export type ManifestSchemaFragment = JSONSchema7;

export type AppValidator = (runtime: Runtime) => Promise<string[] | void> | string[] | void;

export interface AppSdkPlugin {
  id: string;
  requiredInstallationScope?: string;
  manifestSchema?: ManifestSchemaFragment;
  validators?: AppValidator[];
}

function cloneSchema<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Whether the function is a Mark tool: `accepts: agent_platform` or the deprecated `opal_tool: true`. */
export function isAgentPlatformTool(fn: AppFunction): boolean {
  return fn.opal_tool === true || fn.accepts === FunctionAccepts.AgentPlatform;
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

export function validatePluginCompatibility(runtime: Runtime, plugins: readonly AppSdkPlugin[] = []): string[] {
  const scopedPlugins = plugins.filter((p) => p.requiredInstallationScope);
  if (scopedPlugins.length === 0) return [];

  const errors: string[] = [];

  const uniqueScopes = [...new Set(scopedPlugins.map((p) => p.requiredInstallationScope))];
  if (uniqueScopes.length > 1) {
    const descriptions = scopedPlugins.map((p) => `'${p.id}' (${p.requiredInstallationScope})`).join(' and ');
    errors.push(
      `Invalid app.yml: plugins ${descriptions} can't be used together — they require different installation scopes`
    );
    return errors;
  }

  const manifest = runtime.manifest;
  const plugin = scopedPlugins[0];
  const error = `Invalid app.yml: plugin '${plugin.id}' requires ${plugin.requiredInstallationScope} installation scope and cannot be combined with`;

  if (manifest.sources && Object.keys(manifest.sources).length > 0) {
    errors.push(`${error} data sync sources`);
  }
  if (manifest.destinations && Object.keys(manifest.destinations).length > 0) {
    errors.push(`${error} data sync destinations`);
  }
  const hasAgentPlatformTools = Object.values(manifest.functions ?? {}).some(isAgentPlatformTool);
  if (hasAgentPlatformTools) {
    errors.push(`${error} Mark (Optimizely Agent Platform) tool functions`);
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
