/**
 * Project Mallorn — app-sdk's isolate runtime entry (kept lean + import-clean so
 * it bundles tiny). The host bundles this into the app and calls
 * `installIsolateRuntime(transport, appContext)` once per fresh isolate.
 */
export {installIsolateRuntime} from './runtime';
export type {HostTransport} from './transport';
export * from './classes';
