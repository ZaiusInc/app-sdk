export interface SourceSchema {
  name: string;
  description: string;
  display_name: string;
  fields: SourceSchemaField[];
  custom_types?: SourceSchemaCustomType[];
}

export interface SourceSchemaField {
  name: string;
  display_name: string;
  description: string;
  type: string;
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
