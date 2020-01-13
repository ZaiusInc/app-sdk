import 'jest';
import {ValueHash} from '..';
import {Job, JobStatus} from './Job';

class MyJob extends Job {
  public async prepare(
    _params: ValueHash, _status?: JobStatus | undefined, _resuming?: boolean | undefined
  ): Promise<JobStatus> {
    return {state: {}, complete: false};
  }

  public async perform(status: JobStatus): Promise<JobStatus> {
    status.complete = true;
    return status;
  }
}

describe('Job', () => {
  describe('performInterruptableTask', () => {
    it('marks the job interruptable during the task', async () => {
      const job = new MyJob({} as any);
      expect.assertions(3);
      expect(job.isInterruptable).toBe(false);
      await job['performInterruptableTask'](async () => {
        expect(job.isInterruptable).toBe(true);
      });
      expect(job.isInterruptable).toBe(false);
    });

    it('restores the original isInterruptable value after', async () => {
      const job = new MyJob({} as any);
      expect.assertions(2);
      job.isInterruptable = true;
      await job['performInterruptableTask'](async () => {
        expect(job.isInterruptable).toBe(true);
      });
      expect(job.isInterruptable).toBe(true);
    });

    it('restores isInterruptable after an exception', async () => {
      const job = new MyJob({} as any);
      expect.assertions(2);
      try {
        await job['performInterruptableTask'](async () => {
          expect(job.isInterruptable).toBe(true);
          throw new Error('error');
        });
      } catch (e) {
        expect(job.isInterruptable).toBe(false);
      }
    });
  });

  describe('sleep', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runAllTimers();
      jest.useRealTimers();
    });

    /**
     * These are a little weird because of jest + fake timers + promises.
     * Can't actually prove they sleep the specified time, but can prove they sleep
     * LESS THAN OR EQUAL TO the specified time.
     */
    it('sleeps for the specified time', () => {
      expect.assertions(3);
      const job = new MyJob({} as any);
      let complete = false;
      const p = job['sleep'](2000).then(() => {
        complete = true;
        expect(job.isInterruptable).toBe(false);
      });

      expect(job.isInterruptable).toBe(false);
      expect(complete).toBe(false);
      jest.advanceTimersByTime(2000);
      return p;
    });

    it('sleeps for zero miliseconds if unspecified', async () => {
      const job = new MyJob({} as any);
      const setTimeoutFn = jest.spyOn(global, 'setTimeout').mockImplementation((resolve: any) => resolve());
      await job['sleep']();

      expect(setTimeoutFn).toHaveBeenCalledWith(expect.anything(), 0);
    });

    it('marks the job interruptable during sleep if specified', () => {
      expect.assertions(2);
      const job = new MyJob({} as any);
      const promise = job['sleep'](2000, {interruptable: true}).then(() => {
        expect(job.isInterruptable).toBe(false);
      });

      expect(job.isInterruptable).toBe(true);
      jest.advanceTimersByTime(2000);
      return promise;
    });

    it('restores the original isInterruptable value after sleep', () => {
      expect.assertions(2);
      const job = new MyJob({} as any);
      job.isInterruptable = true;
      const promise = job['sleep'](2000, {interruptable: true}).then(() => {
        expect(job.isInterruptable).toBe(true);
      });

      expect(job.isInterruptable).toBe(true);
      jest.advanceTimersByTime(2000);
      return promise;
    });
  });
});
