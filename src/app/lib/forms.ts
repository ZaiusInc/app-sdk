import {storage, ValueHash} from '../../store';

interface FormState extends ValueHash {
  openSection?: string;
}

/**
 * Helper functions for managing form state.
 */
export namespace Form {
  const formStateKey = '$formState';

  export async function setOpenSection(openSection: string): Promise<void> {
    await storage.settings.patch(formStateKey, {openSection});
  }

  export async function clearOpenSection(): Promise<void> {
    await storage.settings.delete(formStateKey, ['openSection']);
  }

  export async function getOpenSection(): Promise<string | undefined> {
    return (await storage.settings.get<FormState>(formStateKey)).openSection;
  }
}
