export interface DestinationSchema {
  name: string;
  description: string;
  display_name: string;
  fields: DestinationSchemaField[];
}

export interface DestinationSchemaField {
  name: string;
  display_name: string;
  description: string;
  type: 'string' | 'boolean' | 'int' | 'float' | 'long';
  primary?: boolean;
  format?: 'url';
}

export interface DestinationSchemaObjects {
  [file: string]: DestinationSchema;
}
