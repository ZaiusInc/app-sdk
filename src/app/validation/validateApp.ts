import {ErrorObject} from 'ajv';
import * as Ajv from 'ajv';
import {Runtime} from '../Runtime';
import * as manifestSchema from '../types/AppManifest.schema.json';
import * as schemaObjectSchema from '../types/SchemaObject.schema.json';
import {validateFunctions} from './validateFunctions';
import {validateJobs} from './validateJobs';
import {validateLifecycle} from './validateLifecycle';
import {validateMeta} from './validateMeta';
import {validateSchemaObject} from './validateSchemaObject';

/**
 * Validates that all of the required pieces of the app are accounted for.
 *
 * @return array of error messages, if there were any, otherwise an empty array
 */
export async function validateApp(runtime: Runtime, baseObjectNames?: string[]): Promise<string[]> {
  let errors: string[] = [];

  const ajv = new Ajv({allErrors: true});
  if (!ajv.validate(manifestSchema, runtime.manifest)) {
    ajv.errors!.forEach((e: ErrorObject) => errors.push(formatAjvError('app.yml', e)));
  } else {
    errors = errors.concat(validateMeta(runtime))
      .concat(await validateFunctions(runtime))
      .concat(await validateJobs(runtime))
      .concat(await validateLifecycle(runtime));
  }

  const schemaObjects = runtime.getSchemaObjects();
  for (const file of Object.keys(schemaObjects)) {
    const schemaObject = schemaObjects[file];
    if (!ajv.validate(schemaObjectSchema, schemaObject)) {
      ajv.errors!.forEach((e: ErrorObject) => errors.push(formatAjvError(file, e)));
    } else {
      errors = errors.concat(validateSchemaObject(runtime, schemaObject, file, baseObjectNames));
    }
  }

  return errors;
}

function formatAjvError(file: string, e: ErrorObject): string {
  const adjustedDataPath = e.dataPath.length > 0 ? e.dataPath.substring(1).replace(/\['([^']+)']/, '.$1') + ' ' : '';
  return `Invalid ${file}: ${adjustedDataPath}${e.message!.replace(/\bshould\b/, 'must')}`;
}
