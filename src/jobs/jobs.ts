import {ValueHash} from '..';
import {JobApi, JobDetail, JobRunStatus} from './JobApi';
import {LocalJobApi} from './LocalJobApi';
import {getOCPContext} from '../app';

const localJobsApi: JobApi = new LocalJobApi();

function getJobApi(): JobApi {
  return getOCPContext()?.ocpRuntime?.jobApi || localJobsApi;
}

/**
 * The jobs api implementation
 */
export const jobs: JobApi = {
  trigger(jobName: string, parameters: ValueHash): Promise<JobDetail> {
    return getJobApi().trigger(jobName, parameters);
  },
  getDetail(jobId: string): Promise<JobDetail> {
    return getJobApi().getDetail(jobId);
  },
  getStatus(jobId: string): Promise<JobRunStatus> {
    return getJobApi().getStatus(jobId);
  }
};
