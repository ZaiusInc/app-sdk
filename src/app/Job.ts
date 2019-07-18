import {ValueHash} from '../store';

export interface JobInvocation {
  jobId: string;
  scheduledAt: Date;
  parameters: ValueHash;
}

export interface JobStatus extends ValueHash {
  state: ValueHash;
  complete: boolean;
}

export abstract class Job {
  /**
   * Initializes a job to be run
   * @param invocation details of the job invocation
   */
  // @ts-ignore: 6138 declared but never read
  public constructor(protected invocation: JobInvocation) {
  }

  /**
   * Prepares to run a job. Prepare is called at the start of a job
   * and again only if the job was interrupted and is being resumed.
   * Use this function to read secrets and establish connections to simplify the job loop (perform).
   * @param params a hash if params were supplied to the job run, otherwise an empty hash
   * @param status if job was interrupted and should continue from the last known state
   */
  public abstract async prepare(params: ValueHash, status?: JobStatus): Promise<JobStatus>;

  /**
   * Performs a unit of work. Jobs should perform a small unit of work and then return the current state.
   * Perform is called in a loop where the previously returned state will be given to the next iteration.
   * Iteration will continue until the returned state.complete is set to true.
   * @param status last known job state and status
   * @returns The current JobStatus/state that can be used to perform the next iteration or resume a job if interrupted.
   */
  public abstract async perform(status: JobStatus): Promise<JobStatus>;
}
