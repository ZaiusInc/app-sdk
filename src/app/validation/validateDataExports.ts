import {logger} from '../../logging';
import {DataExport} from '../DataExport';
import {Runtime} from '../Runtime';
import * as fs from 'fs';

export async function validateDataExports(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  // Make sure all the data_exports listed in the manifest actually exist and are implemented
  if (runtime.manifest.data_exports) {
    for (const name of Object.keys(runtime.manifest.data_exports)) {
      let dataExportClass = null;
      let errorMessage: string | null = null;
      try {
        dataExportClass = await runtime.getDataExportClass(name);
      } catch (e: any) {
        errorMessage = e;
        logger.error(e);
      }
      if (!dataExportClass) {
        errors.push(`Error loading entry point ${name}. ${errorMessage}`);
      } else if (!(dataExportClass.prototype instanceof DataExport)) {
        errors.push(
          `DataExport entry point does not extend App.DataExport: ${runtime.manifest.data_exports[name].entry_point}`
        );
      } else {
        if (typeof (dataExportClass.prototype.ready) !== 'function') {
          errors.push(
            `DataExport entry point is missing the prepare method: ${runtime.manifest.data_exports[name].entry_point}`
          );
        }
        if (typeof (dataExportClass.prototype.deliver) !== 'function') {
          errors.push(
            `DataExport entry point is missing the perform method: ${runtime.manifest.data_exports[name].entry_point}`
          );
        }
      }

      if (!runtime.manifest.data_exports[name].schema) {
        errors.push(`DataExport is missing the schema property: ${name}`);
      } else {
        const schema = runtime.manifest.data_exports[name].schema;
        const schemaFilePath = runtime.baseDir + '/data-exports/schema/' + schema;
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
