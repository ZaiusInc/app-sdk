import * as path from 'path';

import {SourceSchemaCustomType, SourceSchema, SourceSchemaField} from '../types';
import {isValidBcp47, isPrivateUseBcp47} from './validateLanguage';

const SCHEMA_NAME_FORMAT = /^[a-z][a-z0-9_]{1,61}$/;
const LOCALE_CONFIG_MAX_ENTRIES = 50;

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
      this.validateField(field, `fields[${index}]`);
      if (field.primary) {
        hasPrimaryKey = true;
      }
    });
    if (!hasPrimaryKey) {
      this.errors.push(`Invalid ${this.file}: fields must contain one primary key`);
    }

    if (this.sourcesSchema.custom_types) {
      this.sourcesSchema.custom_types.forEach((customType, index) => {
        this.validateCustomType(customType, index);
      });
    }

    this.validateLocaleConfig();

    return this.errors;
  }

  private validateLocaleConfig() {
    const localeConfig = this.sourcesSchema.locale_config;
    if (localeConfig === undefined) {
      return;
    }

    const supported = localeConfig.supported_locales;
    if (!Array.isArray(supported) || supported.length === 0) {
      this.errors.push(
        `Invalid ${this.file}: locale_config.supported_locales must be a non-empty array of BCP 47 tags`
      );
      return;
    }

    if (supported.length > LOCALE_CONFIG_MAX_ENTRIES) {
      this.errors.push(
        `Invalid ${this.file}: locale_config.supported_locales must contain at most ` +
          `${LOCALE_CONFIG_MAX_ENTRIES} entries (got ${supported.length})`
      );
      return;
    }

    const seen = new Set<string>();
    supported.forEach((tag, index) => {
      const ref = `locale_config.supported_locales[${index}]`;
      if (typeof tag !== 'string' || tag.length === 0) {
        this.errors.push(`Invalid ${this.file}: ${ref} must be a non-empty string`);
        return;
      }
      if (seen.has(tag)) {
        this.errors.push(`Invalid ${this.file}: ${ref} '${tag}' is duplicated`);
        return;
      }
      seen.add(tag);
      if (isPrivateUseBcp47(tag)) {
        this.errors.push(`Invalid ${this.file}: ${ref} '${tag}' is a private-use BCP 47 tag and is not allowed`);
        return;
      }
      if (!isValidBcp47(tag)) {
        this.errors.push(`Invalid ${this.file}: ${ref} '${tag}' is not a valid BCP 47 language tag`);
      }
    });
  }

  private enforceNameFormat(name: string, ref: string) {
    if (!name.match(SCHEMA_NAME_FORMAT)) {
      this.errors.push(
        `Invalid ${this.file}: ${ref} must start with a letter, contain only lowercase alpha-numeric and ` +
          `underscore, and be between 2 and 64 characters long (${SCHEMA_NAME_FORMAT.toString()})`
      );
    }
  }

  private validateField(field: SourceSchemaField, pathPrefix: string) {
    if (!field.name) {
      this.errors.push(`Invalid ${this.file}: ${pathPrefix}.name must be specified`);
    } else {
      this.enforceNameFormat(field.name, `${pathPrefix}.name`);
    }

    if (!field.display_name || field.display_name.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: ${pathPrefix}.display_name must be specified`);
    }

    if (!field.description || field.description.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: ${pathPrefix}.description must be specified`);
    }

    this.validateCustomTypeReference(field, pathPrefix);
  }

  private validateCustomType(customType: SourceSchemaCustomType, customTypeIndex: number) {
    const pathPrefix = `custom_types[${customTypeIndex}]`;

    if (!customType.name) {
      this.errors.push(`Invalid ${this.file}: ${pathPrefix}.name must be specified`);
    } else {
      this.enforceNameFormat(customType.name, `${pathPrefix}.name`);
    }

    if (!customType.display_name || customType.display_name.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: ${pathPrefix}.display_name must be specified`);
    }

    if (!customType.description || customType.description.trim().length === 0) {
      this.errors.push(`Invalid ${this.file}: ${pathPrefix}.description must be specified`);
    }

    if (customType.fields && Array.isArray(customType.fields)) {
      customType.fields.forEach((field: SourceSchemaField, fieldIndex: number) => {
        this.validateField(field, `${pathPrefix}.fields[${fieldIndex}]`);
      });
    }
  }

  private validateCustomTypeReference(field: SourceSchemaField, pathPrefix: string) {
    const customTypes = (this.sourcesSchema.custom_types || []).map((ct: SourceSchemaCustomType) => ct.name);
    const customTypeMatch = field.type.match(/^\w+$/);
    if (customTypeMatch && !['boolean', 'float', 'int', 'long', 'string'].includes(field.type)) {
      if (!customTypes.includes(field.type)) {
        this.errors.push(
          `Invalid ${this.file}: ${pathPrefix}.type '${field.type}' does not match any custom_types name`
        );
      }
    }

    const arrayTypeMatch = field.type.match(/^\[(\w+)\]$/);
    if (arrayTypeMatch) {
      const arrayType = arrayTypeMatch[1];
      if (!['boolean', 'float', 'int', 'long', 'string'].includes(arrayType) && !customTypes.includes(arrayType)) {
        this.errors.push(
          `Invalid ${this.file}: ${pathPrefix}.type '${field.type}' array type does not match any custom_types name`
        );
      }
    }
  }
}
