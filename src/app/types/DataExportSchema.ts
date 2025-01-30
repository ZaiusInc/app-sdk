export interface DataExportSchema {
  name: string;
  display_name: string;
  fields: SchemaField[];
}

export interface SchemaField {
  name: string;
  display_name: string;
  description: string;
  type: string;
  primary?: boolean;
  format?: 'url';
}

export interface DataExportSchemaObjects {
  [file: string]: DataExportSchema;
}

