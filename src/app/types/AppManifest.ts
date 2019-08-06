import {ValueHash} from '../../store';
import {HttpMethod} from './HttpMethod';

// regenerate JSON schema with `yarn run update-schema`
export interface AppFunction {
  method: HttpMethod | HttpMethod[];
  entry_point: string;
  description: string;
}

export interface AppJob {
  entry_point: string;
  description: string;
  cron?: string;
  parameters?: ValueHash;
}

export interface AppManifest {
  meta: {
    app_id: string;
    display_name: string;
    version: string;
    vendor: string;
    support_url: string;
    summary: string;
    contact_email: string;
  };
  runtime: 'node12';
  defaults?: {
    permissions?: string[];
    environment?: {
      [key: string]: string;
    };
  };
  functions?: {
    [name: string]: AppFunction;
  };
  jobs?: {
    [name: string]: AppJob;
  };
}
