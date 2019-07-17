import * as app from '@zaius/app-sdk';

interface importJobStatus extends app.JobStatus {
  state: {
    counter: number;
  };
}

export class ImportMyData extends app.Job {
  public prepare(state?: importJobStatus): Promise<app.JobState> {
    return Promise.resolve({state: {counter: 0}, complete: false});
  }

  public perform(status: importJobStatus): Promise<app.JobState> {
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
