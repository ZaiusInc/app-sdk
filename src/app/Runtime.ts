import {Ajv} from 'ajv';
import {readFileSync} from 'fs';
import * as jsYaml from 'js-yaml';
import {join} from 'path';
import {Function} from './Function';
import {Job, JobInvocation} from './Job';
import {Request} from './lib';
import {Lifecycle} from './Lifecycle';
import {AppManifest} from './types';
import * as manifestSchema from './types/AppManifest.schema.json';
import {SchemaObjects} from './types/SchemaObject';
import deepFreeze = require('deep-freeze');
import glob = require('glob');

interface SerializedRuntime {
  appManifest: AppManifest;
  dirName: string;
}

export class Runtime {
  /**
   * Initializes from a directory. Used during startup.
   * @param dirName the base directory of the app
   * @param skipJsonValidation for internal use, allows json-schema errors to be captured by the validation process
   */
  public static async initialize(dirName: string, skipJsonValidation: boolean = false) {
    const runtime = new Runtime();
    await runtime.initialize(dirName, skipJsonValidation);
    return runtime;
  }

  /**
   * Initializes from a pre-validated JSON definition. Used during task execution.
   * @param serializedRuntime JSON-serialized runtime definition
   */
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

  public getSchemaObjects(): SchemaObjects {
    const schemaObjects: SchemaObjects = {};
    const files = glob.sync('schema/*.yml', {cwd: this.dirName});
    if (files.length > 0) {
      for (const file of files) {
        schemaObjects[file] = jsYaml.safeLoad(readFileSync(join(this.dirName, file), 'utf8'));
      }
    }
    return schemaObjects;
  }

  public toJson() {
    return JSON.stringify({
      appManifest: this.manifest,
      dirName: this.dirName
    } as SerializedRuntime);
  }

  // necessary for test purposes
  private async import(path: string) {
    return await import(path);
  }

  private async initialize(dirName: string, skipJsonValidation: boolean) {
    this.dirName = dirName;
    // dynamically import libraries only needed on the main thread so we don't also load them on worker threads
    const manifest = (await import('js-yaml')).safeLoad(
      readFileSync(join(dirName, 'app.yml'), 'utf8')
    ) as unknown;

    if (!skipJsonValidation) {
      const ajv: Ajv = new (require('ajv') as any)();
      if (!ajv.validate(manifestSchema, manifest)) {
        throw new Error('Invalid app.yml manifest (failed JSON schema validation)');
      }
    }

    this.appManifest = deepFreeze(manifest) as AppManifest;
  }
}
