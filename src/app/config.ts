import {existsSync} from 'fs';
import * as path from 'path';
import {pathToFileURL} from 'url';

import type {AppSdkPlugin} from './validation/plugins';

export type AppSdkPluginFactory<O = void> = (options?: O) => AppSdkPlugin;

export interface AppSdkConfig {
  plugins?: AppSdkPlugin[];
}

/**
 * The filenames Runtime.initialize and `loadAppSdkConfig` look for, in
 * priority order.
 */
export const OCP_APP_CONFIG_BASENAMES = ['ocp-app.config.mjs', 'ocp-app.config.js', 'ocp-app.config.cjs'] as const;

// TypeScript with module: "commonjs" rewrites dynamic `import()` into
// `require()` calls, which can't load .mjs or file:// URLs. Wrapping in
// `new Function` preserves a true ESM dynamic import at runtime. The body
// is a static literal, not user input, so the implied-eval risk doesn't apply.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<Record<string, unknown>>;

/**
 * Identity helper that gives users IDE completion when authoring
 * `ocp-app.config.mjs`. Mirrors Vite's `defineConfig` ergonomics.
 */
export function defineConfig(config: AppSdkConfig): AppSdkConfig {
  return config;
}

/**
 * Locates `ocp-app.config.{mjs,js,cjs}` under `dir`, dynamic-imports it,
 * and returns the resolved config. Returns an empty config if no file is
 * found — callers should fall back to running with no plugins.
 */
export async function loadAppSdkConfig(dir: string): Promise<AppSdkConfig> {
  const configPath = findConfigPath(dir);
  if (!configPath) {
    return {plugins: []};
  }

  const mod = await dynamicImport(pathToFileURL(configPath).href);
  const exported = (mod && (mod.default ?? mod)) as AppSdkConfig | (() => AppSdkConfig | Promise<AppSdkConfig>);
  const resolved = typeof exported === 'function' ? await exported() : exported;
  return resolved || {plugins: []};
}

function findConfigPath(dir: string): string | null {
  for (const name of OCP_APP_CONFIG_BASENAMES) {
    const candidate = path.resolve(dir, name);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
