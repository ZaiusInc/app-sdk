import {Schema} from '@zaiusinc/app-forms-schema';
import fs from 'fs';
import * as jsYaml from 'js-yaml';
import * as path from 'path';

import {Runtime} from '../Runtime';
import {SettingsDataSource} from '../SettingsDataSource';
import {getLoadErrorDetails} from './entryPointErrors';

export async function validateSettingsDataSources(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  for (const {field, dataSource} of appDataSources(runtime)) {
    if (!dataSource.function === !dataSource.entry_point) {
      errors.push(`Data source for ${field} must set either function or entry_point`);
      continue;
    }
    if (!dataSource.entry_point) {
      continue;
    }
    const entryPoint = dataSource.entry_point;
    let loadErrorDetails = 'not found';
    const exported = await runtime.getSettingsDataSource(entryPoint).catch((e: any) => {
      loadErrorDetails = getLoadErrorDetails(e);
      return undefined;
    });
    if (!exported) {
      errors.push(`Error loading settings data source ${entryPoint} for ${field}. Error: ${loadErrorDetails}`);
    } else if (typeof exported !== 'function') {
      errors.push(`Settings data source ${entryPoint} for ${field} must be a function or a class`);
    } else if (isClass(exported) && !(exported.prototype instanceof SettingsDataSource)) {
      errors.push(`Settings data source ${entryPoint} for ${field} must extend App.SettingsDataSource`);
    }
  }

  return errors;
}

// The `type: app` data sources in forms/settings.yml, read from where validateAssets reads it.
function appDataSources(runtime: Runtime): Array<{field: string; dataSource: Schema.AppDataSource}> {
  const formPath = path.join(path.resolve(runtime.baseDir, '../'), 'forms', 'settings.yml');
  if (!fs.existsSync(formPath)) {
    return [];
  }
  const form = jsYaml.load(fs.readFileSync(formPath, 'utf8')) as Schema.Form | undefined;
  const found: Array<{field: string; dataSource: Schema.AppDataSource}> = [];
  for (const section of form?.sections ?? []) {
    if (!('elements' in section) || !Array.isArray(section.elements)) {
      continue;
    }
    for (const element of section.elements) {
      const dataSource = 'dataSource' in element ? element.dataSource : undefined;
      if (dataSource?.type === 'app') {
        found.push({field: `${section.key}.${element.key}`, dataSource});
      }
    }
  }
  return found;
}

// A function or a class: typeof says 'function' for both. Match the keyword, since an arrow function like
// `classes => ...` also starts with 'class'.
function isClass(value: unknown): boolean {
  return /^class[\s{]/.test(Function.prototype.toString.call(value));
}
