/**
 * Project Mallorn — pure-CPU globals a bare V8 isolate lacks, implemented
 * in-isolate (no host round-trip). `Buffer` is the canonical npm polyfill (the
 * real Request/Response need it); `TextEncoder`/`TextDecoder`/`atob`/`btoa` are
 * built on it; `process` is a minimal shim (env only).
 */
/* eslint-disable max-classes-per-file -- small TextEncoder/TextDecoder polyfills */
import {Buffer} from 'buffer';

/**
 * Install the polyfilled globals onto the isolate global.
 * @param env allowlisted env (childProcessEnv) for `process.env`; host secrets
 *   are never included.
 */
export function installPolyfills(g: Record<string, unknown>, env?: Record<string, string | undefined>): void {
  if (!g.Buffer) {
    g.Buffer = Buffer;
  }

  if (!g.TextEncoder) {
    g.TextEncoder = class {
      public readonly encoding = 'utf-8';
      public encode(input = ''): Uint8Array {
        return new Uint8Array(Buffer.from(String(input), 'utf8'));
      }
    };
  }
  if (!g.TextDecoder) {
    g.TextDecoder = class {
      public readonly encoding = 'utf-8';
      public decode(input?: Uint8Array | ArrayBuffer): string {
        if (!input) {
          return '';
        }
        return Buffer.from(input instanceof Uint8Array ? input : new Uint8Array(input)).toString('utf8');
      }
    };
  }
  if (!g.btoa) {
    g.btoa = (s: string): string => Buffer.from(String(s), 'binary').toString('base64');
  }
  if (!g.atob) {
    g.atob = (s: string): string => Buffer.from(String(s), 'base64').toString('binary');
  }

  // Bundled Node libraries (e.g. node-sdk) read `process` at module load.
  if (!g.process) {
    g.process = {env: env || {}};
  }
}
