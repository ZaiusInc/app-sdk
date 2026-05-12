import {findManifestPathLine, type ManifestSource} from './manifestSource';

interface ManifestLineOptions {
  manifestSource: ManifestSource | null;
  pathSegments: Array<string | number>;
  message: string;
}

export function withManifestLine({manifestSource, pathSegments, message}: ManifestLineOptions): string {
  const manifestPath = manifestSource?.relativeManifestPath ?? 'app.yml';
  const line = findManifestPathLine(manifestSource, pathSegments);
  const lineInfo = line ? ` (${manifestPath}:${line})` : '';
  return `${message}${lineInfo}`;
}

export function getLoadErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as any).code;
    if (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') {
      return 'not found';
    }
    if (/Cannot find module/.test(error.message)) {
      return 'not found';
    }
    return error.message;
  }

  const message = String(error);
  if (/Cannot find module/.test(message)) {
    return 'not found';
  }
  return message;
}
