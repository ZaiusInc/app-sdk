/**
 * Project Mallorn — the I/O surfaces of the in-isolate `@zaiusinc/app-sdk` module
 * (logger, storage, jobs, notifications, functions, sources, getAppContext). Each
 * is transport-backed: it serializes the call and forwards it to the host over
 * {@link HostTransport}. The real classes are added separately (see ./classes);
 * here we build only the things that need host I/O.
 */
import {HostTransport} from './transport';

function fmt(x: unknown): string {
  return typeof x === 'string' ? x : JSON.stringify(x);
}

/** Build the transport-backed I/O members of the in-isolate app-sdk module. */
export function createSdkApi(transport: HostTransport, appContext: unknown) {
  const callHost = (channel: string, payload: unknown): Promise<unknown> =>
    transport.invoke(channel, JSON.stringify(payload)).then((s) => JSON.parse(s));

  // storage.* — nested stores over the 'store' channel.
  const makeStore = (name: string) => ({
    get: (key: string) => callHost('store', {store: name, method: 'get', key}),
    put: (key: string, value: unknown, options?: unknown) =>
      callHost('store', {store: name, method: 'put', key, value, options}).then(() => true),
    delete: (key: string, fields?: string[]) =>
      callHost('store', {store: name, method: 'delete', key, fields}).then(() => true)
  });
  const storage = {
    settings: {
      ...makeStore('settings'),
      // SettingsStore-only: read every section at once (used by the lifecycle
      // settings/auth response, mirroring the fork worker).
      getAllSections: () => callHost('store', {store: 'settings', method: 'getAllSections'})
    },
    secrets: makeStore('secrets'),
    kvStore: makeStore('kvStore'),
    sharedKvStore: makeStore('sharedKvStore')
  };

  const jobs = {
    trigger: (jobName: string, parameters: unknown) => callHost('jobs', {method: 'trigger', jobName, parameters}),
    getStatus: (jobId: string) => callHost('jobs', {method: 'getStatus', jobId})
  };

  const mkNotify = (level: string) => (activity: string, title: string, summary: string, details?: string) =>
    callHost('notify', {level, activity, title, summary, details}).then(() => undefined);
  const notifications = {
    info: mkNotify('info'),
    success: mkNotify('success'),
    warn: mkNotify('warn'),
    error: mkNotify('error')
  };

  // functions (FunctionApi): generic forwarder — every method is a 1:1 passthrough
  // to the host client. (getAuthorizationGrantUrl is sync in the fork facade but
  // async here; callers should await it.)
  const makeApi = (channel: string) =>
    new Proxy(
      {},
      {
        get:
          (_t, method: string) =>
          (...args: unknown[]) =>
            callHost(channel, {method, args})
      }
    );

  // sources: mirror the app-sdk facade — emit(name, data) delegates to the host's
  // emitToSource(name, data), NOT the deprecated Source.emit(data).
  const sources = {
    emit: (sourceName: string, data: unknown) =>
      callHost('sources', {method: 'emitToSource', args: [sourceName, data]})
  };

  const logger = {
    debug: (...a: unknown[]) => transport.log('debug', a.map(fmt).join(' ')),
    info: (...a: unknown[]) => transport.log('info', a.map(fmt).join(' ')),
    warn: (...a: unknown[]) => transport.log('warn', a.map(fmt).join(' ')),
    error: (...a: unknown[]) => transport.log('error', a.map(fmt).join(' '))
  };

  return {
    logger,
    LogVisibility: {Zaius: 'zaius', Developer: 'developer'},
    getAppContext: () => appContext,
    storage,
    jobs,
    notifications,
    functions: makeApi('functions'),
    sources,
    // common no-op helpers apps may import (real impls live host-side)
    setLogContext: () => undefined,
    setLogLevel: () => undefined,
    isGlobalContext: () => false
  };
}
