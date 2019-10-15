import {Schema} from '@zaius/app-forms-schema';

/**
 * Defines the interface of a channel. The typical channel flow in a campaign run is as follows:
 * 1. Check if the channel is `ready` to use
 * 2. Dynamically determine the `target` (may be provided statically in `app.yml` instead)
 * 3. `publish` the content template (in the future, this will instead happen when the campaign is modified)
 * 4. `prepare` for the run (if the method is implemented)
 * 5. `deliver` the content to batches of recipients with substitutions
 */
export abstract class Channel {
  /**
   * Checks if the channel is ready to use. This should ensure that any required credentials and/or other configuration
   * exist and are valid. Reasonable caching should be utilized to prevent excessive requests to external resources.
   * @async
   * @returns true if the channel is ready to use
   */
  public abstract async ready(): Promise<boolean>;

  /**
   * Dynamically determines campaign targeting requirements. If targeting is always known ahead of time, this should
   * be specified statically via `channel.targeting` in `app.yml`. If targeting is based on selections made in the
   * channel setup form, this method must be implemented and the value in `app.yml` must be set to `dynamic`.
   * @async
   * @param setup contents of the channel setup form
   * @returns array of targeting requirements
   */
  public async target?(setup: Schema.FormData): Promise<CampaignTargeting[]>;

  /**
   * Publishes the given content. This is the place to perform any necessary transformations between the given template
   * format and the external system's format. It should also perform any necessary validations on the input data. If it
   * is found to be invalid, the pertinent error messages should be provided in the result, keyed by
   * `form.section.field`.
   * <p>
   * If the content must be stored in an external system, this is also the time to do that. If the content must instead
   * be known in `prepare` or `deliver`, it should be placed in the document store for future use.
   * <p>
   * This method may be called multiple times with the same content key. But for a given content key, it will always
   * be called with the same content and options. As such, once successful, it should be treated as an idempotent
   * operation at the content key level. So if the given key has already been processed and successfully stored, there
   * is no need to process and store it again.
   * @async
   * @param contentKey unique key for the content
   * @param content the content with translated templates
   * @param options additional options
   * @returns result of the operation
   */
  public abstract async publish(
    contentKey: string, content: CampaignContent, options: PublishOptions
  ): Promise<PublishResult>;

  /**
   * Prepares for a campaign run. This can be used to set up an external entity for use in `deliver` (or perform any
   * other processing that should only be performed once per run). If this step is unnecessary, simply do not implement
   * the method.
   * <p>
   * If implemented, this method will be called exactly once per content key involved in a campaign run. If any one of
   * these fails, the campaign run will fail.
   * @async
   * @param contentKey unique key of the content
   * @param tracking campaign tracking parameters
   * @param options additional options
   * @returns result of the operation
   */
  public abstract async prepare?(
    contentKey: string, tracking: CampaignTracking, options: PrepareOptions
  ): Promise<PrepareResult>;

  /**
   * Delivers a batch of messages. This method may be called many times for the same content key, tracking parameters,
   * and options, each with a unique batch of recipients and substitutions. It is assumed that a batch either succeeds
   * or fails as a whole. There is no partial delivery handling.
   * <p>
   * If a batch fails, it may be retried (as controlled by the return value). When that happens, the subsequent call(s)
   * for that batch will be given the previous result for reference to enable proper recovery logic.
   * <p>
   * Once a batch succeeds, it will never be given again.
   * @async
   * @param contentKey unique key of the content
   * @param tracking campaign tracking parameters
   * @param options additional options
   * @param batch of recipients and substitutions
   * @param previousResult previous result of the operation, if this is a retry
   * @returns result of the operation
   */
  public abstract async deliver(
    contentKey: string,
    tracking: CampaignTracking,
    options: DeliverOptions,
    batch: CampaignDelivery[],
    previousResult?: DeliverResult
  ): Promise<DeliverResult>;
}

/**
 * @hidden
 */
export const CHANNEL_REQUIRED_METHODS = ['ready', 'publish', 'deliver'];

/**
 * Defines the targeting requirements for a channel.
 */
export interface CampaignTargeting {
  /**
   * The customer identifier field to target.
   */
  identifier: string;
  /**
   * Any additional data to include on the events generated by the campaign run.
   */
  event_data?: {
    [field: string]: string | number | boolean;
  };
}

/**
 * The translated content template.
 */
export interface CampaignContent {
  /**
   * Static data from the channel setup form. This is the same data sent to {@link Channel.target}.
   */
  setup: Schema.FormData;
  /**
   * Potentially dynamic data from the channel template form. Any string fields that contained Zaius Liquid have been
   * translated into a simple substitution template where substitution sources are of the form `%%name%%`.
   */
  template: Schema.FormData;
  /**
   * The complete set of variable names used within all template fields. Eg, if the template consists of
   * `Hello, %%b0%%. Still interested in that %%b1%%? Buy now at %%b2%%!`, the set of variables would be
   * `['b0', 'b1', 'b2']`. This information can be helpful when translating templates into external formats,
   * performing substitutions locally, etc.
   */
  variables: string[];
}

/**
 * Campaign tracking fields that must be included on all correlated events (eg, opens and clicks).
 */
export interface CampaignTracking {
  campaign_schedule_run_ts: number;
  campaign: string;
  campaign_id: number;
  campaign_group_id?: number;
  touchpoint_id: number;
  content: string;
  content_id: number;
  identifier_key: string;
}

/**
 * Delivery details for a single recipient.
 */
export interface CampaignDelivery {
  /**
   * The identifier field(s) and value(s) to deliver to.
   */
  recipient: {
    [identifier: string]: string[];
  };
  /**
   * The substitution values for personalizing this delivery. The keys of this hash match the variable names specified
   * in {@link CampaignContent.variables} for the content referenced by {@link Channel.deliver}.
   */
  substitutions: {
    [variable: string]: string;
  };
}

/**
 * Options for {@link Channel.publish}.
 */
export interface PublishOptions {
  /**
   * Whether this is for a test send.
   */
  test?: boolean;
}

/**
 * Result of {@link Channel.publish}.
 */
export interface PublishResult {
  /**
   * Whether the call succeeded.
   */
  success: boolean;
  /**
   * If the call failed, a set of user-facing error messages. When relevant (eg, validation errors), keys should be
   * fully-qualified field references of the form `form.section.field`, eg, `setup.sender.from_address`.
   */
  errors?: {
    [qualifiedField: string]: string[]
  };
}

/**
 * Options for {@link Channel.prepare}.
 */
export interface PrepareOptions {
  /**
   * Whether this is for a test send.
   */
  test?: boolean;
}

/**
 * Result of {@link Channel.prepare}.
 */
export interface PrepareResult {
  /**
   * Whether the call succeeded.
   */
  success: boolean;
  /**
   * If the call failed, a reason for the failure.
   */
  error?: string;
}

/**
 * Options for {@link Channel.deliver}.
 */
export interface DeliverOptions {
  /**
   * Whether this is for a test send.
   */
  test?: boolean;
}

/**
 * Result of {@link Channel.deliver}.
 */
export interface DeliverResult {
  /**
   * Whether the call succeeded.
   */
  success: boolean;
  /**
   * If the call failed, an internal reason for the failure (not necessarily human-readable). This must include any
   * information that a subsequent retry would need to perform its recovery logic.
   */
  failureReason?: string;
  /**
   * The number of times this batch has failed.
   */
  failureCount?: number;
  /**
   * If the failure is retriable, the number of seconds to wait before retrying.
   */
  retryAfterSeconds?: number;
}
