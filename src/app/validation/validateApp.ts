import {ErrorObject} from 'ajv';
import Ajv from 'ajv';

import {Runtime} from '../Runtime';
import * as manifestSchema from '../types/AppManifest.schema.json';
import * as destinationSchema from '../types/DestinationSchema.schema.json';
import * as schemaObjectSchema from '../types/SchemaObject.schema.json';
import * as sourceSchema from '../types/SourceSchema.schema.json';
import {buildManifestSchema, runPluginValidators} from './plugins';
import {validateAssets} from './validateAssets';
import {validateChannel} from './validateChannel';
import {validateDestinations} from './validateDestinations';
import {validateDestinationsSchema} from './validateDestinationsSchema';
import {validateEnvironment} from './validateEnvironment';
import {validateFunctions} from './validateFunctions';
import {validateJobs} from './validateJobs';
import {validateLifecycle} from './validateLifecycle';
import {validateLiquidExtensions} from './validateLiquidExtensions';
import {validateMeta} from './validateMeta';
import {validateOutboundDomains} from './validateOutboundDomains';
import {validateSchemaObject} from './validateSchemaObject';
import {validateSources} from './validateSources';
import {validateSourcesSchema} from './validateSourcesSchema';

/**
 * Validates that all of the required pieces of the app are accounted for.
 *
 * @return array of error messages, if there were any, otherwise an empty array
 */
export async function validateApp(runtime: Runtime, baseObjectNames?: string[]): Promise<string[]> {
  let errors: string[] = [];
  const plugins = runtime.plugins;

  const ajv = new Ajv({allErrors: true, allowUnionTypes: true});
  const manifestValidationSchema = plugins.length > 0 ? buildManifestSchema(plugins) : manifestSchema;
  if (!ajv.validate(manifestValidationSchema, runtime.manifest)) {
    ajv.errors?.forEach((e: ErrorObject) => errors.push(formatAjvError('app.yml', e)));
  } else {
    errors = errors
      .concat(await validateMeta(runtime))
      .concat(validateEnvironment(runtime))
      .concat(await validateFunctions(runtime))
      .concat(await validateJobs(runtime))
      .concat(await validateDestinations(runtime))
      .concat(await validateSources(runtime))
      .concat(await validateLiquidExtensions(runtime))
      .concat(await validateLifecycle(runtime))
      .concat(await validateChannel(runtime))
      .concat(await validateAssets(runtime))
      .concat(validateOutboundDomains(runtime))
      .concat(validateAppTypeSeparation(runtime));
  }

  if (runtime.manifest.destinations) {
    const destinationSchemaObjects = runtime.getDestinationSchema();
    for (const file of Object.keys(destinationSchemaObjects)) {
      const destinationSchemaObject = destinationSchemaObjects[file];
      if (!ajv.validate(destinationSchema, destinationSchemaObject)) {
        ajv.errors?.forEach((e: ErrorObject) => errors.push(formatAjvError(file, e)));
      } else {
        errors = errors.concat(validateDestinationsSchema(destinationSchemaObject, file));
      }
    }
  }

  if (runtime.manifest.sources) {
    const sourceSchemaObjects = runtime.getSourceSchema();
    for (const file of Object.keys(sourceSchemaObjects)) {
      const sourceSchemaObject = sourceSchemaObjects[file];
      if (!ajv.validate(sourceSchema, sourceSchemaObject)) {
        ajv.errors?.forEach((e: ErrorObject) => errors.push(formatAjvError(file, e)));
      } else {
        errors = errors.concat(validateSourcesSchema(sourceSchemaObject, file));
      }
    }
  }

  const schemaObjects = runtime.getSchemaObjects();
  for (const file of Object.keys(schemaObjects)) {
    const schemaObject = schemaObjects[file];
    if (!ajv.validate(schemaObjectSchema, schemaObject)) {
      ajv.errors?.forEach((e: ErrorObject) => errors.push(formatAjvError(file, e)));
    } else {
      errors = errors.concat(validateSchemaObject(runtime, schemaObject, file, baseObjectNames));
    }
  }

  errors = errors.concat(await runPluginValidators(runtime, plugins));

  return errors;
}

export function validateAppTypeSeparation(runtime: Runtime): string[] {
  const errors: string[] = [];
  const manifest = runtime.manifest as Record<string, unknown>;
  const uiExtensions = manifest['ui_extensions'];
  const hasUiExtensions =
    uiExtensions != null && typeof uiExtensions === 'object' && Object.keys(uiExtensions).length > 0;

  if (hasUiExtensions) {
    if (runtime.manifest.sources && Object.keys(runtime.manifest.sources).length > 0) {
      errors.push('Invalid app.yml: ui_extensions cannot be combined with sources');
    }
    if (runtime.manifest.destinations && Object.keys(runtime.manifest.destinations).length > 0) {
      errors.push('Invalid app.yml: ui_extensions cannot be combined with destinations');
    }
    const hasOpalTools = Object.values(runtime.manifest.functions ?? {}).some((fn) => fn.opal_tool === true);
    if (hasOpalTools) {
      errors.push('Invalid app.yml: ui_extensions cannot be combined with opal_tool functions');
    }
  }

  return errors;
}

function formatAjvError(file: string, e: ErrorObject): string {
  const adjustedDataPath =
    e.instancePath.length > 0 ? e.instancePath.substring(1).replace(/\['([^']+)']/, '.$1') + ' ' : '';
  let message = e.message?.replace(/\bshould\b/, 'must') ?? '';
  if (e.params && Object.keys(e.params).length > 0) {
    const paramsStr = Object.entries(e.params)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
    message += ` (${paramsStr})`;
  }
  return `Invalid ${file}: ${adjustedDataPath}${message}`;
}
