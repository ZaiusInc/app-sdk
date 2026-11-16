import {query as jsonPathQuery} from 'jsonpath-rfc9535';

import {Function} from '../Function';
import {GlobalFunction} from '../GlobalFunction';
import {FunctionClassNotFoundError, Runtime} from '../Runtime';
import {AppFunction, FunctionAccepts} from '../types';
import {getLoadErrorDetails, withManifestLine} from './entryPointErrors';
import {loadManifestSource} from './manifestSource';

export async function validateFunctions(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];
  const manifestSource = loadManifestSource(runtime.baseDir);

  // Make sure all the functions listed in the manifest actually exist and are implemented
  if (runtime.manifest.functions) {
    for (const name of Object.keys(runtime.manifest.functions)) {
      const fnDefinition = runtime.manifest.functions[name];
      let fnClass = null;
      let loadErrorDetails = 'not found';
      try {
        fnClass = await runtime.getFunctionClass(name);
      } catch (e: any) {
        if (!(e instanceof FunctionClassNotFoundError)) {
          loadErrorDetails = getLoadErrorDetails(e);
          return [
            withManifestLine({
              manifestSource,
              pathSegments: ['functions', name, 'entry_point'],
              message: `Error loading function class ${fnDefinition.entry_point}. Error: ${loadErrorDetails}`
            })
          ];
        }
      }
      if (!fnClass) {
        errors.push(
          withManifestLine({
            manifestSource,
            pathSegments: ['functions', name, 'entry_point'],
            message: `Error loading function class ${fnDefinition.entry_point}. Error: ${loadErrorDetails}`
          })
        );
      } else if (!fnDefinition.global && !(fnClass.prototype instanceof Function)) {
        errors.push(`Function entry point does not extend App.Function: ${fnDefinition.entry_point}`);
      } else if (fnDefinition.global && !(fnClass.prototype instanceof GlobalFunction)) {
        errors.push(`Global Function entry point does not extend App.GlobalFunction: ${fnDefinition.entry_point}`);
      } else if (typeof fnClass.prototype.perform !== 'function') {
        errors.push(`Function entry point is missing the perform method: ${fnDefinition.entry_point}`);
      }
      if (fnDefinition.global && fnDefinition.accepts === FunctionAccepts.CmsUiExtension) {
        errors.push('Global functions cannot have accepts: cms_ui_extension');
      }
      const installationResolutionErrors = await validateInstallationResolution(fnDefinition);
      if (installationResolutionErrors.length) {
        errors.push(...installationResolutionErrors);
      }
    }
  }

  return errors;
}

async function validateInstallationResolution(definition: AppFunction): Promise<string[]> {
  if (definition.global && definition.installation_resolution) {
    return ['Global functions cannot define a installation_resolution'];
  }

  if (definition.accepts === FunctionAccepts.CmsUiExtension && definition.installation_resolution) {
    return ['Functions with accepts: cms_ui_extension cannot define installation_resolution'];
  }

  if (definition.installation_resolution) {
    const {type, key} = definition.installation_resolution;
    if (type === 'JSON_BODY_FIELD') {
      try {
        jsonPathQuery({}, key);
      } catch (e: any) {
        return [`Invalid JSON path expression: ${e.message}`];
      }
    }
  }
  return [];
}
