/**
 * Project Mallorn — the in-isolate runtime entry, OWNED BY app-sdk.
 *
 * Runs INSIDE each isolate. `installIsolateRuntime` assembles the in-isolate
 * `@zaiusinc/app-sdk` module (real classes from ./classes + transport-backed I/O
 * from ./sdkApi), installs the polyfilled globals (./polyfills), the crypto shim
 * (./cryptoShim), and the host-backed `fetch`/timers, then registers the
 * `require()` shim. The host (anduin) only implements {@link HostTransport} — it
 * never mirrors app-sdk's API (no facade). When app-sdk's API changes, these
 * files change with it, in the same repo/release.
 */
import {Buffer} from 'buffer';

import * as classes from './classes';
import {createCrypto} from './cryptoShim';
import {createFs} from './fsShim';
import {installLifecycleRunner} from './lifecycleRunner';
import {installPolyfills} from './polyfills';
import {createSdkApi} from './sdkApi';
import {installTaskRunners} from './taskRunners';
import {HostTransport} from './transport';

export function installIsolateRuntime(
  transport: HostTransport,
  appContext: unknown,
  env?: Record<string, string | undefined>
): void {
  const g = globalThis as Record<string, unknown>;

  // The in-isolate @zaiusinc/app-sdk module: real classes + transport-backed I/O.
  const api = createSdkApi(transport, appContext);
  const appSdk = {...classes, ...api};
  g.__appSdk = appSdk;

  // Pure-CPU globals (Buffer/Text*/atob/btoa/process).
  installPolyfills(g, env);

  // crypto: Web Crypto global + Node `crypto` module (via require).
  const {nodeCrypto, webCrypto} = createCrypto(transport);
  g.crypto = webCrypto;

  // fs/os/path/stream: bridged filesystem + pure-JS path/stream (via require).
  const fsMods = createFs(transport);
  const moduleTable: Record<string, unknown> = {
    fs: fsMods.fs,
    'fs/promises': fsMods.fs.promises,
    os: fsMods.os,
    path: fsMods.path,
    stream: fsMods.stream,
    'stream/promises': fsMods.streamPromises,
    events: fsMods.events,
    util: fsMods.util
  };

  g.require = (name: string) => {
    if (name === '@zaiusinc/app-sdk') {
      return appSdk;
    }
    if (name === 'crypto' || name === 'node:crypto') {
      return nodeCrypto;
    }
    const bare = name.startsWith('node:') ? name.slice(5) : name;
    if (Object.prototype.hasOwnProperty.call(moduleTable, bare)) {
      return moduleTable[bare];
    }
    const fail = () => {
      throw new Error('module not available in isolate: ' + name);
    };
    // Callable target so the proxy supports apply/construct traps; body is a
    // comment (the traps always throw), which satisfies no-empty-function.
    return new Proxy(
      function () {
        /* unreachable: traps below always throw */
      },
      {get: fail, apply: fail, construct: fail}
    );
  };

  // timers + fetch over the transport (bare isolate has neither).
  const callHost = (channel: string, payload: unknown): Promise<unknown> =>
    transport.invoke(channel, JSON.stringify(payload)).then((s) => JSON.parse(s));
  g.setTimeout = (cb: () => void, ms: number) => {
    void callHost('sleep', ms || 0).then(() => cb());
  };
  g.fetch = (url: unknown, init: {method?: string; headers?: unknown; body?: unknown} = {}) => {
    const headers: Record<string, string> = {};
    const h = init.headers as {toArray?: () => Array<[string, string]>} | Record<string, string> | undefined;
    if (h) {
      if (typeof (h as {toArray?: unknown}).toArray === 'function') {
        (h as {toArray: () => Array<[string, string]>}).toArray().forEach((p) => (headers[p[0]] = p[1]));
      } else {
        const obj = h as Record<string, string>;
        Object.keys(obj).forEach((k) => (headers[k] = obj[k]));
      }
    }
    const req = {
      url: String(url),
      method: init.method || 'GET',
      headers,
      body: init.body == null ? null : typeof init.body === 'string' ? init.body : JSON.stringify(init.body)
    };
    return callHost('fetch', req).then((r: unknown) => {
      const res = r as {
        status: number;
        statusText?: string;
        ok: boolean;
        headers?: Array<[string, string]>;
        body?: string;
      };
      const hdrs = new classes.Headers();
      (res.headers || []).forEach((p) => hdrs.set(p[0], p[1]));
      return {
        status: res.status,
        statusText: res.statusText || '',
        ok: res.ok,
        headers: hdrs,
        json: () => Promise.resolve(res.body ? JSON.parse(res.body) : null),
        text: () => Promise.resolve(res.body || '')
      };
    });
  };
  g.Headers = classes.Headers;
  if (!g.console) {
    g.console = {
      log: (...a: unknown[]) => api.logger.info(...a),
      info: (...a: unknown[]) => api.logger.info(...a),
      warn: (...a: unknown[]) => api.logger.warn(...a),
      error: (...a: unknown[]) => api.logger.error(...a),
      debug: (...a: unknown[]) => api.logger.debug(...a)
    };
  }

  // Host-runner helpers: build a REAL Request from the injected request data, and
  // serialize a REAL Response back to the host's wire shape. Kept here (not in the
  // host) so app-sdk owns the construction/serialization of its own classes.
  const InternalRequestCtor = classes.InternalRequest as unknown as new (...args: unknown[]) => unknown;
  g.__makeRequest = (data: {
    method?: string;
    path?: string;
    fullpath?: string;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
    body?: string | Uint8Array | null;
    bodyJSON?: unknown;
  }) => {
    data = data || {};
    const headersArr: string[][] = [];
    const h = data.headers || {};
    Object.keys(h).forEach((k) => headersArr.push([k, String(h[k])]));
    // Body is carried as raw bytes (binary-safe). A string or parsed bodyJSON is
    // still accepted (e.g. from tests) and encoded as UTF-8.
    let body: Uint8Array | null;
    if (data.body instanceof Uint8Array) {
      body = data.body;
    } else if (typeof data.body === 'string') {
      body = new Uint8Array(Buffer.from(data.body, 'utf8'));
    } else if (data.bodyJSON !== undefined) {
      body = new Uint8Array(Buffer.from(JSON.stringify(data.bodyJSON), 'utf8'));
    } else {
      body = null;
    }
    return new InternalRequestCtor(
      data.method || 'GET',
      data.fullpath || data.path || '',
      data.path || '',
      data.params || {},
      headersArr,
      body
    );
  };
  g.__serializeResponse = (res: {
    status: number;
    headers?: {toArray?: () => string[][]};
    bodyAsU8Array?: Uint8Array;
  }) => ({
    status: res.status,
    headers: res.headers && typeof res.headers.toArray === 'function' ? res.headers.toArray() : [],
    // raw bytes (binary-safe); copied out of the isolate as a Uint8Array
    body: res.bodyAsU8Array ?? null
  });
  g.__isResponse = (x: unknown) => x instanceof classes.Response;

  // In-isolate task runners (__runFunction/__runJob) + lifecycle dispatcher
  // (__runLifecycle) — read __App/__appSdk/__makeRequest at call time.
  installTaskRunners(g);
  installLifecycleRunner(g);
}
