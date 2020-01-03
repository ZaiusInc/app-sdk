import {FormData} from '@zaius/app-forms-schema';
import * as deepFreeze from 'deep-freeze';
import 'jest';
import {
  CampaignContent, CampaignDelivery, CampaignTracking, Channel, ChannelDeliverOptions, ChannelDeliverResult,
  ChannelPrepareOptions, ChannelPrepareResult, ChannelPublishOptions, ChannelValidateOptions
} from '../Channel';
import {ChannelContentResult, ChannelPreviewResult, ChannelTargetResult} from '../lib';
import {Runtime} from '../Runtime';
import {AppManifest} from '../types';
import {validateChannel} from './validateChannel';

const badManifest = deepFreeze({
  meta: {
    app_id: 'my_app',
    display_name: 'My App',
    version: '1.0.0',
    vendor: 'zaius',
    support_url: 'https://zaius.com',
    summary: 'This is an interesting app',
    contact_email: 'support@zaius.com',
    categories: ['Channel']
  },
  runtime: 'node12'
} as AppManifest);

const staticManifest = deepFreeze({
  meta: {
    app_id: 'my_app',
    display_name: 'My App',
    version: '1.0.0',
    vendor: 'zaius',
    support_url: 'https://zaius.com',
    summary: 'This is an interesting app',
    contact_email: 'support@zaius.com',
    categories: ['Channel']
  },
  runtime: 'node12',
  channel: {
    grouping: 'foo',
    targeting: [{identifier: 'my_app_identifier'}]
  }
} as AppManifest);

const dynamicManifest = deepFreeze({
  meta: {
    app_id: 'my_app',
    display_name: 'My App',
    version: '1.0.0',
    vendor: 'zaius',
    support_url: 'https://zaius.com',
    summary: 'This is an interesting app',
    contact_email: 'support@zaius.com',
    categories: ['Channel']
  },
  runtime: 'node12',
  channel: {
    grouping: 'foo',
    targeting: 'dynamic'
  }
} as AppManifest);

/* tslint:disable */
class NonExtendedChannel {
  // Nothing
}

abstract class PartialChannel extends Channel {
  protected constructor() {
    super();
  }
}

class ProperChannel extends Channel {
  public constructor() {
    super();
  }

  public async ready(): Promise<boolean> {
    return true;
  }

  public async validate(_content: CampaignContent, _options: ChannelValidateOptions): Promise<ChannelContentResult> {
    return new ChannelContentResult();
  }

  public async publish(
    _contentKey: string, _content: CampaignContent, _options: ChannelPublishOptions
  ): Promise<ChannelContentResult> {
    return new ChannelContentResult();
  }

  public async deliver(
    _contentKey: string,
    _tracking: CampaignTracking,
    _options: ChannelDeliverOptions,
    _batch: CampaignDelivery[],
    _previousResult?: ChannelDeliverResult
  ): Promise<ChannelDeliverResult> {
    return {success: true};
  }

  public async preview(_content: CampaignContent, _batch: CampaignDelivery[]): Promise<ChannelPreviewResult> {
    return new ChannelPreviewResult();
  }
}

class MoreProperChannel extends ProperChannel {
  public constructor() {
    super();
  }

  public async target(_contentSettings: FormData): Promise<ChannelTargetResult> {
    return new ChannelTargetResult();
  }

  public async prepare(
    _contentKey: string, _tracking: CampaignTracking, _options: ChannelPrepareOptions
  ): Promise<ChannelPrepareResult> {
    return {success: true};
  }
}
/* tslint:enable */

describe('validateChannel', () => {
  it('succeeds with a proper static-targeting definition', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: staticManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass').mockResolvedValue(ProperChannel);

    const errors = await validateChannel(runtime);

    expect(getChannelClass).toHaveBeenCalled();
    expect(errors).toEqual([]);

    getChannelClass.mockRestore();
  });

  it('succeeds with a proper dynamic-targeting definition', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: dynamicManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass').mockResolvedValue(MoreProperChannel);

    const errors = await validateChannel(runtime);

    expect(getChannelClass).toHaveBeenCalled();
    expect(errors).toEqual([]);

    getChannelClass.mockRestore();
  });

  it('detects missing channel configuration', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: badManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass').mockResolvedValue(ProperChannel);

    expect(await validateChannel(runtime)).toEqual([
      'Invalid app.yml: channel must exist when meta.categories includes "Channel"'
    ]);

    getChannelClass.mockRestore();
  });

  it('detects missing channel implementation', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: staticManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass')
      .mockRejectedValue(new Error('not found'));

    expect(await validateChannel(runtime)).toEqual(['Channel implementation not found']);

    getChannelClass.mockRestore();
  });

  it('detects non-extended channel implementation', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: staticManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass')
      .mockResolvedValue(NonExtendedChannel as any);

    expect(await validateChannel(runtime)).toEqual(['Channel implementation does not extend App.Channel']);

    getChannelClass.mockRestore();
  });

  it('detects partial channel implementation', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: staticManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass')
      .mockResolvedValue(PartialChannel as any);

    expect(await validateChannel(runtime)).toEqual([
      'Channel implementation is missing the ready method',
      'Channel implementation is missing the validate method',
      'Channel implementation is missing the publish method',
      'Channel implementation is missing the deliver method',
      'Channel implementation is missing the preview method'
    ]);

    getChannelClass.mockRestore();
  });

  it('detects missing target implementation when required', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: dynamicManifest, dirName: '/tmp/foo'}));
    const getChannelClass = jest.spyOn(Runtime.prototype, 'getChannelClass')
      .mockResolvedValue(ProperChannel as any);

    expect(await validateChannel(runtime)).toEqual([
      'Channel implementation is missing the target method (required for dynamic targeting mode)'
    ]);

    getChannelClass.mockRestore();
  });
});
