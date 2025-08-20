export interface SourceSchema {
  name: string;
  description: string;
  display_name: string;
  fields: SourceSchemaField[];
  custom_types?: SourceSchemaCustomType[];
}

export type SourceSchemaFieldType =
  | 'string'
  | 'boolean'
  | 'int'
  | 'float'
  | 'long'
  | '[string]'
  | '[boolean]'
  | '[int]'
  | '[float]'
  | '[long]'
  | string; // Allow custom types as strings

export interface SourceSchemaField {
  name: string;
  display_name: string;
  description: string;
  type: SourceSchemaFieldType;
  primary?: boolean;
  format?: 'url';
}

export interface SourceSchemaObjects {
  [file: string]: SourceSchema;
}

export interface SourceSchemaCustomType {
  name: string;
  display_name: string;
  description: string;
  fields: SourceSchemaField[];
}
