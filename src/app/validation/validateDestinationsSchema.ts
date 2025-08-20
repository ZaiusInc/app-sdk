import { DestinationSchema, DestinationSchemaCustomType, DestinationSchemaField } from '../types';
import * as path from 'path';

const SCHEMA_NAME_FORMAT = /^[a-z][a-z0-9_]{1,61}$/;

export function validateDestinationsSchema(
  destinationSchema: DestinationSchema,
  file: string
): string[] {
  return new DestinationSchemaValidator(destinationSchema, file).validate();
}

class DestinationSchemaValidator {
  private readonly errors: string[] = [];
  private destinationsSchema: DestinationSchema;
  private file: string;

  public constructor(
    destinationSchema: DestinationSchema,
    file: string
  ) {
    this.destinationsSchema = destinationSchema;
    this.file = file;
  }

  public validate(): string[] {
    if (path.basename(this.file, '.yml') !== this.destinationsSchema.name &&
        path.basename(this.file, '.yaml') !== this.destinationsSchema.name) {
      this.errors.push(`Invalid ${this.file}: name must match file base name`);
    }

    if (!this.destinationsSchema.name) {
      this.errors.push(`Invalid ${this.file}: name must be specified`);
    } else {
      this.enforceNameFormat(this.destinationsSchema.name, 'name');
    }

    if (!this.destinationsSchema.display_name || this.destinationsSchema.display_name.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: display_name must be specified`);
    }

    let hasPrimaryKey = false;
    this.destinationsSchema.fields.forEach((field, index) => {
      this.validateField(field, index);
      if (field.primary) {
        hasPrimaryKey = true;
      }
    });
    if (!hasPrimaryKey) {
      this.errors.push(`Invalid ${this.file}: fields must contain one primary key`);
    }

    if (this.destinationsSchema.custom_types) {
      this.destinationsSchema.custom_types.forEach((customType, index) => {
        this.validateCustomType(customType, index);
      });
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

  private validateField(field: DestinationSchemaField, index: number) {
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
    this.validateCustomTypeReference(field, index);
  }

  private validateCustomType(customType: DestinationSchemaCustomType, customTypeIndex: number) {
    if (!customType.name) {
      this.errors.push(`Invalid ${this.file}: custom_types[${customTypeIndex}].name must be specified`);
    } else {
      this.enforceNameFormat(customType.name, `custom_types[${customTypeIndex}].name`);
    }

    if (!customType.display_name || customType.display_name.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: custom_types[${customTypeIndex}].display_name must be specified`);
    }

    if (!customType.description || customType.description.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: custom_types[${customTypeIndex}].description must be specified`);
    }

    if (customType.fields && Array.isArray(customType.fields)) {
      customType.fields.forEach((field: DestinationSchemaField, fieldIndex: number) => {
        this.validateCustomTypeField(field, customTypeIndex, fieldIndex);
      });
    }
  }

  private validateCustomTypeField(field: DestinationSchemaField, customTypeIndex: number, fieldIndex: number) {
    if (!field.name) {
      this.errors.push(
        `Invalid ${this.file}: custom_types[${customTypeIndex}].fields[${fieldIndex}].name must be specified`
      );
    } else {
      this.enforceNameFormat(field.name, `custom_types[${customTypeIndex}].fields[${fieldIndex}].name`);
    }

    if (!field.display_name || field.display_name.trim().length === 0) {
      this.errors.push(
        `Invalid ${this.file}: custom_types[${customTypeIndex}].fields[${fieldIndex}].display_name must be specified`
      );
    }

    if (!field.description || field.description.trim().length === 0) {
      this.errors.push(
        `Invalid ${this.file}: custom_types[${customTypeIndex}].fields[${fieldIndex}].description must be specified`
      );
    }
  }

  private validateCustomTypeReference(field: DestinationSchemaField, index: number) {
    const customTypes = (this.destinationsSchema.custom_types || []).map((ct: DestinationSchemaCustomType) => ct.name);
    const customTypeMatch = field.type.match(/^\w+$/);
    if (customTypeMatch && !['boolean', 'float', 'int', 'long', 'string'].includes(field.type)) {
      if (!customTypes.includes(field.type)) {
        this.errors.push(
          `Invalid ${this.file}: fields[${index}].type '${field.type}' does not match any custom_types name`
        );
      }
    }

    const arrayTypeMatch = field.type.match(/^\[(\w+)\]$/);
    if (arrayTypeMatch) {
      const arrayType = arrayTypeMatch[1];
      if (!['boolean', 'float', 'int', 'long', 'string'].includes(arrayType) && !customTypes.includes(arrayType)) {
        this.errors.push(
          `Invalid ${this.file}: fields[${index}].type '${field.type}' array type does not match any custom_types name`
        );
      }
    }
  }
}
