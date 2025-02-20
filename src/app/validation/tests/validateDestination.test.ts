import { validateDestinations } from '../validateDestinations';
import { Destination, GetDestinationSchemaResult } from '../../Destination';
import * as fs from 'fs';

class ValidDestination extends Destination<any> {
  public getDestinationSchema(): Promise<GetDestinationSchemaResult> {
    throw new Error('Method not implemented.');
  }
  public async ready() {
    return { ready: true };
  }
  public async deliver(batch: any) {
    return { success: !batch };
  }
}

jest.spyOn(fs, 'existsSync');

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn().mockReturnValue('mocked'),
}));

describe('validateDestination', () => {
  const invalidRuntime: any = {
    manifest: {
      destinations: {
        'validExport': {
          entry_point: 'validExportClass',
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
    getDestinationClass: jest.fn()
  };

  it('should return error when data export class cannot be loaded', async () => {
    const getDestinationsClass = jest.spyOn(invalidRuntime, 'getDestinationClass')
      .mockRejectedValue(new Error('not found'));
    const result = await validateDestinations(invalidRuntime);
    getDestinationsClass.mockRestore();
    expect(result).toContain('Error loading entry point validExport. Error: not found');
  });


  it('should return error when schema is missing', async () => {
    const result = await validateDestinations(invalidRuntime);
    expect(result).toContain('Destination is missing the schema property: missingSchema');
  });

  it('should return error when schema is not a string', async () => {
    const result = await validateDestinations(invalidRuntime);
    expect(result).toContain('Destination schema property must be a string: invalidSchema');
  });

  it('should return no error when configuration is valid', async () => {
    const validRuntime: any = {
      manifest: {
        destinations: {
          'validExport': {
            entry_point: 'validExportClass',
            schema: 'validSchema'
          }
        }
      },
      getDestinationClass: () => ValidDestination
    };

    jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);
    const result = await validateDestinations(validRuntime);
    expect(result.length).toEqual(0);
  });

  it('should return error when schema is missing', async () => {
    const validRuntime: any = {
      manifest: {
        destinations: {
          'validExport': {
            entry_point: 'validExportClass',
            schema: 'validSchema'
          }
        }
      },
      getDestinationClass: () => ValidDestination
    };

    jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => false);
    const result = await validateDestinations(validRuntime);
    expect(result).toEqual(['File not found for Destination schema validSchema']);
  });
});
