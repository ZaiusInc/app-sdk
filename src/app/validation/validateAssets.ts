import {validateFormDefinition} from '@zaiusinc/app-forms-schema/dist/validation/validateForm';
import * as fs from 'fs';
import * as jsYaml from 'js-yaml';
import * as path from 'path';
import * as remark from 'remark';
// @ts-ignore
import * as links from 'remark-validate-links';
// @ts-ignore
import * as vfile from 'to-vfile';
import {VFile} from 'vfile';
import {logger} from '../../logging';
import {Runtime} from '../Runtime';
import {AppManifest} from '../types';
import glob = require('glob');
import { Schema } from '@zaiusinc/app-forms-schema';

const STANDARD_ASSETS = [
  'assets/directory/overview.md',
  'assets/docs/index.md',
  'assets/icon.svg',
  'assets/logo.svg',
  'forms/settings.yml'
];

const CHANNEL_FORMS = [
  'forms/content-settings.yml',
  'forms/content-template.yml'
];

export async function validateAssets(runtime: Runtime): Promise<string[]> {
  return new AssetValidator(path.resolve(runtime.baseDir, '../'), runtime.manifest).validate();
}

class AssetValidator {
  private errors: string[] = [];

  public constructor(private baseDir: string, private manifest: AppManifest) { }

  public async validate(): Promise<string[]> {
    this.validateAllAssetsExist();
    await this.validateMarkdownFiles();
    await this.validateForms();
    return this.errors;
  }

  private validateAllAssetsExist() {
    let requiredAssets = STANDARD_ASSETS;
    if (this.manifest.channel) {
      requiredAssets = STANDARD_ASSETS.concat(CHANNEL_FORMS);
    }
    requiredAssets.forEach((asset) => {
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

  private async validateForms(): Promise<void> {
    let files = ['forms/settings.yml'];
    if (this.manifest.channel) {
      files = files.concat(CHANNEL_FORMS);
    }
    for (const file of files) {
      const filePath = path.join(this.baseDir, file);
      if (fs.existsSync(filePath)) {
        (await validateFormDefinition(jsYaml.safeLoad(fs.readFileSync(filePath, 'utf8')) as Schema.Form))
          .forEach((message) => this.errors.push(`Invalid ${file}: ${message}`));
      }
    }
  }
}
