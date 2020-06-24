import 'jest';
import {Form} from '../forms';
import {storage} from '../../../store';

describe('Forms', () => {
  it('sets and retrieves openSection', async () => {
    expect(await storage.settings.get('$formState')).toEqual({});
    expect(await Form.getOpenSection()).toBeUndefined();

    await Form.setOpenSection('foo');
    expect(await storage.settings.get('$formState')).toEqual({openSection: 'foo'});
    expect(await Form.getOpenSection()).toEqual('foo');

    await Form.clearOpenSection();
    expect(await storage.settings.get('$formState')).toEqual({});
    expect(await Form.getOpenSection()).toBeUndefined();
  });
});
