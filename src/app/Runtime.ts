import {Ajv} from 'ajv';
import {readFileSync} from 'fs';
import {join} from 'path';
import {Lifecycle, LIFECYCLE_REQUIRED_METHODS} from './Lifecycle';
import {AppManifest} from './types';
import {Function} from './Function';
import * as manifestSchema from './types/AppManifest.schema.json';

interface SerializedRuntime {
  manifest: AppManifest;
  dirName: string;
}

export class Runtime {
  public static async initialize(dirName: string) {
    const runtime = new Runtime();
    await runtime.initialize(dirName);
    return runtime;
  }

  public static fromJson(serializedRuntime: string) {
    const data = JSON.parse(serializedRuntime) as SerializedRuntime;
    const runtime = new Runtime();
    Object.assign(runtime, data);
    return runtime;
  }

  private manifest!: AppManifest;
  private dirName!: string;

  public async getFunctionClass(name: string) {
    const functions = this.manifest.functions;
    if (!functions || !functions[name]) {
      throw new Error(`No function named ${name} defined in manifest`);
    }

    const fn = functions[name];
    return (await this.import(join(this.dirName, 'functions', fn.entry_point)))[fn.entry_point];
  }

  public async getLifecycleClass() {
    return (await this.import(join(this.dirName, 'lifecycle', 'Lifecycle')))['Lifecycle'];
  }

  public toJson() {
    return JSON.stringify({
      manifest: this.manifest,
      dirName: this.dirName
    } as SerializedRuntime);
  }

  /**
   * Validates that all of the required pieces of the app are accounted for.
   *
   * @return array of error messages, if there were any, otherwise an empty array
   */
  public async validate(): Promise<string[]> {
    const errors: string[] = [];

    // Make sure all the functions listed in the manifest actually exist and are implemented
    if (this.manifest.functions) {
      for (const name of Object.keys(this.manifest.functions)) {
        let fnClass = null;
        try {
          fnClass = await this.getFunctionClass(name);
        } catch (e) {
          console.error(e);
        }
        if (!fnClass) {
          errors.push(`Entry point not found for function: ${name}`);
        } else if (!(fnClass.prototype instanceof Function)) {
          errors.push(
            `Function entry point does not extend App.Function: ${this.manifest.functions![name].entry_point}`
          );
        } else if (typeof(fnClass.prototype.perform) !== 'function') {
          errors.push(
            `Function entry point is missing the perform method: ${this.manifest.functions![name].entry_point}`
          );
        }
      }
    }

    // Make sure the lifecycle exists and is implemented
    let lcClass = null;
    try {
      lcClass = await this.getLifecycleClass();
    } catch (e) {
      console.error(e);
    }
    if (!lcClass) {
      errors.push('Lifecycle implementation not found');
    } else if (!(lcClass.prototype instanceof Lifecycle)) {
      errors.push('Lifecycle implementation does not extend App.Lifecycle');
    } else {
      for (const method of LIFECYCLE_REQUIRED_METHODS) {
        if (typeof(lcClass.prototype[method]) !== 'function') {
          errors.push(`Lifecycle implementation is missing the ${method} method`);
        }
      }
    }

    return errors;
  }

  // necessary for test purposes
  private async import(path: string) {
    return await import(path);
  }

  private async initialize(dirName: string) {
    this.dirName = dirName;
    // dynamically import libraries only needed on the main thread so we don't also load them on worker threads
    const ajv: Ajv = new (require('ajv') as any)();
    const manifest = (await import('js-yaml')).safeLoad(
      readFileSync(join(dirName, 'app.yml'), 'utf8')
    ) as unknown;

    if (!this.validateManifest(ajv, manifest)) {
      throw new Error('Invalid app.yml manifest (failed JSON schema validation)');
    }

    this.manifest = manifest;
  }

  private validateManifest(ajv: Ajv, manifest: unknown): manifest is AppManifest {
    return ajv.validate(manifestSchema, manifest) as boolean;
  }
}
