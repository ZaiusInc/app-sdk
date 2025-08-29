import 'jest';
import {Form} from '../forms';
import {storage} from '../../../store';

describe('Forms', () => {
  it('sets and retrieves openSection', async () => {
    expect(await storage.settings.get('$formState')).toEqual({});
    expect(await Form.getDefaultSection()).toBeUndefined();

    await Form.setDefaultSection('foo');
    expect(await storage.settings.get('$formState')).toEqual({defaultSection: 'foo'});
    expect(await Form.getDefaultSection()).toEqual('foo');

    await Form.clearDefaultSection();
    expect(await storage.settings.get('$formState')).toEqual({});
    expect(await Form.getDefaultSection()).toBeUndefined();
  });
});
