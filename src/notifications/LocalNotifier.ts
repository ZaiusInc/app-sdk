import {Notifier} from './Notifier';

// tslint:disable-next-line:only-arrow-functions
const noop = function() { /**/ };

/**
 * A simple noop stub of the notifier api
 */
export class LocalNotifier implements Notifier {
  public info(_title: string, _activity: string, _summary: string, _details: string) {
    noop();
  }

  public success(_title: string, _activity: string, _summary: string, _details: string) {
    noop();
  }

  public warn(_title: string, _activity: string, _summary: string, _details: string) {
    noop();
  }

  public error(_title: string, _activity: string, _summary: string, _details: string) {
    noop();
  }
}
