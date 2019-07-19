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

export function getAppContext() {
  return currentContext;
}
