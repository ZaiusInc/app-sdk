import {LiquidExtension} from '../LiquidExtension';
import {Runtime} from '../Runtime';
import {getLoadErrorDetails, withManifestLine} from './entryPointErrors';
import {loadManifestSource} from './manifestSource';

export async function validateLiquidExtensions(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];
  const manifestSource = loadManifestSource(runtime.baseDir);

  // Make sure all the liquid extensions listed in the manifest actually exist and are implemented
  if (runtime.manifest.liquid_extensions) {
    for (const name of Object.keys(runtime.manifest.liquid_extensions)) {
      let extClass = null;
      let loadErrorDetails = 'not found';
      try {
        extClass = await runtime.getLiquidExtensionClass(name);
      } catch (e: any) {
        loadErrorDetails = getLoadErrorDetails(e);
      }
      if (!extClass) {
        const entryPoint = runtime.manifest.liquid_extensions[name].entry_point;
        errors.push(
          withManifestLine({
            manifestSource,
            pathSegments: ['liquid_extensions', name, 'entry_point'],
            message: `Error loading entry point for liquid extension ${entryPoint}. Error: ${loadErrorDetails}`
          })
        );
      } else if (!(extClass.prototype instanceof LiquidExtension)) {
        errors.push(
          'Liquid Extension entry point does not extend App.LiquidExtension: ' +
            runtime.manifest.liquid_extensions[name].entry_point
        );
      } else if (typeof extClass.prototype.perform !== 'function') {
        errors.push(
          'Liquid Extension entry point is missing the perform method: ' +
            runtime.manifest.liquid_extensions[name].entry_point
        );
      }
    }
  }

  return errors;
}
