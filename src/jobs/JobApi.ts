import {ValueHash} from '../store';

export enum JobRunStatus {
  Pending = 0,
  Scheduled = 1,
  Running = 2,
  Complete = 3,
  Error = 4,
  Terminated = 5
}

export interface JobDefinition {
  name: string;
  parameters?: ValueHash;
}

export interface JobDetail {
  jobId: string;
  status: JobRunStatus;
  definition: JobDefinition;
  errors: string;
  startedAt?: Date;
  completedAt?: Date;
  terminatedAt?: Date;
}

export class JobApiError extends Error {}

export interface JobApi {
  trigger(jobName: string, parameters: ValueHash): Promise<JobDetail>;
  getDetail(jobId: string): Promise<JobDetail>;
  getStatus(jobId: string): Promise<JobRunStatus>;
}
