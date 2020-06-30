import {ValueHash} from '../../store';
import {ActiveAction, CampaignTargeting} from '../Channel';

// regenerate JSON schema with `yarn run update-schema`
export interface AppFunction {
  entry_point: string;
  description: string;
  global?: boolean;
}

export interface AppJob {
  entry_point: string;
  description: string;
  cron?: string;
  parameters?: ValueHash;
}

export interface AppLiquidExtension {
  entry_point: string;
  description: string;
  input?: {
    [name: string]: {
      type: 'string' | 'number' | 'boolean' | 'any';
      required: boolean;
      description: string;
    };
  };
}

export type AppCategory = 'Commerce Platform' | 'Point of Sale' | 'Lead Capture' | 'Advertising' | 'Marketing'
  | 'Channel' | 'Loyalty & Rewards' | 'Customer Experience' | 'Analytics & Reporting' | 'Surveys & Feedback'
  | 'Reviews & Ratings' | 'Content Management' | 'Data Quality & Enrichment' | 'Productivity' | 'CRM'
  | 'Accounting & Finance' | 'CDP / DMP' | 'Attribution & Linking' | 'Testing & Utilities'
  | 'Personalization & Content' | 'Offers' | 'Merchandising & Products' | 'Site & Content Experience';

export enum ChannelType {
  Email = 'email',
  AppPush = 'app_push',
  WebPush = 'web_push',
  WebModal = 'web_modal',
  WebEmbed = 'web_embed',
  SMS = 'sms',
  Api = 'api',
  DirectMail = 'direct_mail',
  WhatsApp = 'whatsapp',
  FacebookMessenger = 'facebook_messenger',
  Ad = 'ad',
  SegmentSync = 'segment_sync',
  TestChannel = 'test_channel'
}

/**
 * Defines a rate limit for channel delivery in to form of <count> per <unit>
 * where unit is `second`, `minute`, `hour`, `day`, or <number> of seconds.
 * E.g., count: 100, unit: 15 => 100 per 15 seconds
 */
export interface ChannelRateLimit {
  /**
   * The number of delivery requests (batches) per unit of time
   */
  count: number;
  /**
   * The unit of time to measure over. If a number, the unit will be that number of seconds.
   */
  unit: 'second' | 'minute' | 'hour' | 'day' | number;
  /**
   * Whether this rate limit applies to the app as a whole or per each install
   */
  grouping: 'app' | 'install';
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
    categories: AppCategory[];
  };
  runtime: 'node12';
  environment?: string[];
  functions?: {
    [name: string]: AppFunction;
  };
  jobs?: {
    [name: string]: AppJob;
  };
  liquid_extensions?: {
    [name: string]: AppLiquidExtension;
  };
  channel?: {
    type: ChannelType;
    targeting: 'dynamic' | CampaignTargeting[];
    options?: {
      prepare?: boolean;
    },
    delivery?: {
      batch_size?: number;
      concurrent_batches?: number;
      rate_limits?: ChannelRateLimit[];
    },
    events: {
      send: boolean;
      delivery: boolean;
      delivery_unknown: boolean;
      active_actions?: ActiveAction[];
      hard_bounce: boolean;
      soft_bounce: boolean;
      spam_report: boolean;
    }
  };
}

export const APP_ID_FORMAT = /^[a-z][a-z_0-9]{2,31}$/;
export const VERSION_FORMAT = /^\d+\.\d+\.\d+(-(((dev|beta)(\.\d+)?)|private))?$/;
export const VENDOR_FORMAT = /^[a-z0-9]+(_[a-z0-9]+)*$/;
