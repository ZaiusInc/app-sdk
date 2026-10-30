import type {Runtime} from '../Runtime';
import type {RunValidationOptions, ValidationResult} from './index';

export type {RunValidationOptions, ValidationResult} from './index';

// Validation is build-time only, but the package root is imported by every function and job process. These
// wrappers keep the public API on the root while loading the validation subtree (remark, lodash, jsonpath...)
// on first call. Nothing here may import a validation module at the top level.

/**
 * Runs validation on an OCP app.
 *
 * This is the primary API for validating an app programmatically.
 *
 * @example
 * ```typescript
 * import { runValidation } from '@zaiusinc/app-sdk';
 *
 * const result = await runValidation();
 * if (!result.success) {
 *   console.error('Validation failed:', result.errors);
 *   process.exit(1);
 * }
 * ```
 *
 * @param options - Configuration options for validation
 * @returns A promise that resolves to the validation result
 */
export async function runValidation(options: RunValidationOptions = {}): Promise<ValidationResult> {
  return (await import('./index')).runValidation(options);
}

/**
 * Validates an initialized app runtime and returns the list of errors (empty if the app is valid).
 *
 * @param runtime - The app runtime to validate
 * @param baseObjectNames - Base object names to validate against
 */
export async function validateApp(runtime: Runtime, baseObjectNames?: string[]): Promise<string[]> {
  return (await import('./validateApp')).validateApp(runtime, baseObjectNames);
}
