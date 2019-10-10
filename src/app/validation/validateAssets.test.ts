import {Runtime} from '../Runtime';
import {validateAssets } from './validateAssets';
import * as deepFreeze from 'deep-freeze';
import {AppManifest} from '../types';
import * as mockFs from 'mock-fs';

const appManifest = deepFreeze({
  meta: {
    app_id: 'my_app',
    display_name: 'My App',
    version: '1.0.0',
    vendor: 'zaius',
    support_url: 'https://zaius.com',
    summary: 'This is an interesting app',
    contact_email: 'support@zaius.com',
    categories: ['eCommerce']
  },
  runtime: 'node12',
  functions: {
    foo: {
      method: 'GET',
      entry_point: 'Foo',
      description: 'gets foo'
    }
  }
} as AppManifest);

function appDir(): any {
  return {
    'path/to/app/dir': {
      'dist': { },
      'assets': {
        'directory': {
          'overview.md': '## Overview'
        },
        'docs':  {
          'index.md': '## Index'
        },
        'icon.svg': '0110',
        'logo.svg': '0101'
      },
      'forms': {
        'settings.yml': 'foo: bar'
      }
    },
  };
}

async function expectError(error: string) {
  const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: 'path/to/app/dir/dist'}));
  const errors = await validateAssets(runtime);
  expect(errors.length).toEqual(1);
  expect(errors[0]).toEqual(error);
}

describe('validateAssets', () => {
  afterEach(() => {
    mockFs.restore();
  });

  it('succeeds when all required assets are available',  async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: 'path/to/app/dir/dist'}));
    mockFs(appDir());
    expect(await validateAssets(runtime)).toEqual([]);
  });

  it('fails when assets/directory/overview.md does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['assets']['directory']['overview.md'];
    mockFs(missingAssets);
    await expectError('Required file assets/directory/overview.md is missing.');
  });

  it('fails when assets/docs/index.md does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['assets']['docs']['index.md'];
    mockFs(missingAssets);
    await expectError('Required file assets/docs/index.md is missing.');
  });

  it('fails when forms/settings.yml does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['forms']['settings.yml'];
    mockFs(missingAssets);
    await expectError('Required file forms/settings.yml is missing.');
  });

  it('fails when assets/icon.svg does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['assets']['icon.svg'];
    mockFs(missingAssets);
    await expectError('Required file assets/icon.svg is missing.');
  });

  it('fails when assets/logo.svg does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['assets']['logo.svg'];
    mockFs(missingAssets);
    await expectError('Required file assets/logo.svg is missing.');
  });

  it('fails when markdown files contain links to unknown headers', async () => {
    const missingHeaderLinks = appDir();
    missingHeaderLinks['path/to/app/dir']['assets']['directory']['overview.md'] = `[dne](#dne).`;
    mockFs(missingHeaderLinks);
    await expectError('Link to unknown heading: `dne` in assets/directory/overview.md:1:1-1:12.');
  });

  it('fails when markdown files contain links to unknown files', async () => {
    const missingFileLinks = appDir();
    missingFileLinks['path/to/app/dir']['assets']['directory']['overview.md'] = `[missing](missing.js)`;
    mockFs(missingFileLinks);
    await expectError('Link to unknown file: `missing.js` in assets/directory/overview.md:1:1-1:22.');
  });
});
