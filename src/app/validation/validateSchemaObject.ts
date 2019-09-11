import {Runtime} from '../Runtime';
import {SCHEMA_NAME_FORMAT, SchemaField, SchemaObject, SchemaRelation} from '../types/SchemaObject';

export function validateSchemaObject(
  runtime: Runtime,
  schemaObject: SchemaObject,
  file: string,
  baseObjectNames?: string[]
): string[] {
  return new SchemaObjectValidator(runtime, schemaObject, file, baseObjectNames).validate();
}

class SchemaObjectValidator {
  private readonly errors: string[] = [];
  private readonly appIdPrefix: string;
  private readonly appDisplayName: string;
  private isCustomObject: boolean;

  public constructor(
    runtime: Runtime,
    private schemaObject: SchemaObject,
    private file: string,
    private baseObjectNames?: string[]
  ) {
    this.appIdPrefix = `${runtime.manifest.meta.app_id}_`;
    this.appDisplayName = runtime.manifest.meta.display_name;
    this.isCustomObject = schemaObject.name.startsWith(this.appIdPrefix);
  }

  public validate(): string[] {
    if (!this.isCustomObject && this.baseObjectNames && !this.baseObjectNames.includes(this.schemaObject.name)) {
      this.errors.push(`Invalid ${this.file}: name must be prefixed with ${this.appIdPrefix} for custom object`);
      this.isCustomObject = true;
    }

    this.enforceNameFormat(this.schemaObject.name, 'name');

    if (this.isCustomObject) {
      if (!this.schemaObject.display_name || this.schemaObject.display_name.trim().length === 0) {
        this.errors.push(`Invalid ${this.file}: display_name must be specified for custom object`);
      } else if (!this.schemaObject.display_name.startsWith(this.appDisplayName)) {
        this.errors.push(`Invalid ${this.file}: display_name must be prefixed with ${this.appDisplayName}`);
      }
      if (this.schemaObject.alias && !this.schemaObject.alias.startsWith(this.appIdPrefix)) {
        this.errors.push(`Invalid ${this.file}: alias must be prefixed with ${this.appIdPrefix}`);
      }
    } else {
      if (this.schemaObject.display_name) {
        this.errors.push(`Invalid ${this.file}: display_name cannot be specified for standard object`);
      }
      if (this.schemaObject.alias) {
        this.errors.push(`Invalid ${this.file}: alias cannot be specified for standard object`);
      }
    }

    let hasPrimaryKey = false;
    this.schemaObject.fields.forEach((field, index) => {
      this.validateField(field, index);
      if (field.primary) {
        hasPrimaryKey = true;
      }
    });
    if (this.isCustomObject && !hasPrimaryKey) {
      this.errors.push(`Invalid ${this.file}: fields must contain at least one primary key for custom object`);
    }

    if (this.schemaObject.relations) {
      this.schemaObject.relations.forEach((relation, index) => {
        this.validateRelation(relation, index);
      });
    }

    return this.errors;
  }

  private enforceNameFormat(name: string, ref: string) {
    if (!name.match(SCHEMA_NAME_FORMAT)) {
      this.errors.push(
        `Invalid ${this.file}: ${ref} must start with a letter, contain only lowercase alpha-numeric and ` +
          `underscore, and be between 2 and 64 characters long (${SCHEMA_NAME_FORMAT})`
      );
    }
  }

  private validateField(field: SchemaField, index: number) {
    this.enforceNameFormat(field.name, `fields[${index}].name`);
    if (!field.display_name || field.display_name.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: fields[${index}].display_name must be specified`);
    }
    if (!field.description || field.description.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: fields[${index}].description must be specified`);
    }
    if (!this.isCustomObject) {
      if (!field.name.startsWith(this.appIdPrefix)) {
        this.errors.push(`Invalid ${this.file}: fields[${index}].name must be prefixed with ${this.appIdPrefix}`);
      }
      if (!field.display_name.startsWith(this.appDisplayName)) {
        this.errors.push(
          `Invalid ${this.file}: fields[${index}].display_name must be prefixed with ${this.appDisplayName}`
        );
      }
    }
    if (field.primary) {
      if (!this.isCustomObject) {
        this.errors.push(`Invalid ${this.file}: fields[${index}].primary cannot be set for non-custom object`);
      } else if (field.type !== 'string') {
        this.errors.push(`Invalid ${this.file}: fields[${index}].type must be string for primary key`);
      }
    }
  }

  private validateRelation(relation: SchemaRelation, index: number) {
    this.enforceNameFormat(relation.name, `relations[${index}].name`);
    if (!relation.display_name || relation.display_name.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: relations[${index}].display_name must be specified`);
    }
    if (relation.join_fields.length === 0) {
      this.errors.push(`Invalid ${this.file}: relations[${index}].join_fields must contain at least one join field`);
    }
    if (relation.join_fields.some((joinField) => joinField.parent.startsWith(this.appIdPrefix))) {
      if (!relation.name.startsWith(this.appIdPrefix)) {
        this.errors.push(`Invalid ${this.file}: relations[${index}].name must be prefixed with ${this.appIdPrefix}`);
      }
      if (!relation.display_name.startsWith(this.appDisplayName)) {
        this.errors.push(
          `Invalid ${this.file}: relations[${index}].display_name must be prefixed with ${this.appDisplayName}`
        );
      }
    }
  }
}
