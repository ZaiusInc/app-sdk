import {ActivityApi} from './ActivityApi';

// tslint:disable-next-line:only-arrow-functions
const noop = function() { /**/ };

/**
 * A simple noop stub of the activity api
 */
export class LocalActivityApi implements ActivityApi {
  public info(_activity: string, _details: string) {
    noop();
  }

  public success(_activity: string, _details: string) {
    noop();
  }

  public warn(_activity: string, _details: string) {
    noop();
  }

  public error(_activity: string, _details: string) {
    noop();
  }
}
