import {ErrorObject} from 'ajv';
import Ajv from 'ajv';
import {Runtime} from '../Runtime';
import * as manifestSchema from '../types/AppManifest.schema.json';
import * as schemaObjectSchema from '../types/SchemaObject.schema.json';
import {validateChannel} from './validateChannel';
import {validateEnvironment} from './validateEnvironment';
import {validateFunctions} from './validateFunctions';
import {validateJobs} from './validateJobs';
import {validateDestinations} from './validateDestinations';
import {validateLifecycle} from './validateLifecycle';
import {validateLiquidExtensions} from './validateLiquidExtensions';
import {validateMeta} from './validateMeta';
import {validateSchemaObject} from './validateSchemaObject';
import {validateAssets} from './validateAssets';
import {validateOutboundDomains} from './validateOutboundDomains';
import * as destinationSchema from '../types/DestinationSchema.schema.json';
import { validateDestinationsSchema } from './validateDestinationsSchema';

/**
 * Validates that all of the required pieces of the app are accounted for.
 *
 * @return array of error messages, if there were any, otherwise an empty array
 */
export async function validateApp(runtime: Runtime, baseObjectNames?: string[]): Promise<string[]> {
  let errors: string[] = [];

  const ajv = new Ajv({allErrors: true, allowUnionTypes: true});
  if (!ajv.validate(manifestSchema, runtime.manifest)) {
    ajv.errors?.forEach((e: ErrorObject) => errors.push(formatAjvError('app.yml', e)));
  } else {
    errors = errors.concat(await validateMeta(runtime))
      .concat(validateEnvironment(runtime))
      .concat(await validateFunctions(runtime))
      .concat(await validateJobs(runtime))
      .concat(await validateDestinations(runtime))
      .concat(await validateLiquidExtensions(runtime))
      .concat(await validateLifecycle(runtime))
      .concat(await validateChannel(runtime))
      .concat(await validateAssets(runtime))
      .concat(validateOutboundDomains(runtime));
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
  const schemaObjects = runtime.getSchemaObjects();
  for (const file of Object.keys(schemaObjects)) {
    const schemaObject = schemaObjects[file];
    if (!ajv.validate(schemaObjectSchema, schemaObject)) {
      ajv.errors?.forEach((e: ErrorObject) => errors.push(formatAjvError(file, e)));
    } else {
      errors = errors.concat(validateSchemaObject(runtime, schemaObject, file, baseObjectNames));
    }
  }

  return errors;
}

function formatAjvError(file: string, e: ErrorObject): string {
  const adjustedDataPath =
    e.instancePath.length > 0 ? e.instancePath.substring(1).replace(/\['([^']+)']/, '.$1') + ' ' : '';
  return `Invalid ${file}: ${adjustedDataPath}${e.message?.replace(/\bshould\b/, 'must') ?? ''}`;
}
