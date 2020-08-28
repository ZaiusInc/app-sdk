import {Function} from '../Function';
import {GlobalFunction} from '../GlobalFunction';
import {FunctionClassNotFoundError, Runtime} from '../Runtime';

export async function validateFunctions(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  // Make sure all the functions listed in the manifest actually exist and are implemented
  if (runtime.manifest.functions) {
    for (const name of Object.keys(runtime.manifest.functions)) {
      const fnDefinition = runtime.manifest.functions[name];
      let fnClass = null;
      try {
        fnClass = await runtime.getFunctionClass(name);
      } catch (e) {
        if (!(e instanceof FunctionClassNotFoundError)) {
          errors.push(`Failed to load function class ${name}.  Error was: ${e.message}`);
          return errors;
        }
      }
      if (!fnClass) {
        errors.push(`Entry point not found for function: ${name}`);
      } else if (!fnDefinition.global && !(fnClass.prototype instanceof Function)) {
        errors.push(`Function entry point does not extend App.Function: ${fnDefinition.entry_point}`);
      } else if (fnDefinition.global && !(fnClass.prototype instanceof GlobalFunction)) {
        errors.push(`Global Function entry point does not extend App.GlobalFunction: ${fnDefinition.entry_point}`);
      } else if (typeof fnClass.prototype.perform !== 'function') {
        errors.push(`Function entry point is missing the perform method: ${fnDefinition.entry_point}`);
      }
    }
  }

  return errors;
}
