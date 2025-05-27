import {logger} from '../../logging';
import {Job} from '../Job';
import {Runtime} from '../Runtime';

export async function validateSourceJobs(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  // Make sure all the source jobs listed in the manifest actually exist and are implemented
  if (runtime.manifest.source_jobs) {
    for (const name of Object.keys(runtime.manifest.source_jobs)) {
      let sourceJobClass = null;
      let errorMessage: string | null = null;
      try {
        sourceJobClass = await runtime.getSourceJobClass(name);
      } catch (e: any) {
        errorMessage = e;
        logger.error(e);
      }
      if (!sourceJobClass) {
        errors.push(`Error loading entry point ${name}. ${errorMessage}`);
      } else if (!(sourceJobClass.prototype instanceof Job)) {
        errors.push(
          `Job entry point does not extend App.Job: ${runtime.manifest.source_jobs[name].entry_point}`
        );
      } else {
        if (typeof (sourceJobClass.prototype.prepare) !== 'function') {
          errors.push(
            `Job entry point is missing the prepare method: ${runtime.manifest.source_jobs[name].entry_point}`
          );
        }
        if (typeof (sourceJobClass.prototype.perform) !== 'function') {
          errors.push(
            `Job entry point is missing the perform method: ${runtime.manifest.source_jobs[name].entry_point}`
          );
        }
      }
    }
  }

  return errors;
}
