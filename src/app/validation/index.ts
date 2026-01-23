import chalk from 'chalk';
import * as path from 'path';

import {Runtime} from '../Runtime';
import {validateApp} from './validateApp';

export {validateApp} from './validateApp';

/**
 * Options for running app validation.
 */
export interface RunValidationOptions {
  /**
   * The base directory containing the app. Defaults to process.cwd().
   */
  baseDir?: string;

  /**
   * The directory containing the built app relative to baseDir. Defaults to 'dist'.
   */
  distDir?: string;

  /**
   * Whether to suppress console output. Defaults to false.
   */
  silent?: boolean;

  /**
   * Base object names to validate against.
   */
  baseObjectNames?: string[];
}

/**
 * Result of running app validation.
 */
export interface ValidationResult {
  /**
   * Whether the validation passed (no errors).
   */
  success: boolean;

  /**
   * Array of error messages. Empty if validation passed.
   */
  errors: string[];
}

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
  const {baseDir = process.cwd(), distDir = 'dist', silent = false, baseObjectNames} = options;

  const appPath = path.resolve(baseDir, distDir);

  try {
    const runtime = await Runtime.initialize(appPath, true);
    const errors = await validateApp(runtime, baseObjectNames);

    if (errors.length > 0) {
      if (!silent) {
        console.error(chalk.red(`Validation failed:\n${errors.map((e) => ` * ${e}`).join('\n')}`));
      }
      return {success: false, errors};
    } else {
      if (!silent) {
        console.log(chalk.green('Looks good to me'));
      }
      return {success: true, errors: []};
    }
  } catch (e: any) {
    const errorMessage = `Validation process failed: ${e.message}`;
    if (!silent) {
      console.error(chalk.red(errorMessage));
    }
    return {success: false, errors: [errorMessage]};
  }
}
