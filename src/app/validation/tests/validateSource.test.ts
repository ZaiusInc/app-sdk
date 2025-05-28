/* eslint-disable max-classes-per-file */
import * as fs from 'fs';
import { SourceFunction } from '../../SourceFunction';
import { SourceCreateResponse, SourceDeleteResponse, SourceEnableResponse, SourceLifecycle, SourcePauseResponse, SourceUpdateResponse } from '../../SourceLifecycle';
import { Response } from '../../lib';
import { validateSources } from '../validateSources';
import {Job, JobStatus} from '../../Job';
import {ValueHash} from '../../../store';

class ValidSourceFunction extends SourceFunction {
  public async perform(): Promise<Response> {
    return new Response();
  }
}

class ValidSourceLifecycle extends SourceLifecycle {
  public async onSourceCreate(): Promise<SourceCreateResponse> {
    return {success: true};
  }
  public async onSourceUpdate(): Promise<SourceUpdateResponse> {
    return {success: true};
  }
  public async onSourceDelete(): Promise<SourceDeleteResponse> {
    return {success: true};
  }
  public async onSourceEnable(): Promise<SourceEnableResponse> {
    return {success: true};
  }
  public async onSourcePause(): Promise<SourcePauseResponse> {
    return {success: true};
  }
}

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

jest.spyOn(fs, 'existsSync');

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn().mockReturnValue('mocked'),
}));

const getRuntime = (name: string, config: object) => ({
  manifest: {
    sources: {
      [name]: config
    }
  },
  getSourceFunctionClass: jest.fn(),
  getSourceLifecycleClass: jest.fn(),
  getSourceJobClass: jest.fn()
});

describe('validateSources', () => {
  describe('basic validation', () => {

    it('should return error when source function cannot be loaded', async () => {
      const runtime: any = getRuntime('invalidFunctionEntry', {
        function: {
          entry_point: 'dne'
        },
        schema: 'validSchema'
      });
      const getSourceFunctionClass = jest.spyOn(runtime, 'getSourceFunctionClass')
        .mockRejectedValue(new Error('not found'));
      jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);

      const result = await validateSources(runtime);

      getSourceFunctionClass.mockRestore();

      expect(result).toContain('Error loading SourceFunction entry point invalidFunctionEntry. Error: not found');
    });

    it('should return error when source lifecycle cannot be loaded', async () => {
      const runtime: any = getRuntime('missingLifecycle', {
        function: {
          entry_point: 'SourceEntry'
        },
        schema: 'fooSchema',
        lifecycle: {
          entry_point: 'dne'
        }
      });
      const getSourceLifecycleClass = jest.spyOn(runtime, 'getSourceLifecycleClass')
        .mockRejectedValue(new Error('not found'));
      jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);

      const result = await validateSources(runtime);

      getSourceLifecycleClass.mockRestore();
      expect(result).toContain('Error loading SourceLifecycle entry point missingLifecycle. Error: not found');
    });

    it('should return error when schema is missing', async () => {
      const runtime: any = getRuntime('missingSchema', {
        function: {
          entry_point: 'SourceEntry'
        }
      });

      const result = await validateSources(runtime);

      expect(result).toContain('Source is missing the schema property: missingSchema');
    });

    it('should return error when schema is not a string', async () => {
      const runtime: any = getRuntime('invalidSchema', {
        function: {
          entry_point: 'SourceEntry'
        },
        schema: 123
      });

      const result = await validateSources(runtime);

      expect(result).toContain('Source schema property must be a string: invalidSchema');
    });

    it('should return no error when configuration is valid', async () => {
      const runtime: any = getRuntime('valid', {
        function: {
          entry_point: 'validSourceFunctionClass'
        },
        lifecycle: {
          entry_point: 'ValidSourceLifecycleClass'
        },
        schema: 'validSchema'
      });

      runtime.getSourceFunctionClass = () => ValidSourceFunction;
      (fs.existsSync as jest.Mock).mockImplementationOnce(() => true);
      jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);

      const result = await validateSources(runtime);

      expect(result.length).toEqual(0);
    });

    it('should return error when schema file is missing', async () => {
      const validRuntime: any = {
        manifest: {
          sources: {
            'validSource': {
              entry_point: 'validSourceClass',
              schema: 'validSchema'
            }
          }
        },
        getSourceFunctionClass: () => ValidSourceFunction,
        getSourceLifecycleClass: () => ValidSourceLifecycle
      };

      jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => false);
      const result = await validateSources(validRuntime);
      expect(result).toEqual(['File not found for Source schema validSchema']);
    });
  });

  describe('validate source lifecycle', () => {
    function getSourceLifecycleClassMissingMethod(methodName: string): typeof SourceLifecycle {
      class ModifiedSource extends ValidSourceLifecycle { }
      Object.defineProperty(ModifiedSource.prototype, methodName, {});
      return ModifiedSource;
    }

    const requiredMethods = [
      'onSourceCreate',
      'onSourceUpdate',
      'onSourceDelete',
      'onSourceEnable',
      'onSourcePause'
    ];

    requiredMethods.forEach((method) => {
      it(`should return error when source is missing the ${method} method`, async () => {
        const sourcelifecycleClass = getSourceLifecycleClassMissingMethod(method);

        const runtime: any = {
          manifest: {
            sources: {
              'testSource': {
                lifecycle: {
                  entry_point: 'testSourceClass'
                },
                schema: 'testSchema',
                function: {
                  entry_point: 'testSourceClass'
                }
              }
            }
          },
          getSourceLifecycleClass: () => sourcelifecycleClass,
          getSourceFunctionClass: () => ValidSourceFunction
        };

        (fs.existsSync as jest.Mock).mockImplementationOnce(() => true);
        const result = await validateSources(runtime);
        expect(result).toContain(`SourceLifecycle entry point is missing the ${method} method: testSourceClass`);
      });
    });
  });

  describe('validateJobs', () => {
    it('succeeds with a proper definition', async () => {
      const runtime: any = getRuntime('validSourceJobs', {
        jobs: {
          function: {
            entry_point: 'validSourceFunctionClass'
          },
          bar: {
            entry_point: 'ValidSourceJob'
          }
        },
        schema: 'fooSchema'
      });
      runtime.getSourceFunctionClass = () => ValidSourceFunction;
      runtime.getSourceJobClass = () => ProperBar;
      jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);

      const errors = await validateSources(runtime);
      expect(errors).toEqual([]);
    });

    it('should return error when source job cannot be loaded', async () => {
      const runtime: any = getRuntime('invalidJobEntry', {
        jobs: {
          bar: {
            entry_point: 'dne'
          }
        },
        schema: 'validSchema'
      });
      const getSourceJobClass = jest.spyOn(runtime, 'getSourceJobClass')
        .mockRejectedValue(new Error('not found'));
      jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);

      const result = await validateSources(runtime);

      getSourceJobClass.mockRestore();

      expect(result).toContain('Error loading job entry point bar. Error: not found');
    });

    it('detects non-extended job entry point', async () => {
      const runtime: any = getRuntime('nonExtendJob', {
        jobs: {
          bar: {
            entry_point: 'InvalidSourceJob'
          }
        },
        schema: 'validSchema'
      });

      runtime.getSourceJobClass = () => NonExtendedBar;
      jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);

      const errors = await validateSources(runtime);

      expect(errors).toContain('Job entry point does not extend App.Job: InvalidSourceJob');
    });
  });

});
