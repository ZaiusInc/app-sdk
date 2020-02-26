import {z} from '@zaius/node-sdk';
import 'jest';
import {setContext} from '../../AppContext';
import {CampaignEvents} from '../CampaignEvents';

jest.mock('@zaius/node-sdk');

const CAMPAIGN_TRACKING = Object.freeze({
  campaign_schedule_run_ts: 1582240000,
  campaign: 'My Campaign',
  campaign_id: 10001,
  touchpoint_id: 10002,
  content: 'My Content',
  content_id: 10003,
  identifier_key: 'default'
});

describe('CampaignEvents', () => {
  let campaignEvents!: CampaignEvents;
  beforeEach(() => {
    setContext({manifest: {channel: {type: 'example'}}} as any);
    campaignEvents = new CampaignEvents('test_id', CAMPAIGN_TRACKING);
    jest.spyOn(z.identifier, 'updateReachability').mockResolvedValue({} as any);
    jest.spyOn(z.identifier, 'updateConsent').mockResolvedValue({} as any);
    jest.spyOn(z, 'event').mockResolvedValue({} as any);
  });
  afterEach(() => {
    (z.identifier.updateReachability as jest.Mock).mockReset();
    (z.identifier.updateConsent as jest.Mock).mockReset();
    (z.event as jest.Mock).mockReset();
  });

  describe('constructor', () => {
    it('provided type is preferred over manifest type', async () => {
      campaignEvents = new CampaignEvents('test_id', CAMPAIGN_TRACKING, 'exmpl');
      await campaignEvents.event('id1', 'sent');
      await campaignEvents.flush();
      expect(z.event).toHaveBeenCalledWith([expect.objectContaining({type: 'exmpl'})]);
    });

    it('throws an error if type is not provided', async () => {
      setContext({manifest: {channel: {type: undefined}}} as any);
      expect(() => new CampaignEvents('test_id', CAMPAIGN_TRACKING)).toThrowError('Type is required');
    });
  });

  describe('event', () => {
    it('produces an event with the campaign tracking info', async () => {
      await campaignEvents.event('id1', 'sent');
      await campaignEvents.flush();
      expect(z.event).toHaveBeenCalledWith([{
        identifiers: {
          test_id: 'id1'
        },
        type: 'example',
        action: 'sent',
        data: {
          ...CAMPAIGN_TRACKING,
          target_address: 'id1',
          ts: undefined
        }
      }]);
    });
  });

  describe('delivery', () => {
    it('produces a delivery event', async () => {
      await campaignEvents.delivery('id1', '2020-02-24T16:40:07Z', {_test: 'test1'});
      await campaignEvents.flush();
      expect(z.event).toHaveBeenCalledWith([{
        identifiers: {
          test_id: 'id1'
        },
        type: 'example',
        action: 'delivery',
        data: {
          ...CAMPAIGN_TRACKING,
          target_address: 'id1',
          ts: '2020-02-24T16:40:07Z',
          _test: 'test1'
        }
      }]);
    });
  });

  describe('open', () => {
    it('produces a open event', async () => {
      await campaignEvents.open('id1', new Date('2020-02-24T16:40:07Z'), {_test: 'test1'});
      await campaignEvents.flush();
      expect(z.event).toHaveBeenCalledWith([{
        identifiers: {
          test_id: 'id1'
        },
        type: 'example',
        action: 'open',
        data: {
          ...CAMPAIGN_TRACKING,
          target_address: 'id1',
          ts: '2020-02-24T16:40:07.000Z',
          _test: 'test1'
        }
      }]);
    });
  });

  describe('click', () => {
    it('produces a click event', async () => {
      await campaignEvents.click('id1', undefined, {_test: 'test1'});
      await campaignEvents.flush();
      expect(z.event).toHaveBeenCalledWith([{
        identifiers: {
          test_id: 'id1'
        },
        type: 'example',
        action: 'click',
        data: {
          ...CAMPAIGN_TRACKING,
          target_address: 'id1',
          ts: undefined,
          _test: 'test1'
        }
      }]);
    });
  });

  describe('engage', () => {
    it('produces a engage event', async () => {
      await campaignEvents.engage('id1', '2020-02-24T16:40:07Z', {_test: 'test1'});
      await campaignEvents.flush();
      expect(z.event).toHaveBeenCalledWith([{
        identifiers: {
          test_id: 'id1'
        },
        type: 'example',
        action: 'engage',
        data: {
          ...CAMPAIGN_TRACKING,
          target_address: 'id1',
          ts: '2020-02-24T16:40:07Z',
          _test: 'test1'
        }
      }]);
    });
  });

  describe('disengage', () => {
    it('produces a disengage event', async () => {
      await campaignEvents.disengage('id1', '2020-02-24T16:40:07Z', {_test: 'test1'});
      await campaignEvents.flush();
      expect(z.event).toHaveBeenCalledWith([{
        identifiers: {
          test_id: 'id1'
        },
        type: 'example',
        action: 'disengage',
        data: {
          ...CAMPAIGN_TRACKING,
          target_address: 'id1',
          ts: '2020-02-24T16:40:07Z',
          _test: 'test1'
        }
      }]);
    });
  });

  describe('hardBounce', () => {
    it('produces a reachability event', async () => {
      await campaignEvents.hardBounce('id1', 'n/a', '2020-02-24T16:40:07Z', {_test: 'test1'});
      await campaignEvents.flush();
      expect(z.identifier.updateReachability).toHaveBeenCalledWith([{
        identifier_field_name: 'test_id',
        identifier_value: 'id1',
        reachable: false,
        reachable_update_type: 'hard_bounce',
        reachable_update_reason: 'n/a',
        reachable_update_ts: '2020-02-24T16:40:07Z',
        event_data: {
          ...CAMPAIGN_TRACKING,
          _test: 'test1'
        }
      }]);
    });
  });

  describe('softBounce', () => {
    it('produces a soft_bounce event', async () => {
      await campaignEvents.softBounce('id1', 'delivery failure', '2020-02-24T16:40:07Z', {_test: 'test1'});
      await campaignEvents.flush();
      expect(z.event).toHaveBeenCalledWith([{
        identifiers: {
          test_id: 'id1'
        },
        type: 'example',
        action: 'soft_bounce',
        data: {
          ...CAMPAIGN_TRACKING,
          target_address: 'id1',
          ts: '2020-02-24T16:40:07Z',
          _test: 'test1',
          value: 'Reason: delivery failure'
        }
      }]);
    });
  });

  describe('optOut', () => {
    it('produces a consent opt-out event', async () => {
      await campaignEvents.optOut('id1', 'unsubscribed', 1582562407, {_test: 'test1'});
      await campaignEvents.flush();
      expect(z.identifier.updateConsent).toHaveBeenCalledWith([{
        identifier_field_name: 'test_id',
        identifier_value: 'id1',
        consent: false,
        consent_update_reason: 'unsubscribed',
        consent_update_ts: 1582562407,
        event_data: {
          ...CAMPAIGN_TRACKING,
          _test: 'test1',
        }
      }]);
    });
  });

  describe('optIn', () => {
    it('produces a consent opt-in event', async () => {
      await campaignEvents.optIn('id1', 'subscribed', 1582562407, {_test: 'test1'});
      await campaignEvents.flush();
      expect(z.identifier.updateConsent).toHaveBeenCalledWith([{
        identifier_field_name: 'test_id',
        identifier_value: 'id1',
        consent: true,
        consent_update_reason: 'subscribed',
        consent_update_ts: 1582562407,
        event_data: {
          ...CAMPAIGN_TRACKING,
          _test: 'test1',
        }
      }]);
    });
  });
});
