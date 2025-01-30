import { validateDataExports } from '../validateDataExports';
import { DataExport } from '../../DataExport';
import * as fs from 'fs';
import { Runtime } from '../../Runtime';

class ValidExport extends DataExport<any> {
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

describe('validateDataExport', () => {
  const invalidRuntime: any = {
    manifest: {
      data_exports: {
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
      },
    }
  };

  it('should return error when data export class cannot be loaded', async () => {
    const getDataExportClass = jest.spyOn(Runtime.prototype, 'getDataExportClass')
      .mockRejectedValue(new Error('not found'));
    const result = await validateDataExports(invalidRuntime);
    getDataExportClass.mockRestore();
    expect(result.length).toBeGreaterThan(0);

  });


  it('should return error when schema is missing', async () => {
    const result = await validateDataExports(invalidRuntime);
    expect(result).toContain('DataExport is missing the schema property: missingSchema');
  });

  it('should return error when schema is not a string', async () => {
    const result = await validateDataExports(invalidRuntime);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return no error when configuration is valid', async () => {
    const validRuntime: any = {
      manifest: {
        data_exports: {
          'validExport': {
            entry_point: 'validExportClass',
            schema: 'validSchema'
          }
        }
      },
      getDataExportClass: () => ValidExport
    };

    jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);
    const result = await validateDataExports(validRuntime);
    expect(result.length).toEqual(0);
  });
});
