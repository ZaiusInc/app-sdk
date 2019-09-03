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

export type AppCategory = 'eCommerce' | 'Point of Sale' | 'Lead Capture' | 'Advertising' | 'Marketing Automation'
  | 'Channel' | 'Loyalty & Rewards' | 'Customer Success' | 'Analytics & Reporting' | 'Surveys & Feedback'
  | 'Reviews & Ratings' | 'Content Management' | 'Data Quality & Enrichment' | 'Productivity' | 'CRM'
  | 'Accounting & Finance' | 'Database / Connector' | 'Attribution & Linking' | 'Testing & Utilities'
  | 'Personalization & Content';

export interface AppManifest {
  meta: {
    app_id: string;
    display_name: string;
    version: string;
    vendor: string;
    support_url: string;
    summary: string;
    contact_email: string;
    categories: AppCategory[];
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

export const APP_ID_FORMAT = /^[a-z][a-z_0-9]{2,31}$/;
export const VENDOR_FORMAT = /^[a-z0-9]+(_[a-z0-9]+)*$/;
