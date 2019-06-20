import {Ajv} from 'ajv';
import {readFileSync} from 'fs';
import {join} from 'path';
import {AppManifest} from './types';
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

  public validate() {
    // TODO: validate all jobs/functions exist, etc
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
