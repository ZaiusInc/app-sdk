/* eslint-disable max-classes-per-file */
import * as deepFreeze from 'deep-freeze';
import 'jest';
import {ValueHash} from '../../../store';
import {Job, JobStatus} from '../../Job';
import {Runtime} from '../../Runtime';
import {AppManifest} from '../../types';
import {validateSourceJobs} from '../validateSourceJobs';

const appManifest = deepFreeze({
  meta: {
    app_id: 'my_app',
    display_name: 'My App',
    version: '1.0.0',
    vendor: 'zaius',
    support_url: 'https://zaius.com',
    summary: 'This is an interesting app',
    contact_email: 'support@zaius.com',
    categories: ['Commerce Platform'],
    availability: ['all']
  },
  runtime: 'node18',
  functions: {
    foo: {
      entry_point: 'Foo',
      description: 'gets foo'
    }
  },
  source_jobs: {
    bar: {
      entry_point: 'Bar',
      description: 'Does a thing'
    }
  }
} as AppManifest);

class NonExtendedBar {
  public async prepare(_status?: JobStatus): Promise<JobStatus> {
    return {complete: false, state: {}};
  }
  public async perform(status: JobStatus): Promise<JobStatus> {
    return status;
  }
}
class ProperBar extends Job {
  public async prepare(params: ValueHash, _status?: JobStatus, _resuming?: boolean): Promise<JobStatus> {
    return {complete: false, state: params};
  }
  public async perform(status: JobStatus): Promise<JobStatus> {
    return status;
  }
}
/* tslint:disable */

describe('validateJobs', () => {
  it('succeeds with a proper definition', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getSourceJobClass = jest.spyOn(Runtime.prototype, 'getSourceJobClass').mockResolvedValue(ProperBar);

    const errors = await validateSourceJobs(runtime);

    expect(getSourceJobClass).toHaveBeenCalledWith('bar');
    expect(errors).toEqual([]);

    getSourceJobClass.mockRestore();
  });

  it('detects missing job entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getSourceJobClass =
    jest.spyOn(Runtime.prototype, 'getSourceJobClass').mockRejectedValue(new Error('not found'));

    expect(await validateSourceJobs(runtime)).toEqual(['Error loading entry point bar. Error: not found']);

    getSourceJobClass.mockRestore();
  });

  it('detects non-extended job entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getSourceJobClass = jest.spyOn(Runtime.prototype, 'getSourceJobClass').mockReturnValue(NonExtendedBar as any);

    expect(await validateSourceJobs(runtime)).toEqual(['Job entry point does not extend App.Job: Bar']);

    getSourceJobClass.mockRestore();
  });
});
