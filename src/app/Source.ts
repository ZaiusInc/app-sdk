import { SourceEventForwarderApi } from '../sources';
import { Request } from './lib/Request';
import { Response } from './lib/Response';

export interface SourceConfiguration {
  dataSyncId: string;
  sourceKey: string;
  schema: string;
  webhookUrl?: string;
}

export interface SourceResponse {
  success: boolean;
  message?: string;
}

export interface SourceCreateResponse {
  success: boolean;
  message?: string;
}

export type SourceUpdateResponse = SourceResponse;
export type SourceDeleteResponse = SourceResponse;
export type SourceEnableResponse = SourceResponse;
export type SourcePauseResponse = SourceResponse;

export abstract class Source {
  protected config: SourceConfiguration;
  protected request: Request | null;
  protected sourceEventForwarder: SourceEventForwarderApi;

  public constructor(request: Request | null, config: SourceConfiguration, forwarder: SourceEventForwarderApi) {
    this.config = config;
    this.request = request;
    this.sourceEventForwarder = forwarder;
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
