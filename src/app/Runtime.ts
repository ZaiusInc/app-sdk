import {Ajv, ErrorObject} from 'ajv';
import * as EmailValidator from 'email-validator';
import {existsSync, readFileSync} from 'fs';
import {join} from 'path';
import * as urlRegex from 'url-regex';
import {Function} from './Function';
import {Job, JobInvocation} from './Job';
import {Request} from './lib';
import {Lifecycle, LIFECYCLE_REQUIRED_METHODS} from './Lifecycle';
import {APP_ID_FORMAT, AppManifest, VENDOR_FORMAT, VERSION_FORMAT} from './types';
import * as manifestSchema from './types/AppManifest.schema.json';
import {SCHEMA_NAME_FORMAT, SchemaObject} from './types/SchemaObject';
import * as schemaObjectSchema from './types/SchemaObject.schema.json';
import deepFreeze = require('deep-freeze');

interface SerializedRuntime {
  appManifest: AppManifest;
  dirName: string;
}

export class Runtime {
  public static async initialize(dirName: string, skipJsonValidation: boolean = false) {
    const runtime = new Runtime();
    await runtime.initialize(dirName, skipJsonValidation);
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

  public async getSchemaObjects(): Promise<{[file: string]: SchemaObject}> {
    const schemaObjects = {} as any;
    const schemaDir = join(this.dirName, 'schema');
    if (existsSync(schemaDir)) {
      const glob = require('glob');
      const files = glob.sync('*.yml', {cwd: schemaDir});
      if (files.length > 0) {
        const jsYaml = await import('js-yaml');
        for (const file of files) {
          schemaObjects[file] = jsYaml.safeLoad(readFileSync(join(schemaDir, file), 'utf8'));
        }
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

  /**
   * Validates that all of the required pieces of the app are accounted for.
   *
   * @return array of error messages, if there were any, otherwise an empty array
   */
  public async validate(baseObjectNames?: string[]): Promise<string[]> {
    let errors: string[] = [];

    const ajv = new (require('ajv') as any)({allErrors: true});
    if (!ajv.validate(manifestSchema, this.manifest)) {
      ajv.errors!.forEach((e: ErrorObject) => errors.push(this.formatAjvError('app.yml', e)));
    } else {
      errors = errors.concat(await this.validateManifestContents());
    }

    const schemaObjects = await this.getSchemaObjects();
    for (const file of Object.keys(schemaObjects)) {
      const schemaObject = schemaObjects[file];
      if (!ajv.validate(schemaObjectSchema, schemaObject)) {
        ajv.errors!.forEach((e: ErrorObject) => errors.push(this.formatAjvError(`schema/${file}`, e)));
      } else {
        errors = errors.concat(this.validateSchemaObjectContents(schemaObject, file, baseObjectNames));
      }
    }

    return errors;
  }

  private formatAjvError(file: string, e: ErrorObject): string {
    const adjustedDataPath = e.dataPath.length > 0 ? e.dataPath.substring(1).replace(/\['([^']+)']/, '.$1') + ' ' : '';
    return `Invalid ${file}: ${adjustedDataPath}${e.message!.replace(/\bshould\b/, 'must')}`;
  }

  private async validateManifestContents(): Promise<string[]> {
    const errors: string[] = [];

    const {app_id, display_name, version, vendor, support_url, contact_email, summary, categories} = this.manifest.meta;

    // App ID, version, vendor, support url, and contact email must be in the correct format
    if (!app_id.match(APP_ID_FORMAT)) {
      errors.push(
        'Invalid app.yml: meta.app_id must start with a letter, contain only lowercase alpha-numeric and underscore, ' +
        `and be between 3 and 32 characters long (${APP_ID_FORMAT})`
      );
    }
    if (!version.match(VERSION_FORMAT)) {
      errors.push(
        `Invalid app.yml: meta.version must be a semantic version number, optionally with -dev/-beta (and increment) ` +
        `or -private (${VERSION_FORMAT})`
      );
    }
    if (!vendor.match(VENDOR_FORMAT)) {
      errors.push(`Invalid app.yml: meta.vendor must be lower snake case (${VENDOR_FORMAT})`);
    }
    if (!support_url.match(urlRegex({exact: true})) || !support_url.startsWith('http')) {
      errors.push('Invalid app.yml: meta.support_url must be a valid web address');
    }
    if (!EmailValidator.validate(contact_email)) {
      errors.push('Invalid app.yml: meta.contact_email must be a valid email address');
    }

    // Display name and summary must not be blank
    if (!(display_name && display_name.trim())) {
      errors.push('Invalid app.yml: meta.display_name must not be blank');
    }
    if (!(summary && summary.trim())) {
      errors.push('Invalid app.yml: meta.summary must not be blank');
    }

    // Make sure there are exactly 1 to 2 categories listed
    if (categories.length > 2 || categories.length < 1) {
      errors.push('Invalid app.yml: meta.categories must contain 1 or 2 categories');
    }
    if (categories.length === 2 && categories[0] === categories[1]) {
      errors.push('Invalid app.yml: meta.categories contains two identical categories');
    }

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

  private validateSchemaObjectContents(schemaObject: SchemaObject, file: string, baseObjectNames?: string[]): string[] {
    const errors: string[] = [];

    const appIdPrefix = `${this.manifest.meta.app_id}_`;
    const appDisplayName = this.manifest.meta.display_name;

    let isCustomObject = schemaObject.name.startsWith(appIdPrefix);
    if (!isCustomObject && baseObjectNames && !baseObjectNames.includes(schemaObject.name)) {
      errors.push(`Invalid schema/${file}: name must be prefixed with ${appIdPrefix} for custom object`);
      isCustomObject = true;
    }

    const enforceNameFormat = (name: string, ref: string) => {
      if (!name.match(SCHEMA_NAME_FORMAT)) {
        errors.push(
          `Invalid schema/${file}: ${ref} must start with a letter, contain only lowercase alpha-numeric and ` +
          `underscore, and be between 2 and 64 characters long (${SCHEMA_NAME_FORMAT})`
        );
      }
    };
    enforceNameFormat(schemaObject.name, 'name');

    if (isCustomObject) {
      if (!schemaObject.display_name || schemaObject.display_name.trim().length === 0) {
        errors.push(`Invalid schema/${file}: display_name must be specified for custom object`);
      } else if (!schemaObject.display_name.startsWith(appDisplayName)) {
        errors.push(`Invalid schema/${file}: display_name must be prefixed with ${appDisplayName}`);
      }
      if (schemaObject.alias && !schemaObject.alias.startsWith(appIdPrefix)) {
        errors.push(`Invalid schema/${file}: alias must be prefixed with ${appIdPrefix}`);
      }
    } else {
      if (schemaObject.display_name) {
        errors.push(`Invalid schema/${file}: display_name cannot be specified for non-custom object`);
      }
      if (schemaObject.alias) {
        errors.push(`Invalid schema/${file}: alias cannot be specified for non-custom object`);
      }
    }

    let hasPrimaryKey = false;
    schemaObject.fields.forEach((field, index) => {
      enforceNameFormat(field.name, `fields[${index}].name`);
      if (!field.display_name || field.display_name.trim().length === 0) {
        errors.push(`Invalid schema/${file}: fields[${index}].display_name must be specified`);
      }
      if (!field.description || field.description.trim().length === 0) {
        errors.push(`Invalid schema/${file}: fields[${index}].description must be specified`);
      }
      if (!isCustomObject) {
        if (!field.name.startsWith(appIdPrefix)) {
          errors.push(`Invalid schema/${file}: fields[${index}].name must be prefixed with ${appIdPrefix}`);
        }
        if (!field.display_name.startsWith(appDisplayName)) {
          errors.push(`Invalid schema/${file}: fields[${index}].display_name must be prefixed with ${appDisplayName}`);
        }
      }
      if (field.primary) {
        hasPrimaryKey = true;
        if (!isCustomObject) {
          errors.push(`Invalid schema/${file}: fields[${index}].primary cannot be set for non-custom object`);
        } else if (field.type !== 'string') {
          errors.push(`Invalid schema/${file}: fields[${index}].type must be string for primary key`);
        }
      }
    });
    if (isCustomObject && !hasPrimaryKey) {
      errors.push(`Invalid schema/${file}: fields must contain at least one primary key for custom object`);
    }

    if (schemaObject.relations) {
      schemaObject.relations.forEach((relation, index) => {
        enforceNameFormat(relation.name, `relations[${index}].name`);
        if (!relation.display_name || relation.display_name.trim().length === 0) {
          errors.push(`Invalid schema/${file}: relations[${index}].display_name must be specified`);
        }
        if (relation.join_fields.length === 0) {
          errors.push(`Invalid schema/${file}: relations[${index}].join_fields must contain at least one join field`);
        }
        if (relation.join_fields.some((joinField) => joinField.parent.startsWith(appIdPrefix))) {
          if (!relation.name.startsWith(appIdPrefix)) {
            errors.push(`Invalid schema/${file}: relations[${index}].name must be prefixed with ${appIdPrefix}`);
          }
          if (!relation.display_name.startsWith(appDisplayName)) {
            errors.push(
              `Invalid schema/${file}: relations[${index}].display_name must be prefixed with ${appDisplayName}`
            );
          }
        }
      });
    }

    return errors;
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
