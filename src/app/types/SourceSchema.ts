export interface SourceSchema {
  name: string;
  description: string;
  display_name: string;
  fields: SourceSchemaField[];
}

export interface SourceSchemaField {
  name: string;
  display_name: string;
  description: string;
  type: 'string' | 'boolean' | 'int' | 'float' | 'long';
  primary?: boolean;
  format?: 'url';
}

export interface SourceSchemaObjects {
  [file: string]: SourceSchema;
}

export interface SourceSchemaFunctionConfig {
  sourceKey: string;
}

export abstract class SourceSchemaFunction {
  protected config: SourceSchemaFunctionConfig;

  public constructor(config: SourceSchemaFunctionConfig) {
    this.config = config;
  }

  public abstract getSourcesSchema(): Promise<SourceSchema>;
}
