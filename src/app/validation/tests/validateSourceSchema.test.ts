import {SourceSchema} from '../../types';
import {validateSourcesSchema} from '../validateSourcesSchema';

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
        {name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true},
        {name: 'field2', display_name: 'Field 2', description: 'Description', type: 'string'}
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
      fields: [{name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true}]
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
      fields: [{name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true}]
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
        {name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string'},
        {name: 'field2', display_name: 'Field 2', description: 'Description', type: 'string'}
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
      fields: [{name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true}]
    };

    const file = 'InvalidName.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toContain(
      'Invalid InvalidName.yml: name must start with a letter, contain only lowercase ' +
        'alpha-numeric and underscore, and be between 2 and 64 characters long (/^[a-z][a-z0-9_]{1,61}$/)'
    );
  });

  it('should return an error if field name does not match format', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [
        {name: 'invalid-field', display_name: 'Field 1', description: 'Description', type: 'string', primary: true}
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual([
      'Invalid valid_schema.yml: fields[0].name must start with a letter, contain ' +
        'only lowercase alpha-numeric and underscore, and be between 2 and 64 characters long ' +
        '(/^[a-z][a-z0-9_]{1,61}$/)'
    ]);
  });

  it('should return an error if field display_name is missing', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [{name: 'field1', display_name: '', description: 'Description', type: 'string', primary: true}]
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
      fields: [{name: 'field1', display_name: 'Field 1', description: '', type: 'string', primary: true}]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual(['Invalid valid_schema.yml: fields[0].description must be specified']);
  });

  it('should return an error if type does not match any custom type', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [
        {name: 'field1', display_name: 'Field 1', description: 'Description', type: 'custom_type2', primary: true}
      ],
      custom_types: [{name: 'custom_type1', display_name: 'Custom Type 1', description: 'Description', fields: []}]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual([
      "Invalid valid_schema.yml: fields[0].type 'custom_type2' does not match any custom_types name"
    ]);
  });

  it('should not return an error if type matches a custom type', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [
        {name: 'field1', display_name: 'Field 1', description: 'Description', type: 'custom_type1', primary: true}
      ],
      custom_types: [{name: 'custom_type1', display_name: 'Custom Type 1', description: 'Description', fields: []}]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual([]);
  });

  it('should not return an error if type matches custom_type array', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [
        {name: 'field1', display_name: 'Field 1', description: 'Description', type: '[custom_type1]', primary: true}
      ],
      custom_types: [{name: 'custom_type1', display_name: 'Custom Type 1', description: 'Description', fields: []}]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual([]);
  });

  it('should return an error if custom type name is missing', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [{name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true}],
      custom_types: [{name: '', display_name: 'Custom Type 1', description: 'Description', fields: []}]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual(['Invalid valid_schema.yml: custom_types[0].name must be specified']);
  });

  it('should return an error if custom type display_name is missing', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [{name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true}],
      custom_types: [{name: 'custom_type1', display_name: '', description: 'Description', fields: []}]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual(['Invalid valid_schema.yml: custom_types[0].display_name must be specified']);
  });

  it('should return an error if custom type description is missing', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [{name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true}],
      custom_types: [{name: 'custom_type1', display_name: 'Custom Type 1', description: '', fields: []}]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual(['Invalid valid_schema.yml: custom_types[0].description must be specified']);
  });

  it('should return an error if custom type field name is missing', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [{name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true}],
      custom_types: [
        {
          name: 'custom_type1',
          display_name: 'Custom Type 1',
          description: 'Description',
          fields: [
            {
              name: '',
              display_name: 'Field 1',
              description: 'Description',
              type: 'string'
            }
          ]
        }
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual(['Invalid valid_schema.yml: custom_types[0].fields[0].name must be specified']);
  });

  it('should return an error if custom type field display_name is missing', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [{name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true}],
      custom_types: [
        {
          name: 'custom_type1',
          display_name: 'Custom Type 1',
          description: 'Description',
          fields: [
            {
              name: 'field1',
              display_name: '',
              description: 'Description',
              type: 'string'
            }
          ]
        }
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual(['Invalid valid_schema.yml: custom_types[0].fields[0].display_name must be specified']);
  });

  it('should return an error if custom type field description is missing', () => {
    const invalidSchema: SourceSchema = {
      name: 'valid_schema',
      description: 'Description',
      display_name: 'Valid Schema',
      fields: [{name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true}],
      custom_types: [
        {
          name: 'custom_type1',
          display_name: 'Custom Type 1',
          description: 'Description',
          fields: [
            {
              name: 'field1',
              display_name: 'Field 1',
              description: '',
              type: 'string'
            }
          ]
        }
      ]
    };
    const file = 'valid_schema.yml';
    const result = validateSourcesSchema(invalidSchema, file);
    expect(result).toEqual(['Invalid valid_schema.yml: custom_types[0].fields[0].description must be specified']);
  });

  describe('locale_config', () => {
    const baseSchema = (overrides: Partial<SourceSchema> = {}): SourceSchema => ({
      name: 'valid_schema',
      display_name: 'Valid Schema',
      description: 'Description',
      fields: [{name: 'field1', display_name: 'Field 1', description: 'Description', type: 'string', primary: true}],
      ...overrides
    });
    const file = 'valid_schema.yml';

    it('accepts schema without locale_config (backwards compat)', () => {
      expect(validateSourcesSchema(baseSchema(), file)).toEqual([]);
    });

    it('accepts a valid supported_locales list', () => {
      const schema = baseSchema({locale_config: {supported_locales: ['en', 'de', 'pt-BR']}});
      expect(validateSourcesSchema(schema, file)).toEqual([]);
    });

    it('accepts boundary case: 50 distinct valid tags', () => {
      const real = [
        'aa',
        'ab',
        'af',
        'ak',
        'am',
        'an',
        'ar',
        'as',
        'av',
        'ay',
        'az',
        'ba',
        'be',
        'bg',
        'bh',
        'bi',
        'bm',
        'bn',
        'bo',
        'br',
        'bs',
        'ca',
        'ce',
        'ch',
        'co',
        'cr',
        'cs',
        'cu',
        'cv',
        'cy',
        'da',
        'de',
        'dv',
        'dz',
        'ee',
        'el',
        'en',
        'eo',
        'es',
        'et',
        'eu',
        'fa',
        'ff',
        'fi',
        'fj',
        'fo',
        'fr',
        'fy',
        'ga',
        'gd'
      ];
      expect(real.length).toBe(50);
      const schema = baseSchema({locale_config: {supported_locales: real}});
      expect(validateSourcesSchema(schema, file)).toEqual([]);
    });

    it('rejects empty supported_locales array', () => {
      const schema = baseSchema({locale_config: {supported_locales: []}});
      const errors = validateSourcesSchema(schema, file);
      expect(errors.some((e) => e.includes('locale_config.supported_locales must be a non-empty array'))).toBe(true);
    });

    it('rejects array of 51 entries with size-cited error', () => {
      const tags51 = [
        'aa',
        'ab',
        'af',
        'ak',
        'am',
        'an',
        'ar',
        'as',
        'av',
        'ay',
        'az',
        'ba',
        'be',
        'bg',
        'bh',
        'bi',
        'bm',
        'bn',
        'bo',
        'br',
        'bs',
        'ca',
        'ce',
        'ch',
        'co',
        'cr',
        'cs',
        'cu',
        'cv',
        'cy',
        'da',
        'de',
        'dv',
        'dz',
        'ee',
        'el',
        'en',
        'eo',
        'es',
        'et',
        'eu',
        'fa',
        'ff',
        'fi',
        'fj',
        'fo',
        'fr',
        'fy',
        'ga',
        'gd',
        'gl'
      ];
      expect(tags51.length).toBe(51);
      const schema = baseSchema({locale_config: {supported_locales: tags51}});
      const errors = validateSourcesSchema(schema, file);
      expect(errors.some((e) => /must contain at most 50 entries \(got 51\)/.test(e))).toBe(true);
    });

    it('rejects duplicate tags', () => {
      const schema = baseSchema({locale_config: {supported_locales: ['de', 'de']}});
      const errors = validateSourcesSchema(schema, file);
      expect(errors.some((e) => /'de' is duplicated/.test(e))).toBe(true);
    });

    it('rejects non-BCP 47 string', () => {
      const schema = baseSchema({locale_config: {supported_locales: ['english']}});
      const errors = validateSourcesSchema(schema, file);
      expect(errors.some((e) => /'english' is not a valid BCP 47 language tag/.test(e))).toBe(true);
    });

    it('rejects private-use tag (x-private)', () => {
      const schema = baseSchema({locale_config: {supported_locales: ['x-private']}});
      const errors = validateSourcesSchema(schema, file);
      expect(errors.some((e) => /'x-private' is a private-use BCP 47 tag/.test(e))).toBe(true);
    });

    it('rejects private-use extension tag (en-x-private)', () => {
      const schema = baseSchema({locale_config: {supported_locales: ['en-x-private']}});
      const errors = validateSourcesSchema(schema, file);
      expect(errors.some((e) => /'en-x-private' is a private-use BCP 47 tag/.test(e))).toBe(true);
    });

    it('rejects empty-string entry', () => {
      const schema = baseSchema({locale_config: {supported_locales: ['']}});
      const errors = validateSourcesSchema(schema, file);
      expect(errors.some((e) => /must be a non-empty string/.test(e))).toBe(true);
    });
  });
});
