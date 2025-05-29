import { validateSourcesSchema } from '../validateSourcesSchema';
import { SourceSchema } from '../../types';

describe('validateSourceSchema', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should pass for valid schema and file name', () => {
    const validSchema: SourceSchema = {
      name: 'valid_schema',
      display_name: 'Valid Schema',
      description: 'Description',
      fields: [
        { name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true },
        { name: 'field2', display_name: 'Field 2', description: 'Description', type: 'string' },
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(validSchema, file);
    expect(result).toEqual([]);
  });

  it('should return an error if the schema name does not match the file name', () => {
    const invalidSchema: SourceSchema = {
      name: 'invalid_schema',
      description: 'Description',
      display_name: 'Invalid Schema',
      fields: [
        { name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true }
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return an error if display_name is missing in the schema', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: '',
      fields: [
        { name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true }
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return an error if no primary key is defined in the schema fields', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [
        { name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string' },
        { name: 'field2', display_name: 'Field 2', description: 'Description', type: 'string' },
      ]
    };
    const file = 'valid_schema.yml';

    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual(['Invalid valid_schema.yml: fields must contain one primary key']);
  });

  it('should return an error if schema name does not match the format', () => {
    const invalidSchema: SourceSchema = {
      name: 'InvalidName!',
      description: 'Description',
      display_name: 'Invalid Schema',
      fields: [
        { name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true }
      ]
    };

    const file = 'InvalidName.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toContain('Invalid InvalidName.yml: name must start with a letter, contain only lowercase ' +
      'alpha-numeric and underscore, and be between 2 and 64 characters long (/^[a-z][a-z0-9_]{1,61}$/)');
  });

  it('should return an error if field name does not match format', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [
        { name: 'invalid-field', display_name: 'Field 1', description: 'Description', type: 'string', primary: true }
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual(['Invalid valid_schema.yml: fields[0].name must start with a letter, contain ' +
      'only lowercase alpha-numeric and underscore, and be between 2 and 64 characters long ' +
      '(/^[a-z][a-z0-9_]{1,61}$/)']);
  });

  it('should return an error if field display_name is missing', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [
        { name: 'field1', display_name: '', description: 'Description', type: 'string', primary: true }
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual(['Invalid valid_schema.yml: fields[0].display_name must be specified']);
  });

  it('should return an error if field description is missing', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [
        { name: 'field1', display_name: 'Field 1', description: '', type: 'string', primary: true }
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual(['Invalid valid_schema.yml: fields[0].description must be specified']);
  });
});
