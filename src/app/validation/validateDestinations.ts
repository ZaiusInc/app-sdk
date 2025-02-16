import {logger} from '../../logging';
import {Destination} from '../Destination';
import {Runtime} from '../Runtime';
import * as fs from 'fs';
import {join} from 'path';

export async function validateDestinations(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  // Make sure all the data_exports listed in the manifest actually exist and are implemented
  if (runtime.manifest.destinations) {
    for (const name of Object.keys(runtime.manifest.destinations)) {
      let destinationClass = null;
      let errorMessage: string | null = null;
      try {
        destinationClass = await runtime.getDestinationClass(name);
      } catch (e: any) {
        errorMessage = e;
        logger.error(e);
      }
      if (!destinationClass) {
        errors.push(`Error loading entry point ${name}. ${errorMessage}`);
      } else if (!(destinationClass.prototype instanceof Destination)) {
        errors.push(
          `DataExport entry point does not extend App.DataExport: ${runtime.manifest.destinations[name].entry_point}`
        );
      } else {
        if (typeof (destinationClass.prototype.ready) !== 'function') {
          errors.push(
            `DataExport entry point is missing the prepare method: ${runtime.manifest.destinations[name].entry_point}`
          );
        }
        if (typeof (destinationClass.prototype.deliver) !== 'function') {
          errors.push(
            `DataExport entry point is missing the perform method: ${runtime.manifest.destinations[name].entry_point}`
          );
        }
      }

      if (!runtime.manifest.destinations[name].schema) {
        errors.push(`DataExport is missing the schema property: ${name}`);
      } else {
        const schema = runtime.manifest.destinations[name].schema;
        const schemaFilePath = join(runtime.baseDir, 'data-exports', 'schema', schema);
        if (typeof(schema) !== 'string') {
          errors.push(`DataExport schema property must be a string: ${name}`);
        } else if (schema.trim() === '') {
          errors.push(`DataExport schema property cannot be empty: ${name}`);
        } else if (!(fs.existsSync(schemaFilePath + '.yml') || fs.existsSync(schemaFilePath + '.yaml'))) {
          errors.push(`File not found for DataExport schema ${schema}`);
        }
      }
    }
  }

  return errors;
}
