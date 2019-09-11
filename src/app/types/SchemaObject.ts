// regenerate JSON schema with `yarn run update-schema`
export interface SchemaObject {
  name: string;
  display_name?: string;
  alias?: string;
  fields: SchemaField[];
  relations?: SchemaRelation[];
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'timestamp' | 'boolean';
  display_name: string;
  description: string;
  primary?: boolean;
}

export interface SchemaRelation {
  name: string;
  display_name: string;
  child_object: string;
  join_fields: SchemaJoinField[];
}

export interface SchemaJoinField {
  parent: string;
  child: string;
}

export interface SchemaObjects {
  [file: string]: SchemaObject;
}

export const SCHEMA_NAME_FORMAT = /^[a-z][a-z0-9_]{1,61}$/;
