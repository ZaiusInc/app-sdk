import {Function} from '../Function';
import {Runtime} from '../Runtime';

export async function validateFunctions(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  // Make sure all the functions listed in the manifest actually exist and are implemented
  if (runtime.manifest.functions) {
    for (const name of Object.keys(runtime.manifest.functions)) {
      let fnClass = null;
      try {
        fnClass = await runtime.getFunctionClass(name);
      } catch (e) {
        // Failed to load
      }
      if (!fnClass) {
        errors.push(`Entry point not found for function: ${name}`);
      } else if (!(fnClass.prototype instanceof Function)) {
        errors.push(
          `Function entry point does not extend App.Function: ${runtime.manifest.functions![name].entry_point}`
        );
      } else if (typeof (fnClass.prototype.perform) !== 'function') {
        errors.push(
          `Function entry point is missing the perform method: ${runtime.manifest.functions![name].entry_point}`
        );
      }
    }
  }

  return errors;
}
