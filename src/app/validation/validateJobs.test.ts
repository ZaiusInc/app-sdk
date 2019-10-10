import * as deepFreeze from 'deep-freeze';
import 'jest';
import {ValueHash} from '../../store';
import {Job, JobStatus} from '../Job';
import {Runtime} from '../Runtime';
import {AppManifest} from '../types';
import {validateJobs} from './validateJobs';

const appManifest = deepFreeze({
  meta: {
    app_id: 'my_app',
    display_name: 'My App',
    version: '1.0.0',
    vendor: 'zaius',
    support_url: 'https://zaius.com',
    summary: 'This is an interesting app',
    contact_email: 'support@zaius.com',
    categories: ['Commerce Platform']
  },
  runtime: 'node12',
  functions: {
    foo: {
      method: 'GET',
      entry_point: 'Foo',
      description: 'gets foo'
    }
  },
  jobs: {
    bar: {
      entry_point: 'Bar',
      description: 'Does a thing'
    }
  }
} as AppManifest);

/* tslint:disable */
class NonExtendedBar {
  public async prepare(_status?: JobStatus): Promise<JobStatus> {
    return {complete: false, state: {}};
  }
  public async perform(status: JobStatus): Promise<JobStatus> {
    return status;
  }
}

// @ts-ignore
class PartialBar extends Job {
  // Nothing
}

class ProperBar extends Job {
  public async prepare(params: ValueHash, _status?: JobStatus): Promise<JobStatus> {
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
    const getJobClass = jest.spyOn(Runtime.prototype, 'getJobClass').mockResolvedValue(ProperBar);

    const errors = await validateJobs(runtime);

    expect(getJobClass).toHaveBeenCalledWith('bar');
    expect(errors).toEqual([]);

    getJobClass.mockRestore();
  });

  it('detects missing job entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getJobClass = jest.spyOn(Runtime.prototype, 'getJobClass').mockRejectedValue(new Error('not found'));

    expect(await validateJobs(runtime)).toEqual(['Entry point not found for job: bar']);

    getJobClass.mockRestore();
  });

  it('detects non-extended job entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getJobClass = jest.spyOn(Runtime.prototype, 'getJobClass').mockReturnValue(NonExtendedBar as any);

    expect(await validateJobs(runtime)).toEqual(['Job entry point does not extend App.Job: Bar']);

    getJobClass.mockRestore();
  });

  it('detects partial job entry point', async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    const getJobClass = jest.spyOn(Runtime.prototype, 'getJobClass').mockReturnValue(PartialBar as any);

    expect(await validateJobs(runtime)).toEqual([
      'Job entry point is missing the prepare method: Bar',
      'Job entry point is missing the perform method: Bar'
    ]);

    getJobClass.mockRestore();
  });
});
