import {SourceSchema, SourceSchemaField} from '../types/SourceSchema';
import * as path from 'path';

const SCHEMA_NAME_FORMAT = /^[a-z][a-z0-9_]{1,61}$/;

export function validateSourcesSchema(sourceSchema: SourceSchema, file: string): string[] {
  return new SourceSchemaValidator(sourceSchema, file).validate();
}

class SourceSchemaValidator {
  private readonly errors: string[] = [];
  private sourcesSchema: SourceSchema;
  private file: string;

  public constructor(sourceSchema: SourceSchema, file: string) {
    this.sourcesSchema = sourceSchema;
    this.file = file;
  }

  public validate(): string[] {
    if (
      path.basename(this.file, '.yml') !== this.sourcesSchema.name &&
      path.basename(this.file, '.yaml') !== this.sourcesSchema.name
    ) {
      this.errors.push(`Invalid ${this.file}: name must match file base name`);
    }

    if (!this.sourcesSchema.name) {
      this.errors.push(`Invalid ${this.file}: name must be specified`);
    } else {
      this.enforceNameFormat(this.sourcesSchema.name, 'name');
    }

    if (!this.sourcesSchema.display_name || this.sourcesSchema.display_name.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: display_name must be specified`);
    }

    let hasPrimaryKey = false;
    this.sourcesSchema.fields.forEach((field, index) => {
      this.validateField(field, index);
      if (field.primary) {
        hasPrimaryKey = true;
      }
    });
    if (!hasPrimaryKey) {
      this.errors.push(`Invalid ${this.file}: fields must contain one primary key`);
    }
    return this.errors;
  }

  private enforceNameFormat(name: string, ref: string) {
    if (!name.match(SCHEMA_NAME_FORMAT)) {
      this.errors.push(
        `Invalid ${this.file}: ${ref} must start with a letter, contain only lowercase alpha-numeric and ` +
          `underscore, and be between 2 and 64 characters long (${SCHEMA_NAME_FORMAT.toString()})`
      );
    }
  }

  private validateField(field: SourceSchemaField, index: number) {
    if (!field.name) {
      this.errors.push(`Invalid ${this.file}: fields[${index}].name must be specified`);
    } else {
      this.enforceNameFormat(field.name, `fields[${index}].name`);
    }

    if (!field.display_name || field.display_name.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: fields[${index}].display_name must be specified`);
    }
    if (!field.description || field.description.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: fields[${index}].description must be specified`);
    }
  }
}
