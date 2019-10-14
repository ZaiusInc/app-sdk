import {Schema} from '@zaius/app-forms-schema';
import {CampaignTargeting} from './types';

export abstract class Channel {
  public abstract async isReady(): Promise<boolean>;

  public async deriveTargeting?(setup: Schema.FormData): Promise<CampaignTargeting[]>;

  public abstract async publishContent(
    contentKey: string, content: CampaignContent, options: PublishingOptions
  ): Promise<PublishingResult>;

  public abstract async prepareForRun(
    contentKey: string, tracking: CampaignTracking, options: PreparationOptions
  ): Promise<PreparationResult>;

  public abstract async deliverBatch(
    contentKey: string,
    tracking: CampaignTracking,
    options: DeliveryOptions,
    batch: CampaignDelivery[],
    previousResult?: DeliveryResult
  ): Promise<DeliveryResult>;
}

export const CHANNEL_REQUIRED_METHODS = ['isReady', 'publishContent', 'prepareForRun', 'deliverBatch'];

export interface CampaignContent {
  setup: Schema.FormData;
  template: Schema.FormData;
  variables: string[];
}

export interface CampaignTracking {
  tracker_id: string;
  campaign_schedule_run_ts: number;
  campaign: string;
  campaign_id: number;
  campaign_group_id?: number;
  touchpoint_id: number;
  content: string;
  content_id: number;
  identifier_key: string;
}

export interface CampaignDelivery {
  recipient: {
    [identifier: string]: string[];
  };
  substitutions: {
    [variable: string]: string;
  };
}

export interface PublishingOptions {
  test?: boolean;
}

export interface PublishingResult {
  success: boolean;
  errors?: {
    [field: string]: string[]
  };
}

export interface PreparationOptions {
  test: boolean;
}

export interface PreparationResult {
  success: boolean;
  error?: string;
}

export interface DeliveryOptions {
  test: boolean;
}

export interface DeliveryResult {
  success: boolean;
  failureReason?: string;
  failureCount?: number;
  retryAfterSeconds?: number;
}
