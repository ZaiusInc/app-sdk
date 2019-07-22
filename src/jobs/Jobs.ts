import {ValueHash} from '..';
import {JobApi, JobDetail, JobRunStatus} from './JobApi';
import {LocalJobApi} from './LocalJobApi';

let jobsApi: JobApi = new LocalJobApi();

export const initializeJobApi = (api: JobApi) => {
  jobsApi = api;
};

// tslint:disable-next-line:variable-name
export const Jobs: JobApi = {
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
