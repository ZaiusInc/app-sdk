import {ValueHash} from '../../store';
import {CampaignTargeting} from '../Channel';
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

export type AppCategory = 'Commerce Platform' | 'Point of Sale' | 'Lead Capture' | 'Advertising' | 'Marketing'
  | 'Channel' | 'Loyalty & Rewards' | 'Customer Experience' | 'Analytics & Reporting' | 'Surveys & Feedback'
  | 'Reviews & Ratings' | 'Content Management' | 'Data Quality & Enrichment' | 'Productivity' | 'CRM'
  | 'Accounting & Finance' | 'CDP / DMP' | 'Attribution & Linking' | 'Testing & Utilities'
  | 'Personalization & Content' | 'Offers' | 'Merchandising & Products' | 'Site & Content Experience';

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
  channel?: {
    grouping: string;
    targeting: 'dynamic' | CampaignTargeting[];
    options?: {
      prepare?: boolean;
    }
  };
}

export const APP_ID_FORMAT = /^[a-z][a-z_0-9]{2,31}$/;
export const VERSION_FORMAT = /^\d+\.\d+\.\d+(-(((dev|beta)(\.\d+)?)|private))?$/;
export const VENDOR_FORMAT = /^[a-z0-9]+(_[a-z0-9]+)*$/;
