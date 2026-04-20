import {Source, SourceData, SourceResponse} from './Source';
import {validateAndNormalizeLanguage} from './validateLanguage';

/**
 * @internal
 * Interface for the new sources.emit() API.
 * Allows emitting data to a source by name from any function or job.
 */
export interface SourceApi extends Source {
  /**
   * Emit data to a source by name.
   * Data will be fanned out to all active data syncs configured for the source.
   * Can be called from any function or job.
   * @param sourceName - The name of the source schema (as declared in manifest)
   * @param data - SourceData the data to be emitted
   * @returns A SourceResponse with success/failure and optional message
   */
  emitToSource<T extends {_isDeleted?: boolean; _language?: string}>(
    sourceName: string,
    data: SourceData<T>
  ): Promise<SourceResponse>;
}

/**
 * @internal
 * the source API
 * Do not call this function from application code.
 */
export let sourceApi: Source | undefined;

/**
 * @internal
 * Initialize the source API.
 * Do not call this function from application code.
 */
export function initializeSourceApi(api: SourceApi): void {
  sourceApi = api;
}

/**
 * Source data emission API.
 * Allows any function or job to emit data to a source by name.
 */
export const sources = {
  /**
   * Emit data to a source by name.
   * Data will be fanned out to all active data syncs configured for the source.
   * Can be called from any function or job context.
   * @param sourceName - The name of the source schema (as declared in manifest)
   * @param data - SourceData the data to be emitted
   * @returns A SourceResponse with success/failure and optional message
   * @throws Error if called outside of an execution context
   */
  emit: async <T extends {_isDeleted?: boolean; _language?: string}>(
    sourceName: string,
    data: SourceData<T>
  ): Promise<SourceResponse> => {
    if (!sourceApi) {
      throw new Error(
        'Source API is not initialized. This API is only available within function/job execution context.'
      );
    }

    const rawLanguage = data.data._language;
    if (rawLanguage != null) {
      const result = validateAndNormalizeLanguage(rawLanguage);
      if (!result.valid) {
        return {success: false, message: result.message};
      }
      // Shallow-copy data.data to avoid mutating the caller's object
      data = {data: {...data.data, _language: result.normalized} as T};
    }

    return (sourceApi as SourceApi).emitToSource(sourceName, data);
  }
};
