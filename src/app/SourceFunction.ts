import { Source } from '../sources/Source';
import { Request } from './lib/Request';
import { Response } from './lib/Response';

export interface SourceConfiguration {
  dataSyncId: string;
  sourceKey: string;
  schema: string;
  webhookUrl?: string;
}

export interface SourceCallbackResponse {
  success: boolean;
  message?: string;
}

export type SourceCreateResponse = SourceCallbackResponse;
export type SourceUpdateResponse = SourceCallbackResponse;
export type SourceDeleteResponse = SourceCallbackResponse;
export type SourceEnableResponse = SourceCallbackResponse;
export type SourcePauseResponse = SourceCallbackResponse;

export abstract class SourceFunction {
  protected config: SourceConfiguration;
  protected request: Request | null;
  protected source: Source | null;

  public constructor(config: SourceConfiguration, request: Request | null, source: Source | null) {
    this.config = config;
    this.request = request;
    this.source = source;
  }

  /**
   * Called when a sources is created.
   * Use this method to setup the source webhooks so it is in a state
   * to recieve data.
   */
  public abstract onSourceCreate(): Promise<SourceCreateResponse>;

  /**
   * Called when a sources is updated.
   * Use this method to update the source webhooks so it is in a state
   * to recieve data.
   */
  public abstract onSourceUpdate(): Promise<SourceUpdateResponse>;

  /**
   * Called when a sources is deleted.
   * Use this method to perform any cleanup tasks.
   */
  public abstract onSourceDelete(): Promise<SourceDeleteResponse>;

  /**
   * Called when a sources is enabled.
   */
  public abstract onSourceEnable(): Promise<SourceEnableResponse>;

  /**
   * Called when a sources is paused.
   */
  public abstract onSourcePause(): Promise<SourcePauseResponse>;

  public abstract perform(): Promise<Response>;
}
