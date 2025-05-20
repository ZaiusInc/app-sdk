import { SourceFunction } from '../SourceFunction';
import { Runtime } from '../Runtime';
import * as fs from 'fs';
import { join } from 'path';

const SOURCE_FUNCTION_LIFECYCLE_METHODS = [
  'onSourceCreate', 'onSourceUpdate', 'onSourceDelete', 'onSourceEnable', 'onSourcePause'];

export async function validateSources(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  // Make sure all the sources listed in the manifest actually exist and are implemented
  if (runtime.manifest.sources) {
    for (const name of Object.keys(runtime.manifest.sources)) {
      errors.push(...(await validateFunction(runtime, name)));
      errors.push(...(await validateSchema(runtime, name)));
    }
  }

  return errors;
}

async function validateSchema(runtime: Runtime, name: string) {
  const errors: string[] = [];
  const source = runtime.manifest.sources?.[name];
  if (!source || !source.schema) {
    errors.push(`Source is missing the schema property: ${name}`);
  } else {
    const schema = source.schema;
    const schemaFilePath = join(runtime.baseDir, 'sources', 'schema', schema);
    if (typeof (schema) !== 'string') {
      errors.push(`Source schema property must be a string: ${name}`);
    } else if (schema.trim() === '') {
      errors.push(`Source schema property cannot be empty: ${name}`);
    } else if (!(fs.existsSync(schemaFilePath + '.yml') || fs.existsSync(schemaFilePath + '.yaml'))) {
      errors.push(`File not found for Source schema ${schema}`);
    }
  }
  return errors;
}

async function validateFunction(runtime: Runtime, name: string) {
  const errors: string[] = [];
  const source = runtime.manifest.sources?.[name];
  let sourceClass = null;
  let errorMessage: string | null = null;
  try {
    sourceClass = await runtime.getSourceFunctionClass(name);
  } catch (e: any) {
    errorMessage = e;
  }
  if (!source || !sourceClass) {
    errors.push(`Error loading entry point ${name}. ${errorMessage}`);
  } else if (!(sourceClass.prototype instanceof SourceFunction)) {
    errors.push(
      `SourceFunction entry point does not extend App.SourceFunction: ${source.webhook?.entry_point}`
    );
  } else {
    for (const method of SOURCE_FUNCTION_LIFECYCLE_METHODS) {
      if (typeof ((sourceClass.prototype as any)[method]) !== 'function') {
        errors.push(
          `SourceFunction entry point is missing the ${method} method: ${source.webhook?.entry_point}`
        );
      }
    }
  }
  return errors;
}
