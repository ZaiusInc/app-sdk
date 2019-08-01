import {ValueHash} from '..';
import {JobApi, JobDetail, JobRunStatus} from './JobApi';
import {LocalJobApi} from './LocalJobApi';

let jobsApi: JobApi = new LocalJobApi();

/**
 * @hidden
 */
export const initializeJobApi = (api: JobApi) => {
  jobsApi = api;
};

/**
 * The jobs api implementation
 */
export const jobs: JobApi = {
  trigger(jobName: string, parameters: ValueHash): Promise<JobDetail> {
    return jobsApi.trigger(jobName, parameters);
  },
  getDetail(jobId: string): Promise<JobDetail> {
    return jobsApi.getDetail(jobId);
  },
  getStatus(jobId: string): Promise<JobRunStatus> {
    return jobsApi.getStatus(jobId);
  }
};
