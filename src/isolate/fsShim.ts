/**
 * Project Mallorn — in-isolate `fs`/`os`/`path`/`stream` shims (ADDENDUM 8).
 *
 * A bare isolate has no filesystem. These shims expose the Node module surface and
 * route every operation over the host transport to the host's real `fs` (see anduin
 * `fsBridge.ts`):
 *  - sync ops (`readFileSync`/…) → {@link HostTransport.fsSync} (sync bridge);
 *  - `fs.promises.*` + stream fd read/write → `invoke('fs', …)` (async bridge).
 *
 * `path` is pure computation (path-browserify); `stream` is pure-JS `readable-stream`,
 * so streams live in-isolate and only their fd read/write crosses the bridge. Binary
 * values cross as `{"$b64":"..."}`.
 *
 * NOTE: paths are NOT jailed here or on the host — this trusts app-supplied paths.
 */
import {Buffer} from 'buffer';
import type * as eventsNs from 'events';
import type * as pathNs from 'path';
import type * as streamNs from 'stream';
import type * as utilNs from 'util';

import {HostTransport} from './transport';

// Loaded lazily inside createFs (NOT top-level imports): readable-stream touches
// `process` at module-eval time, so it must run AFTER installPolyfills. esbuild's
// bundler resolves these requires (not the isolate require shim).
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

/** Wrap a Buffer/Uint8Array as `{$b64}` for the JSON wire (matches the host). */
const encode = (v: unknown): unknown => (v instanceof Uint8Array ? {$b64: Buffer.from(v).toString('base64')} : v);

/** Decode a `{$b64}` wrapper from the host back to a Buffer. */
const decode = (v: unknown): unknown =>
  v && typeof v === 'object' && typeof (v as {$b64?: unknown}).$b64 === 'string'
    ? Buffer.from((v as {$b64: string}).$b64, 'base64')
    : v;

/** Unwrap a host `{ok,value}|{ok:false,error}` envelope: value, or a coded throw. */
function unwrap(json: string): unknown {
  const env = JSON.parse(json) as {ok: boolean; value?: unknown; error?: {message: string; code?: string}};
  if (env.ok) {
    return decode(env.value);
  }
  const err = new Error(env.error?.message ?? 'fs error') as Error & {code?: string};
  err.code = env.error?.code;
  throw err;
}

/** Node-style callback that fires when `p` settles. */
type Cb = (e?: Error | null) => void;
const settle = (p: Promise<unknown>, cb: Cb): void => void p.then(() => cb(), cb);

export interface IsolateFsModules {
  fs: Record<string, unknown>;
  os: Record<string, unknown>;
  path: unknown;
  stream: unknown;
  streamPromises: {pipeline: (...a: unknown[]) => Promise<void>; finished: (s: unknown) => Promise<void>};
  events: unknown;
  util: unknown;
}

const CHUNK = 64 * 1024;

export function createFs(transport: HostTransport): IsolateFsModules {
  const stream = require('readable-stream') as typeof streamNs;
  const pathBrowser = require('path-browserify') as typeof pathNs;
  const events = require('events') as typeof eventsNs;
  const util = require('util') as typeof utilNs;

  const payload = (method: string, args: unknown[]): string => JSON.stringify({method, args: args.map(encode)});
  const callSync = (method: string, args: unknown[]): unknown => {
    if (!transport.fsSync) {
      throw new Error('fs not available in isolate');
    }
    return unwrap(transport.fsSync(payload(method, args)));
  };
  const callAsync = (method: string, args: unknown[]): Promise<unknown> =>
    transport.invoke('fs', payload(method, args)).then(unwrap);

  // Streams open a host fd (sync) then read/write chunks over the async channel.
  const createWriteStream = (file: string, opts?: {flags?: string}): streamNs.Writable => {
    const fd = callSync('openSync', [file, opts?.flags ?? 'w']) as number;
    return new stream.Writable({
      write: (chunk: unknown, _enc: unknown, cb: Cb) =>
        settle(callAsync('writeSync', [fd, Buffer.from(chunk as Uint8Array)]), cb),
      final: (cb: Cb) => settle(callAsync('closeSync', [fd]), cb)
    });
  };
  const createReadStream = (file: string, opts?: {flags?: string; highWaterMark?: number}): streamNs.Readable => {
    const fd = callSync('openSync', [file, opts?.flags ?? 'r']) as number;
    const size = opts?.highWaterMark ?? CHUNK;
    const rs = new stream.Readable({
      read: () => {
        callAsync('readChunk', [fd, size])
          .then((c) => {
            const {bytesRead, data} = c as {bytesRead: number; data: unknown};
            if (bytesRead === 0) {
              settle(callAsync('closeSync', [fd]), () => rs.push(null));
            } else {
              rs.push(decode(data) as Buffer);
            }
          })
          .catch((e: unknown) => rs.destroy(e as Error));
      }
    });
    return rs;
  };

  // fs.promises.<m> maps to the host's <m>Sync over the async channel; fs.<m>Sync
  // uses the sync bridge.
  const promises = new Proxy(
    {},
    {
      get:
        (_t, m: string) =>
        (...a: unknown[]) =>
          callAsync(`${m}Sync`, a)
    }
  );
  const base: Record<string, unknown> = {promises, createWriteStream, createReadStream};
  const fs = new Proxy(base, {
    get: (t, prop: string) =>
      prop in t ? t[prop] : prop.endsWith('Sync') ? (...a: unknown[]) => callSync(prop, a) : undefined
  });

  const streamPromises = {
    pipeline: (...a: unknown[]): Promise<void> =>
      new Promise((res, rej) =>
        (stream.pipeline as (...x: unknown[]) => unknown)(...a, (e: Error | null) => (e ? rej(e) : res()))
      ),
    finished: (s: unknown): Promise<void> =>
      new Promise((res, rej) =>
        (stream.finished as (...x: unknown[]) => unknown)(s, (e: Error | null) => (e ? rej(e) : res()))
      )
  };

  const os: Record<string, unknown> = {
    tmpdir: () => '/tmp',
    homedir: () => '/tmp',
    platform: () => 'linux',
    EOL: '\n'
  };

  return {fs, os, path: pathBrowser, stream, streamPromises, events, util};
}
