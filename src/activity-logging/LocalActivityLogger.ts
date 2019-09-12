import {ActivityLogger} from './ActivityLogger';

// tslint:disable-next-line:only-arrow-functions
const noop = function() { /**/ };

/**
 * A simple noop stub of the activity api
 */
export class LocalActivityLogger implements ActivityLogger {
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
