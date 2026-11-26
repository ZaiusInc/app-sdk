/**
 * In-isolate lifecycle dispatcher (`globalThis.__runLifecycle`), mirroring the
 * fork LifecycleWorker. Runs the parts that must happen in-isolate: settings/auth
 * `result.getResponse(page)` + `storage.settings.getAllSections()`, the
 * `App.Request` for onAuthorizationGrant, and the `__applySchema` glue for
 * install/upgrade. Returns a plain object; host does any post-processing.
 */

export interface LifecycleSpec {
  method: string;
  fromVersion?: string;
  page?: string;
  action?: string;
  formData?: unknown;
  request?: unknown;
  schema?: unknown;
}

type Glob = Record<string, unknown>;

/** Install `globalThis.__runLifecycle`. Globals it reads are resolved at call time. */
export function installLifecycleRunner(g: Glob): void {
  g.__runLifecycle = async (spec: LifecycleSpec): Promise<unknown> => {
    const app = g.__App as Record<string, new () => LifecycleInstance> | undefined;
    const LifecycleClass = app && app.Lifecycle;
    if (typeof LifecycleClass !== 'function') {
      throw new Error('Lifecycle class not found in bundle');
    }
    const instance = new LifecycleClass();
    const appSdk = g.__appSdk as {storage: {settings: {getAllSections: () => Promise<unknown>}}};
    const makeRequest = g.__makeRequest as (data: unknown) => unknown;
    const applySchema = g.__applySchema as ((schema: unknown) => Promise<unknown>) | undefined;

    switch (spec.method) {
      case 'onInstall':
        if (applySchema) {
          await applySchema(spec.schema);
        }
        return instance.onInstall();

      case 'onUpgrade':
        if (applySchema) {
          await applySchema(spec.schema);
        }
        return instance.onUpgrade(spec.fromVersion as string);

      case 'onFinalizeUpgrade':
        return instance.onFinalizeUpgrade(spec.fromVersion as string);

      case 'onAfterUpgrade':
        return instance.onAfterUpgrade();

      case 'onUninstall':
        return instance.onUninstall();

      case 'canUninstall':
        return instance.canUninstall();

      case 'onSettingsForm': {
        const result = await instance.onSettingsForm(spec.page as string, spec.action as string, spec.formData);
        return {result: result.getResponse(spec.page as string), data: await appSdk.storage.settings.getAllSections()};
      }

      case 'onAuthorizationRequest': {
        const result = await instance.onAuthorizationRequest(spec.page as string, spec.formData);
        return {result: result.getResponse(spec.page as string), data: await appSdk.storage.settings.getAllSections()};
      }

      case 'onAuthorizationGrant': {
        const request = makeRequest(spec.request);
        const result = await instance.onAuthorizationGrant(request);
        return result.getResponse();
      }

      default:
        throw new Error(`Unexpected lifecycle task: ${spec.method}`);
    }
  };
}

/** The subset of the app `Lifecycle` instance shape this dispatcher calls. */
interface LifecycleInstance {
  onInstall(): Promise<unknown>;
  onUpgrade(fromVersion: string): Promise<unknown>;
  onFinalizeUpgrade(fromVersion: string): Promise<unknown>;
  onAfterUpgrade(): Promise<unknown>;
  onUninstall(): Promise<unknown>;
  canUninstall(): Promise<unknown>;
  onSettingsForm(page: string, action: string, formData: unknown): Promise<FormResultLike>;
  onAuthorizationRequest(page: string, formData: unknown): Promise<FormResultLike>;
  onAuthorizationGrant(request: unknown): Promise<{getResponse(): unknown}>;
}

interface FormResultLike {
  getResponse(section: string): unknown;
}
