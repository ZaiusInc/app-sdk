import * as fs from 'fs';
import {logger} from '../../logging';
import {Runtime} from '../Runtime';
import * as remark from 'remark';
import {VFile} from 'vfile';
// @ts-ignore
import * as vfile from 'to-vfile';
// @ts-ignore
import * as links from 'remark-validate-links';
import glob = require('glob');

const REQUIRED_ASSETS = [
  'assets/directory/overview.md',
  'forms/settings.yml',
  'assets/docs/index.md',
  'assets/icon.svg',
  'assets/logo.svg'
];

export async function validateAssets(runtime: Runtime): Promise<string[]> {
  return new AssetValidator(runtime.baseDir).validate();
}

class AssetValidator {
  private errors: string[] = [];

  public constructor(private baseDir: string) { }

  public async validate(): Promise<string[]> {
    this.validateAllAssetsExist();
    await this.validateMarkdownFiles();
    return this.errors;
  }

  private validateAllAssetsExist() {
    REQUIRED_ASSETS.forEach((asset) => {
      if (!fs.existsSync(`${this.baseDir}/${asset}`)) {
        this.errors.push(`Required file ${asset} is missing.`);
      }
    });
  }

  private async validateMarkdownFiles(): Promise<void> {
    try {
      const vfiles: VFile[] = await Promise.all(
        glob.sync(`${this.baseDir}/assets/**/*.md`).map((file) => {
          return remark().use(links, {repository: false}).process(vfile.readSync(file));
        })
      );

      vfiles.forEach((file) => {
        file.messages.forEach((msg) => {
          this.errors.push(`${msg.message} in ${msg.name.replace(`${this.baseDir}/`, '')}.`);
        });
      });
    } catch (e) {
      logger.error(e);
      this.errors.push('Failed to validate markdown files');
    }
  }
}
