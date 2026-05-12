import {Lifecycle, LIFECYCLE_REQUIRED_METHODS} from '../Lifecycle';
import {Runtime} from '../Runtime';
import {getLoadErrorDetails} from './entryPointErrors';

export async function validateLifecycle(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  // Make sure the lifecycle exists and is implemented
  let lcClass = null;
  let loadErrorDetails = 'not found';
  try {
    lcClass = await runtime.getLifecycleClass();
  } catch (e: any) {
    loadErrorDetails = getLoadErrorDetails(e);
  }
  if (!lcClass) {
    errors.push(`Error loading Lifecycle implementation. Error: ${loadErrorDetails}`);
  } else if (!(lcClass.prototype instanceof Lifecycle)) {
    errors.push('Lifecycle implementation does not extend App.Lifecycle');
  } else {
    for (const method of LIFECYCLE_REQUIRED_METHODS) {
      if (typeof (lcClass.prototype as any)[method] !== 'function') {
        errors.push(`Lifecycle implementation is missing the ${method} method`);
      }
    }
  }

  return errors;
}
