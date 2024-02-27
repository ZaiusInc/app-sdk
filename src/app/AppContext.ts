import {AppManifest} from './types';
import {OCPContext} from '../types';

export interface AppContext {
  manifest: AppManifest;
  trackerId: string;
  installId: number;
}

export function getOCPContext(): OCPContext | undefined {
  return global.ocpContextStorage?.getStore();
}

/**
 * Get the app context for the current request/job
 */
export function getAppContext(): AppContext {
  const ocpContext = getOCPContext();
  if (!ocpContext) {
    throw new Error('OCP context not initialized');
  }
  return ocpContext.ocpRuntime.appContext;
}

/**
 * Check if the current context is for a global function request
 */
export function isGlobalContext() {
  const ocpContext = getOCPContext();
  return ocpContext && !(ocpContext.ocpRuntime.appContext.installId > 0);
}
