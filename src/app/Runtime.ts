import {Ajv} from 'ajv';
import {readFileSync} from 'fs';
import {join} from 'path';
import {Function} from './Function';
import {Job, JobInvocation} from './Job';
import {Request} from './lib/Request';
import {Lifecycle, LIFECYCLE_REQUIRED_METHODS} from './Lifecycle';
import {AppManifest} from './types';
import * as manifestSchema from './types/AppManifest.schema.json';
import deepFreeze = require('deep-freeze');

interface SerializedRuntime {
  appManifest: AppManifest;
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

  private appManifest!: Readonly<AppManifest>;
  private dirName!: string;

  public get manifest(): Readonly<AppManifest> {
    return this.appManifest;
  }

  // tslint:disable-next-line:ban-types
  public async getFunctionClass<T extends Function>(name: string): Promise<new (request: Request) => T> {
    const functions = this.manifest.functions;
    if (!functions || !functions[name]) {
      throw new Error(`No function named ${name} defined in manifest`);
    }

    const fn = functions[name];
    return (await this.import(join(this.dirName, 'functions', fn.entry_point)))[fn.entry_point];
  }

  public async getLifecycleClass<T extends Lifecycle>(): Promise<new () => T> {
    return (await this.import(join(this.dirName, 'lifecycle', 'Lifecycle')))['Lifecycle'];
  }

  public async getJobClass<T extends Job>(name: string): Promise<new (invocation: JobInvocation) => T> {
    const jobs = this.manifest.jobs;
    if (!jobs || !jobs[name]) {
      throw new Error(`No job named ${name} defined in manifest`);
    }

    const job = jobs[name];
    return (await this.import(join(this.dirName, 'jobs', job.entry_point)))[job.entry_point];
  }

  public toJson() {
    return JSON.stringify({
      appManifest: this.manifest,
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
          // Failed to load
        }
        if (!fnClass) {
          errors.push(`Entry point not found for function: ${name}`);
        } else if (!(fnClass.prototype instanceof Function)) {
          errors.push(
            `Function entry point does not extend App.Function: ${this.manifest.functions![name].entry_point}`
          );
        } else if (typeof (fnClass.prototype.perform) !== 'function') {
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
        if (typeof (lcClass.prototype as any)[method] !== 'function') {
          errors.push(`Lifecycle implementation is missing the ${method} method`);
        }
      }
    }

    // Make sure all the jobs listed in the manifest actually exist and are implemented
    if (this.manifest.jobs) {
      for (const name of Object.keys(this.manifest.jobs)) {
        let jobClass = null;
        try {
          jobClass = await this.getJobClass(name);
        } catch (e) {
          console.error(e);
        }
        if (!jobClass) {
          errors.push(`Entry point not found for job: ${name}`);
        } else if (!(jobClass.prototype instanceof Job)) {
          errors.push(
            `Job entry point does not extend App.Job: ${this.manifest.jobs![name].entry_point}`
          );
        } else {
          if (typeof (jobClass.prototype.prepare) !== 'function') {
            errors.push(
              `Job entry point is missing the prepare method: ${this.manifest.jobs![name].entry_point}`
            );
          }
          if (typeof (jobClass.prototype.perform) !== 'function') {
            errors.push(
              `Job entry point is missing the perform method: ${this.manifest.jobs![name].entry_point}`
            );
          }
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

    this.appManifest = deepFreeze(manifest) as AppManifest;
  }

  private validateManifest(ajv: Ajv, manifest: unknown): manifest is AppManifest {
    return ajv.validate(manifestSchema, manifest) as boolean;
  }
}
