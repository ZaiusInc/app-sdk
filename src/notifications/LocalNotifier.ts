import {Notifier} from './Notifier';

// tslint:disable-next-line:only-arrow-functions
const noop = function() { /**/ };

/**
 * @hidden
 * A simple noop stub of the notifier api
 */
export class LocalNotifier implements Notifier {
  public info(_activity: string, _title: string, _summary: string, _details?: string) {
    noop();
  }

  public success(_activity: string, _title: string, _summary: string, _details?: string) {
    noop();
  }

  public warn(_activity: string, _title: string, _summary: string, _details?: string) {
    noop();
  }

  public error(_activity: string, _title: string, _summary: string, _details?: string) {
    noop();
  }
}
