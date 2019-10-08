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
    ['assets/directory/overview.md', 'forms/settings.yml', 'assets/docs/index.md'].forEach((asset) => {
      if (!this.exists(asset)) {
        this.errors.push(`Required file ${asset} is missing.`);
      }
    });

    ['assets/icon', 'assets/logo'].forEach((asset) => {
      if (!(this.exists(`${asset}.png`) || this.exists(`${asset}.svg`))) {
        this.errors.push(`Required file ${asset}.png or ${asset}.svg is missing.`);
      }
    });
  }

  private async validateMarkdownFiles(): Promise<void> {
    try {
      const vfiles: VFile[] = await Promise.all(
        glob.sync(`${this.baseDir}/assets/**/*.md`).map((file) => {
          return remark().use(links).process(vfile.readSync(file));
        })
      );

      vfiles.forEach((file) => {
        file.messages.forEach((msg) => {
          this.errors.push(`${msg.message} in ${msg.name.replace(`${this.baseDir}/`, '')}.`);
        });
      });
    } catch (e) {
      logger.error(e);
    }
  }

  private exists(path: string) {
    return fs.existsSync(`${this.baseDir}/${path}`);
  }
}
