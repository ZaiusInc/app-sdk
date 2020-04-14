import {AppManifest} from './types';

export interface AppContext {
  manifest: AppManifest;
  trackerId: string;
  installId: number;
}

let currentContext!: AppContext;

export function setContext(context: AppContext) {
  currentContext = context;
}

/**
 * Get the app context for the current request/job
 */
export function getAppContext() {
  return currentContext;
}

/**
 * Check if the current context is for a global function request
 */
export function isGlobalContext() {
  return !!currentContext && !(currentContext.installId > 0);
}
