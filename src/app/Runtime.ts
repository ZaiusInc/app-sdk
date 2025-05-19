/* eslint-disable max-classes-per-file */
import Ajv from 'ajv';
import {readFileSync} from 'fs';
import * as jsYaml from 'js-yaml';
import {join} from 'path';
import {Channel} from './Channel';
import {Function} from './Function';
import {Job, JobInvocation} from './Job';
import {Request} from './lib';
import {Lifecycle} from './Lifecycle';
import {LiquidExtension} from './LiquidExtension';
import {AppManifest} from './types';
import * as manifestSchema from './types/AppManifest.schema.json';
import {SchemaObjects} from './types/SchemaObject';
import deepFreeze = require('deep-freeze');
import glob = require('glob');
import {Destination} from './Destination';
import {DestinationSchemaObjects} from './types/DestinationSchema';
import { Source, SourceConfiguration } from './Source';
import { SourceSchemaObjects } from './types/SourceSchema';
import { SourceEventForwarderApi } from '../sources';

interface SerializedRuntime {
  appManifest: AppManifest;
  dirName: string;
}

export class FunctionClassNotFoundError extends Error { }

export class Runtime {
  /**
   * Initializes from a directory. Used during startup.
   * @param dirName the base directory of the app
   * @param skipJsonValidation for internal use, allows json-schema errors to be captured by the validation process
   */
  public static async initialize(dirName: string, skipJsonValidation = false) {
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

  public get baseDir(): string {
    return this.dirName;
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  public async getFunctionClass<T extends Function>(name: string): Promise<new (request: Request) => T> {
    const functions = this.manifest.functions;
    if (!functions || !functions[name]) {
      throw new FunctionClassNotFoundError(`No function named ${name} defined in manifest`);
    }

    const fn = functions[name];
    return (await this.import(join(this.dirName, 'functions', fn.entry_point)))[fn.entry_point];
  }

  public async getLifecycleClass<T extends Lifecycle>(): Promise<new () => T> {
    return (await this.import(join(this.dirName, 'lifecycle', 'Lifecycle')))['Lifecycle'];
  }

  public async getChannelClass<T extends Channel>(): Promise<new () => T> {
    return (await this.import(join(this.dirName, 'channel', 'Channel')))['Channel'];
  }

  public async getJobClass<T extends Job>(name: string): Promise<new (invocation: JobInvocation) => T> {
    const jobs = this.manifest.jobs;
    if (!jobs || !jobs[name]) {
      throw new Error(`No job named ${name} defined in manifest`);
    }

    const job = jobs[name];
    return (await this.import(join(this.dirName, 'jobs', job.entry_point)))[job.entry_point];
  }

  public async getDestinationClass<T extends Destination<any>>(name: string): Promise<new () => T> {
    const destinations = this.manifest.destinations;
    if (!destinations || !destinations[name]) {
      throw new Error(`No destination ${name} defined in manifest`);
    }
    const destination = destinations[name];
    return (await this.import(join(this.dirName, 'destinations', destination.entry_point)))[destination.entry_point];
  }

  public async getSourceWebhookClass<T extends Source>(name: string): Promise<
  new (request: Request | null, config: SourceConfiguration, forwarder: SourceEventForwarderApi) => T> {
    const sources = this.manifest.sources;
    if (!sources || !sources[name]) {
      throw new Error(`No source '${name}' defined in manifest`);
    }
    const webhookEntryPoint = sources[name].webhook?.entry_point;
    if (!webhookEntryPoint) {
      throw new Error(`Source '${name}' is not a webhook source`);
    }
    return (await this.import(join(this.dirName, 'sources', webhookEntryPoint)))[webhookEntryPoint];
  }

  public async getLiquidExtensionClass<T extends LiquidExtension>(name: string): Promise<new () => T> {
    const liquidExtensions = this.manifest.liquid_extensions;
    if (!liquidExtensions || !liquidExtensions[name]) {
      throw new Error(`No liquid extension named ${name} defined in manifest`);
    }

    const ext = liquidExtensions[name];
    return (await this.import(join(this.dirName, 'liquid-extensions', ext.entry_point)))[ext.entry_point];
  }

  public getSchemaObjects(): SchemaObjects {
    return this.getSchema('schema') as SchemaObjects;
  }

  public getDestinationSchema(): DestinationSchemaObjects {
    return this.getSchema('destinations/schema') as DestinationSchemaObjects;
  }

  public getSourceSchema(): SourceSchemaObjects {
    return this.getSchema('sources/schema') as SourceSchemaObjects;
  }

  private getSchema(path: string) {
    const schemaObjects: any = {};
    const files = glob.sync(`${path}/*.{yml,yaml}`, { cwd: this.dirName });
    if (files.length > 0) {
      for (const file of files) {
        schemaObjects[file] = jsYaml.load(readFileSync(join(this.dirName, file), 'utf8'));
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
    const manifest = (await import('js-yaml')).load(
      readFileSync(join(dirName, 'app.yml'), 'utf8')
    );

    if (!skipJsonValidation) {
      const ajv: Ajv = new Ajv({allowUnionTypes: true});
      if (!ajv.validate(manifestSchema, manifest)) {
        throw new Error('Invalid app.yml manifest (failed JSON schema validation)');
      }
    }

    this.appManifest = deepFreeze(manifest) as AppManifest;
  }
}
