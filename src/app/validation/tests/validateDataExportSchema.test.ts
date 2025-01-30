import { validateDataExportSchema } from '../validateDataExportSchema';
import { DataExportSchema } from '../../types/DataExportSchema';

describe('validateDataExportSchema', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should pass for valid schema and file name', () => {
    const validSchema: DataExportSchema = {
      name: 'valid_schema',
      display_name: 'Valid Schema',
      fields: [
        { name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true },
        { name: 'field2', display_name: 'Field 2', description: 'Description', type: 'string' },
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateDataExportSchema(validSchema, file);
    expect(result).toEqual([]);
  });

  it('should return an error if the schema name does not match the file name', () => {
    const invalidSchema: DataExportSchema = {
      name: 'invalid_schema',
      display_name: 'Invalid Schema',
      fields: [
        { name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true }
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateDataExportSchema(invalidSchema, file);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return an error if display_name is missing in the schema', () => {
    const invalidSchema: DataExportSchema = {
      name: 'valid_schema',
      display_name: '',
      fields: [
        { name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true }
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateDataExportSchema(invalidSchema, file);

    expect(result.length).toBeGreaterThan(0);
  });

  it('should return an error if no primary key is defined in the schema fields', () => {
    const invalidSchema: DataExportSchema = {
      name: 'valid_schema',
      display_name: 'Valid Schema',
      fields: [
        { name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string' },
        { name: 'field2', display_name: 'Field 2', description: 'Description', type: 'string' },
      ]
    };
    const file = 'valid_schema.yml';

    const result = validateDataExportSchema(invalidSchema, file);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return an error if schema name does not match the format', () => {
    const invalidSchema: DataExportSchema = {
      name: 'InvalidName!',
      display_name: 'Invalid Schema',
      fields: [
        { name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true }
      ]
    };

    const file = 'InvalidName.yml';
    const result = validateDataExportSchema(invalidSchema, file);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return an error if field name does not match format', () => {
    const invalidSchema: DataExportSchema = {
      name: 'valid_schema',
      display_name: 'Valid Schema',
      fields: [
        { name: 'invalid-field', display_name: 'Field 1', description: 'Description', type: 'string', primary: true }
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateDataExportSchema(invalidSchema, file);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return an error if field display_name is missing', () => {
    const invalidSchema: DataExportSchema = {
      name: 'valid_schema',
      display_name: 'Valid Schema',
      fields: [
        { name: 'field1', display_name: '', description: 'Description', type: 'string', primary: true }
      ]
    };
    const file = 'valid_schema.yml';

    const result = validateDataExportSchema(invalidSchema, file);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return an error if field description is missing', () => {
    const invalidSchema: DataExportSchema = {
      name: 'valid_schema',
      display_name: 'Valid Schema',
      fields: [
        { name: 'field1', display_name: 'Field 1', description: '', type: 'string', primary: true }
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateDataExportSchema(invalidSchema, file);
    expect(result.length).toBeGreaterThan(0);
  });
});
