import 'jest';
import {getAppContext, isGlobalContext} from '../AppContext';

describe('AppContext', () => {
  describe('getAppContext', () => {
    it('provides the context from OCP runtime from global context', () => {
      global.ocpRuntime = {
        appContext: {trackerId: 'foo'}
      } as any;
      expect(getAppContext()).toEqual({trackerId: 'foo'});
    });
  });

  describe('isGlobalContext', () => {
    it('returns true if the context is for a global request', () => {
      global.ocpRuntime = {
        appContext: {trackerId: 'foo', installId: 1}
      } as any;
      expect(isGlobalContext()).toEqual(false);

      global.ocpRuntime = {
        appContext: {trackerId: 'foo', installId: -1}
      } as any;
      expect(isGlobalContext()).toEqual(true);

      global.ocpRuntime = {
        appContext: {trackerId: 'foo', installId: 0}
      } as any;
      expect(isGlobalContext()).toEqual(true);
    });
  });
});
