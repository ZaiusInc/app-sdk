import {HttpMethod} from './HttpMethod';

// regenerate JSON schema with `yarn run update-schema`
export interface ZapFunction {
  method: HttpMethod | HttpMethod[];
  entry_point: string;
  description: string;
}

export interface ZapJob {
  entry_point: string;
  timeout: string;
  // TODO
}

export interface ZapManifest {
  meta: {
    app_id: string;
    display_name: string;
    version: string;
    vendor: string;
    support_url: string;
    summary: string;
    contact_email: string;
  };
  runtime: 'node11';
  defaults?: {
    permissions?: string[];
    environment?: {
      [key: string]: string;
    };
  };
  functions?: {
    [name: string]: ZapFunction;
  };
  jobs?: {
    [name: string]: ZapJob;
  };
}
