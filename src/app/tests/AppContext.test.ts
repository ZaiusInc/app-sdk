import 'jest';
import {AppContext, getAppContext, isGlobalContext} from '../AppContext';
import {AsyncLocalStorage} from 'async_hooks';
import {OCPContext} from '../../types';

describe('AppContext', () => {

  function runWithAsyncLocalStore(appContext: AppContext, code: () => void) {
    const ocpContextStorage = new AsyncLocalStorage<OCPContext>();
    global.ocpContextStorage = ocpContextStorage;

    const context = {
      ocpRuntime: {
        appContext
      }
    } as OCPContext;

    ocpContextStorage.run(context, code);
  }

  describe('getAppContext', () => {
    it('provides the context from OCP runtime from global context', () => {
      runWithAsyncLocalStore(
        {trackerId: 'foo'} as AppContext,
        () => {
          expect(getAppContext()).toEqual({trackerId: 'foo'});
        }
      );
    });
  });

  describe('isGlobalContext', () => {
    it('returns true if the context is for a global request', () => {
      runWithAsyncLocalStore(
        {trackerId: 'foo', installId: 1} as AppContext,
        () => {
          expect(isGlobalContext()).toEqual(false);
        }
      );

      runWithAsyncLocalStore(
        {trackerId: 'foo', installId: -1} as AppContext,
        () => {
          expect(isGlobalContext()).toEqual(true);
        }
      );

      runWithAsyncLocalStore(
        {trackerId: 'foo', installId: 0} as AppContext,
        () => {
          expect(isGlobalContext()).toEqual(true);
        }
      );
    });
  });
});
