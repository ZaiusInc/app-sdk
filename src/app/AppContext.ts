import {AppManifest} from './types';
import { asyncLocalStorage } from '../util';

export interface AppContext {
  manifest: AppManifest;
  trackerId: string;
  installId: number;
}


export function setContext(context: AppContext) {
  asyncLocalStorage.enterWith(context);
}

/**
 * Get the app context for the current request/job
 */
export function getAppContext() {
  return asyncLocalStorage.getStore() as AppContext;
}

/**
 * Check if the current context is for a global function request
 */
export function isGlobalContext() {
  const currentContext = getAppContext();
  return !!currentContext && !(currentContext.installId > 0);
}
