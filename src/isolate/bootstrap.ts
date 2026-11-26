/**
 * HOST-SIDE ONLY helper — uses `fs`, so it must NOT be imported from
 * `./index` (the in-isolate bundle entry). Exported from the package's main entry
 * for the host runtime (e.g. anduin) to consume.
 *
 * Assembles the bootstrap script run once per fresh isolate. app-sdk owns this
 * incantation — stage order, the CJS wrapping, embedding its own runtime bundle,
 * and the node-sdk configure — so the host can't drift from how the runtime
 * initializes. The one isolated-vm-specific piece (building the transport from the
 * host's injected references) stays the host's and is passed in opaquely.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface IsolateBootstrapOptions {
  /**
   * Host-authored source that builds the HostTransport from the host's injected
   * globals and calls `globalThis.__sdkRuntime.installIsolateRuntime(...)`. Opaque
   * here because it's isolated-vm-specific (app-sdk stays ivm-agnostic).
   */
  installTransportSource: string;
  /** The compiled app bundle (CommonJS; `@zaiusinc/app-sdk` externalized). */
  appBundleSource: string;
}

/** Wrap CJS source in its own module scope and assign its exports to a global. */
function cjs(src: string, assign: string): string {
  return `;(function () { const module = { exports: {} }; const exports = module.exports;\n${src}\n${assign} })();\n`;
}

// Configure the app's bundled node-sdk singleton (non-secret config injected by
// the host as __nodeSdkConfig). __nodeSdk is set by the app bundle barrel.
const NODE_SDK_INIT =
  ';(function () {' +
  '  if (globalThis.__nodeSdk && globalThis.__nodeSdk.odp && globalThis.__nodeSdkConfig) {' +
  '    try { globalThis.__nodeSdk.odp.configure(globalThis.__nodeSdkConfig); } catch (e) {}' +
  '  }' +
  '})();';

let cachedRuntimeSource: string | null = null;
function runtimeSource(): string {
  if (cachedRuntimeSource == null) {
    // app-sdk's own prebuilt isolate runtime bundle (produced by `build-isolate`).
    cachedRuntimeSource = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  }
  return cachedRuntimeSource;
}

/**
 * Build the per-isolate bootstrap script. Stages:
 *  1) app-sdk isolate runtime      -> globalThis.__sdkRuntime
 *  2) (host glue) build transport + installIsolateRuntime
 *  3) app bundle                   -> globalThis.__App
 *  4) configure the bundled node-sdk
 */
export function buildIsolateBootstrap(opts: IsolateBootstrapOptions): string {
  return (
    cjs(runtimeSource(), 'globalThis.__sdkRuntime = module.exports;') +
    opts.installTransportSource +
    cjs(opts.appBundleSource, 'globalThis.__App = module.exports;') +
    NODE_SDK_INIT
  );
}
