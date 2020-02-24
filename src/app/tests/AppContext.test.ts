import 'jest';
import {getAppContext, setContext} from '../AppContext';

describe('AppContext', () => {
  describe('getAppContext', () => {
    it('provides the previously set context', () => {
      setContext({trackerId: 'foo'} as any);
      expect(getAppContext()).toEqual({trackerId: 'foo'});
    });
  });
});
