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
      'assets': {
        'directory': {
          'overview.md': '## Overview'
        },
        'docs':  {
          'index.md': '## Index'
        },
        'icon.png': '0110',
        'logo.png': '0101'
      },
      'forms': {
        'settings.yml': 'foo: bar'
      }
    }
  };
}

describe('validateAssets', () => {
  afterEach(() => {
    mockFs.restore();
  });

  it('succeeds when all required assets are available',  async () => {
    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: 'path/to/app/dir'}));
    mockFs(appDir());
    expect(await validateAssets(runtime)).toEqual([]);
  });

  it('fails when assets/directory/overview.md does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['assets']['directory']['overview.md'];
    mockFs(missingAssets);

    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: 'path/to/app/dir'}));
    const errors = await validateAssets(runtime);
    expect(errors.length).toEqual(1);
    expect(errors[0]).toEqual('Required file assets/directory/overview.md is missing.');
  });

  it('fails when assets/docs/index.md does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['assets']['docs']['index.md'];
    mockFs(missingAssets);

    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: 'path/to/app/dir'}));
    const errors = await validateAssets(runtime);
    expect(errors.length).toEqual(1);
    expect(errors[0]).toEqual('Required file assets/docs/index.md is missing.');
  });

  it('fails when forms/settings.yml does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['forms']['settings.yml'];
    mockFs(missingAssets);

    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: 'path/to/app/dir'}));
    const errors = await validateAssets(runtime);
    expect(errors.length).toEqual(1);
    expect(errors[0]).toEqual('Required file forms/settings.yml is missing.');
  });

  it('fails when assets/icon.png or assets/icon.svg does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['assets']['icon.png'];
    mockFs(missingAssets);

    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: 'path/to/app/dir'}));
    const errors = await validateAssets(runtime);
    expect(errors.length).toEqual(1);
    expect(errors[0]).toEqual('Required file assets/icon.png or assets/icon.svg is missing.');
  });

  it('fails when assets/logo.png or assets/logo.svg does not exist', async () => {
    const missingAssets = appDir();
    delete missingAssets['path/to/app/dir']['assets']['logo.png'];
    mockFs(missingAssets);

    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: 'path/to/app/dir'}));
    const errors = await validateAssets(runtime);
    expect(errors.length).toEqual(1);
    expect(errors[0]).toEqual('Required file assets/logo.png or assets/logo.svg is missing.');
  });

  // TODO: mock-fs + remark are not playing nice and promises not resolving before process exists
  it.skip('fails when markdown files contain links to unknown headers', async () => {
    const missingHeaderLinks = appDir();
    missingHeaderLinks['path/to/app/dir']['assets']['directory']['overview.md'] = `# Alpha
      This [one does not](#does-not-exist).
    `;
    // mockFs(missingHeaderLinks);

    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: 'example-project'}));
    const errors = await validateAssets(runtime);
    expect(errors.length).toEqual(1);
    expect(errors[0]).toEqual('Link to unknown heading: `does-not-exist` @ assets/directory/overview.md:4:6-4:31.');
  });

  // TODO: mock-fs + remark are not playing nice and promises not resolving before process exists
  it.skip('fails when markdown files contain links to unknown files', async () => {
    const missingFileLinks = appDir();
    missingFileLinks['path/to/app/dir']['assets']['directory']['overview.md'] = `# Alpha
      [missing files are reported](missing-example.js)
    `;
    mockFs(missingFileLinks);

    const runtime = Runtime.fromJson(JSON.stringify({appManifest, dirName: 'path/to/app/dir'}));
    const errors = await validateAssets(runtime);
    expect(errors.length).toEqual(1);
    expect(errors[0]).toEqual('Link to unknown file: `missing-example.js` in assets/directory/overview.md:10:5-10:53.');
  });
});
