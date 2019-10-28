import 'jest';
import {ChannelPublishResult} from './ChannelPublishResult';

describe('ChannelPublishResult', () => {
  describe('addError', () => {
    it('adds errors for specific fields', () => {
      const result = new ChannelPublishResult()
        .addError('settings', 'sender', 'name', 'Cannot be blank')
        .addError('template', 'message', 'title', 'Must be less than 50 characters')
        .addError('template', 'message', 'title', 'Cannot contain special characters');
      expect(result['errors']).toEqual({
        'settings.sender.name': ['Cannot be blank'],
        'template.message.title': ['Must be less than 50 characters', 'Cannot contain special characters']
      });
    });
  });

  describe('getResponse', () => {
    it('produces a response no errors or toasts', () => {
      expect(new ChannelPublishResult().getResponse()).toEqual({
        errors: {},
        toasts: []
      });
    });

    it('includes errors and toasts in the response', () => {
      const result = new ChannelPublishResult()
        .addError('template', 'message', 'title', 'Must be less than 50 characters')
        .addToast('danger', 'Publish failed');
      expect(result.getResponse()).toEqual({
        errors: {'template.message.title': ['Must be less than 50 characters']},
        toasts: [{intent: 'danger', message: 'Publish failed'}]
      });
    });
  });
});
