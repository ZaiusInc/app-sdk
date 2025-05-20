/* eslint-disable max-classes-per-file */
import * as fs from 'fs';
import { Source, SourceCreateResponse, SourceDeleteResponse, SourceEnableResponse, SourcePauseResponse, SourceUpdateResponse } from '../../Source';
import { Response } from '../../lib';
import { validateSources } from '../validateSources';

class ValidSource extends Source {
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
  public async perform(): Promise<Response> {
    return new Response();
  }
}

jest.spyOn(fs, 'existsSync');

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn().mockReturnValue('mocked'),
}));

describe('validateSources', () => {
  describe('basic validation', () => {
    const invalidRuntime: any = {
      manifest: {
        sources: {
          'validSource': {
            entry_point: 'validSourceClass',
            schema: 'validSchema'
          },
          'missingSchema': {
            entry_point: 'missingSchemaClass'
          },
          'invalidSchema': {
            entry_point: 'invalidSchemaClass',
            schema: 123
          },
        }
      },
      getSourceFunctionClass: jest.fn()
    };

    it('should return error when source webhook cannot be loaded', async () => {
      const getSourceFunctionClass = jest.spyOn(invalidRuntime, 'getSourceFunctionClass')
        .mockRejectedValue(new Error('not found'));
      const result = await validateSources(invalidRuntime);
      getSourceFunctionClass.mockRestore();
      expect(result).toContain('Error loading entry point validSource. Error: not found');
    });

    it('should return error when schema is missing', async () => {
      const result = await validateSources(invalidRuntime);
      expect(result).toContain('Source is missing the schema property: missingSchema');
    });

    it('should return error when schema is not a string', async () => {
      const result = await validateSources(invalidRuntime);
      expect(result).toContain('Source schema property must be a string: invalidSchema');
    });

    it('should return no error when configuration is valid', async () => {
      const validRuntime: any = {
        manifest: {
          sources: {
            'validSource': {
              entry_point: 'validSourceClass',
              schema: 'validSchema'
            }
          }
        },
        getSourceFunctionClass: () => ValidSource
      };

      jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);
      const result = await validateSources(validRuntime);
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
        getSourceFunctionClass: () => ValidSource
      };

      jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => false);
      const result = await validateSources(validRuntime);
      expect(result).toEqual(['File not found for Source schema validSchema']);
    });
  });

  describe('validateSources webhook methods', () => {
    function getSourceClassMissingMethod(methodName: string): typeof SourceFunction {
      class ModifiedSource extends ValidSource { }
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
        const sourceClass = getSourceClassMissingMethod(method);

        const runtime: any = {
          manifest: {
            sources: {
              'testSource': {
                entry_point: 'testSourceClass',
                schema: 'testSchema',
                webhook: {
                  entry_point: 'testSourceClass'
                }
              }
            }
          },
          getSourceFunctionClass: () => sourceClass
        };

        jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);
        const result = await validateSources(runtime);
        expect(result).toContain(`SourceFunction entry point is missing the ${method} method: testSourceClass`);
      });
    });
  });
});
