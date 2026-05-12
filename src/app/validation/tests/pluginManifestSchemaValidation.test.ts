import deepFreeze from 'deep-freeze';
import 'jest';

import {Runtime} from '../../Runtime';
import {AppManifest} from '../../types';
import type {AppSdkPlugin} from '../plugins';
import {validateApp} from '../validateApp';
import {validateAssets} from '../validateAssets';
import {validateChannel} from '../validateChannel';
import {validateDestinations} from '../validateDestinations';
import {validateEnvironment} from '../validateEnvironment';
import {validateFunctions} from '../validateFunctions';
import {validateJobs} from '../validateJobs';
import {validateLifecycle} from '../validateLifecycle';
import {validateLiquidExtensions} from '../validateLiquidExtensions';
import {validateMeta} from '../validateMeta';
import {validateSources} from '../validateSources';

jest.mock('../validateMeta');
jest.mock('../validateEnvironment');
jest.mock('../validateFunctions');
jest.mock('../validateJobs');
jest.mock('../validateLiquidExtensions');
jest.mock('../validateLifecycle');
jest.mock('../validateChannel');
jest.mock('../validateAssets');
jest.mock('../validateDestinations');
jest.mock('../validateSources');

describe('validateApp with plugin manifest schema', () => {
  const baseManifest = deepFreeze({
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
    runtime: 'node18'
  } as AppManifest);

  const uiExtensionsPlugin: AppSdkPlugin = {
    id: 'ui-extensions',
    manifestSchema: {
      properties: {
        ui_extensions: {
          type: 'object',
          additionalProperties: false,
          properties: {
            sidebar: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'entry_point', 'display_name'],
                additionalProperties: false,
                properties: {
                  name: {type: 'string'},
                  entry_point: {type: 'string'},
                  display_name: {type: 'string'}
                }
              }
            }
          }
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (validateMeta as jest.Mock).mockReturnValue([]);
    (validateEnvironment as jest.Mock).mockReturnValue([]);
    (validateFunctions as jest.Mock).mockResolvedValue([]);
    (validateJobs as jest.Mock).mockResolvedValue([]);
    (validateLiquidExtensions as jest.Mock).mockResolvedValue([]);
    (validateLifecycle as jest.Mock).mockResolvedValue([]);
    (validateChannel as jest.Mock).mockResolvedValue([]);
    (validateAssets as jest.Mock).mockResolvedValue([]);
    (validateDestinations as jest.Mock).mockResolvedValue([]);
    (validateSources as jest.Mock).mockResolvedValue([]);
  });

  it('accepts plugin-defined manifest property when plugin is provided', async () => {
    const runtime = Runtime.fromJson(
      JSON.stringify({
        appManifest: {
          ...baseManifest,
          ui_extensions: {
            sidebar: [
              {
                name: 'analytics-dashboard',
                entry_point: 'AnalyticsDashboard',
                display_name: 'Analytics Dashboard'
              }
            ]
          }
        },
        dirName: '/tmp/foo'
      })
    );
    (runtime as any).loadedPlugins = [uiExtensionsPlugin];

    const errors = await validateApp(runtime);
    expect(errors).toEqual([]);
  });

  it('rejects plugin-defined manifest property when plugin is not provided', async () => {
    const runtime = Runtime.fromJson(
      JSON.stringify({
        appManifest: {
          ...baseManifest,
          ui_extensions: {
            sidebar: []
          }
        },
        dirName: '/tmp/foo'
      })
    );

    const errors = await validateApp(runtime);
    expect(errors).toContain(
      'Invalid app.yml: must NOT have additional properties (additionalProperty: "ui_extensions")'
    );
  });
});
