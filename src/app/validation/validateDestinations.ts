import fs from 'fs';
import {join} from 'path';

import {Destination} from '../Destination';
import {DestinationSchemaFunction} from '../DestinationSchemaFunction';
import {Runtime} from '../Runtime';
import {getLoadErrorDetails, withManifestLine} from './entryPointErrors';
import {loadManifestSource} from './manifestSource';

export async function validateDestinations(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];
  const manifestSource = loadManifestSource(runtime.baseDir);

  // Make sure all the destinations listed in the manifest actually exist and are implemented
  if (runtime.manifest.destinations) {
    for (const name of Object.keys(runtime.manifest.destinations)) {
      let destinationClass = null;
      let loadErrorDetails = 'not found';
      try {
        destinationClass = await runtime.getDestinationClass(name);
      } catch (e: any) {
        loadErrorDetails = getLoadErrorDetails(e);
      }
      if (!destinationClass) {
        const entryPoint = runtime.manifest.destinations[name].entry_point;
        errors.push(
          withManifestLine({
            manifestSource,
            pathSegments: ['destinations', name, 'entry_point'],
            message: `Error loading entry point ${entryPoint}. Error: ${loadErrorDetails}`
          })
        );
      } else if (!(destinationClass.prototype instanceof Destination)) {
        errors.push(
          `Destination entry point does not extend App.Destination: ${runtime.manifest.destinations[name].entry_point}`
        );
      } else {
        if (typeof destinationClass.prototype.ready !== 'function') {
          errors.push(
            `Destination entry point is missing the prepare method: ${runtime.manifest.destinations[name].entry_point}`
          );
        }
        if (typeof destinationClass.prototype.deliver !== 'function') {
          errors.push(
            `Destination entry point is missing the perform method: ${runtime.manifest.destinations[name].entry_point}`
          );
        }
      }

      const schema = runtime.manifest.destinations[name].schema;
      if (!schema) {
        errors.push(`Destination is missing the schema property: ${name}`);
      } else {
        if (typeof schema !== 'object') {
          const schemaFilePath = join(runtime.baseDir, 'destinations', 'schema', schema);
          if (typeof schema !== 'string') {
            errors.push(`Destination schema property must be a string or an object: ${name}`);
          } else if (schema.trim() === '') {
            errors.push(`Destination schema property cannot be empty: ${name}`);
          } else if (!(fs.existsSync(schemaFilePath + '.yml') || fs.existsSync(schemaFilePath + '.yaml'))) {
            errors.push(`File not found for Destination schema ${schema}`);
          }
        } else if (schema.entry_point) {
          let destinationSchemaFunction = null;
          try {
            destinationSchemaFunction = await runtime.getDestinationSchemaFunctionClass(name);
          } catch (e: any) {
            const loadSchemaErrorDetails = getLoadErrorDetails(e);
            errors.push(
              withManifestLine({
                manifestSource,
                pathSegments: ['destinations', name, 'schema', 'entry_point'],
                message: `Error loading DestinationSchemaFunction entry point ${schema.entry_point}. Error: ${loadSchemaErrorDetails}`
              })
            );
          }
          if (destinationSchemaFunction) {
            if (!(destinationSchemaFunction.prototype instanceof DestinationSchemaFunction)) {
              errors.push(
                'DestinationSchemaFunction entry point does not extend App.DestinationSchemaFunction: ' +
                  `${schema.entry_point}`
              );
            } else if (typeof (destinationSchemaFunction.prototype as any)['getDestinationsSchema'] !== 'function') {
              errors.push(
                'DestinationSchemaFunction entry point is missing the getDestinationsSchema method: ' +
                  `${schema.entry_point}`
              );
            }
          }
        }
      }

      // Validate supports_delete if present
      const supportsDelete = runtime.manifest.destinations[name].supports_delete;
      if (supportsDelete !== undefined) {
        if (typeof supportsDelete !== 'boolean') {
          errors.push(`Destination supports_delete must be a boolean: ${name}`);
        }
      }
    }
  }

  return errors;
}
