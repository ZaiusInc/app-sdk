import {Notifier} from './Notifier';

const noop = () => {/**/};

/**
 * @hidden
 * A simple noop stub of the notifier api
 */
export class LocalNotifier implements Notifier {
  public info(_activity: string, _title: string, _summary: string, _details?: string): Promise<void> {
    return Promise.resolve(noop());
  }

  public success(_activity: string, _title: string, _summary: string, _details?: string): Promise<void> {
    return Promise.resolve(noop());
  }

  public warn(_activity: string, _title: string, _summary: string, _details?: string): Promise<void> {
    return Promise.resolve(noop());
  }

  public error(_activity: string, _title: string, _summary: string, _details?: string): Promise<void> {
    return Promise.resolve(noop());
  }
}
