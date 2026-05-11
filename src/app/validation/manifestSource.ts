import {readFileSync} from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

import SourceMap from './jsYamlSourceMap';

export interface ManifestSource<TManifest = unknown> {
  manifestPath: string;
  relativeManifestPath: string;
  sourceMap: SourceMap;
  manifest: TManifest;
}

export function loadManifestSource<TManifest = unknown>(
  baseDir: string | undefined,
  manifestFileName = 'app.yml'
): ManifestSource<TManifest> | null {
  if (!baseDir) {
    return null;
  }

  const manifestPath = path.resolve(baseDir, manifestFileName);

  try {
    const manifestRaw = readFileSync(manifestPath, 'utf8');
    const sourceMap = new SourceMap();
    const manifest = (yaml.load(manifestRaw, {listener: sourceMap.listen()}) ?? {}) as TManifest;

    return {
      manifestPath,
      relativeManifestPath: path.relative(baseDir, manifestPath) || manifestFileName,
      sourceMap,
      manifest
    };
  } catch {
    return null;
  }
}

export function findManifestPathLine(
  manifestSource: ManifestSource | null,
  pathSegments: Array<string | number>
): number | null {
  if (!manifestSource) {
    return null;
  }

  const location = manifestSource.sourceMap.lookup(pathSegments.map((segment) => String(segment)));
  return location?.line ?? null;
}
