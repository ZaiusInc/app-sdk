/* eslint-disable max-classes-per-file */
import {Schema} from '@zaiusinc/app-forms-schema';
import deepFreeze from 'deep-freeze';
import 'jest';
import mockFs from 'mock-fs';

import {Runtime} from '../../Runtime';
import {SettingsDataSource} from '../../SettingsDataSource';
import {AppManifest} from '../../types';
import {validateSettingsDataSources} from '../validateSettingsDataSources';

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
  runtime: 'node22'
} as AppManifest);

const settingsForm = {
  sections: [
    {
      key: 'sync',
      label: 'Sync',
      elements: [
        {
          type: 'multi_select',
          key: 'segments',
          label: 'Segments',
          help: '',
          dataSource: {type: 'app', entry_point: 'ListSegments'}
        },
        {type: 'select', key: 'lists', label: 'Lists', help: '', dataSource: {type: 'app', function: 'list_lists'}}
      ]
    },
    {key: 'email', label: 'Email', type: 'zed', mode: 'email'}
  ]
} as unknown as Schema.Form;

class ListSegments extends SettingsDataSource {
  public async getOptions(): Promise<Schema.SelectOption[]> {
    return [];
  }
}

class NotADataSource {
  // Nothing
}

describe('validateSettingsDataSources', () => {
  let runtime: Runtime;
  let getSettingsDataSource: jest.SpyInstance;

  beforeEach(() => {
    // The form sits next to the built app, as validateAssets expects (dirName/../forms).
    mockFs({'/tmp/forms/settings.yml': JSON.stringify(settingsForm)});
    runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: '/tmp/foo'}));
    getSettingsDataSource = jest.spyOn(runtime, 'getSettingsDataSource');
  });

  afterEach(() => {
    mockFs.restore();
    jest.restoreAllMocks();
  });

  it('succeeds with a proper settings data source', async () => {
    getSettingsDataSource.mockResolvedValue(ListSegments);

    expect(await validateSettingsDataSources(runtime)).toEqual([]);
    expect(getSettingsDataSource.mock.calls).toEqual([['ListSegments']]);
  });

  it('succeeds without a settings form', async () => {
    mockFs({'/tmp/foo': {}});

    expect(await validateSettingsDataSources(runtime)).toEqual([]);
    expect(getSettingsDataSource).not.toHaveBeenCalled();
  });

  it('requires either a function or an entry point', async () => {
    const field = (key: string, dataSource: object) => ({type: 'select', key, label: key, help: '', dataSource});
    mockFs({
      '/tmp/forms/settings.yml': JSON.stringify({
        sections: [
          {
            key: 'sync',
            label: 'Sync',
            elements: [
              field('neither', {type: 'app'}),
              field('both', {type: 'app', function: 'list_lists', entry_point: 'ListSegments'})
            ]
          }
        ]
      })
    });

    expect(await validateSettingsDataSources(runtime)).toEqual([
      'Data source for sync.neither must set either function or entry_point',
      'Data source for sync.both must set either function or entry_point'
    ]);
    expect(getSettingsDataSource).not.toHaveBeenCalled();
  });

  it('detects a missing class', async () => {
    getSettingsDataSource.mockRejectedValue(new Error('Cannot find module'));

    expect(await validateSettingsDataSources(runtime)).toEqual([
      'Error loading settings data source ListSegments for sync.segments. Error: not found'
    ]);
  });

  it('detects a module that does not export the class', async () => {
    getSettingsDataSource.mockResolvedValue(undefined);

    expect(await validateSettingsDataSources(runtime)).toEqual([
      'Error loading settings data source ListSegments for sync.segments. Error: not found'
    ]);
  });

  it('succeeds with a default function', async () => {
    getSettingsDataSource.mockResolvedValue(async () => []);

    expect(await validateSettingsDataSources(runtime)).toEqual([]);
  });

  it('detects a class that does not extend SettingsDataSource', async () => {
    getSettingsDataSource.mockResolvedValue(NotADataSource);

    expect(await validateSettingsDataSources(runtime)).toEqual([
      'Settings data source ListSegments for sync.segments must extend App.SettingsDataSource'
    ]);
  });

  it('detects an export that is not a function or a class', async () => {
    getSettingsDataSource.mockResolvedValue({getOptions: async () => []} as any);

    expect(await validateSettingsDataSources(runtime)).toEqual([
      'Settings data source ListSegments for sync.segments must be a function or a class'
    ]);
  });
});
