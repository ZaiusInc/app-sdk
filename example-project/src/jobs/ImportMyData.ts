import * as app from '@zaius/app-sdk';
import {JobStatus, ValueHash} from '@zaius/app-sdk';

interface ImportJobStatus extends app.JobStatus {
  state: {
    counter: number;
  };
}

export class ImportMyData extends app.Job {
  public prepare(params: ValueHash, state?: ImportJobStatus): Promise<JobStatus> {
    return Promise.resolve({state: {counter: 0}, complete: false});
  }

  public perform(status: ImportJobStatus): Promise<JobStatus> {
    return new Promise((resolve, _reject) => {
      // pretend to do some work...
      setTimeout(() => {
        status.state.counter += 1;
        if (status.state.counter > 10) {
          // set complete to true when done
          status.complete = true;
        }
        resolve(status);
      }, 1000);
    });
  }
}
