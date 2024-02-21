import {AppManifest} from './types';

export interface AppContext {
  manifest: AppManifest;
  trackerId: string;
  installId: number;
}

/**
 * Get the app context for the current request/job
 */
export function getAppContext() {
  return global.ocpRuntime?.appContext;
}

/**
 * Check if the current context is for a global function request
 */
export function isGlobalContext() {
  return !!getAppContext() && !(getAppContext().installId > 0);
}
