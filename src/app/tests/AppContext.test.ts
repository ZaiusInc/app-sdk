import 'jest';
import {getAppContext, isGlobalContext, setContext} from '../AppContext';

describe('AppContext', () => {
  describe('getAppContext', () => {
    it('provides the previously set context', () => {
      setContext({trackerId: 'foo'} as any);
      expect(getAppContext()).toEqual({trackerId: 'foo'});
    });
  });

  describe('isGlobalContext', () => {
    it('returns true if the context is for a global request', () => {
      setContext({trackerId: 'foo', installId: 1} as any);
      expect(isGlobalContext()).toEqual(false);

      setContext({trackerId: 'foo', installId: -1} as any);
      expect(isGlobalContext()).toEqual(true);

      setContext({trackerId: 'foo', installId: 0} as any);
      expect(isGlobalContext()).toEqual(true);
    });
  });
});
