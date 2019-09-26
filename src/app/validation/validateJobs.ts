import {logger} from '../../logging';
import {Job} from '../Job';
import {Runtime} from '../Runtime';

export async function validateJobs(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  // Make sure all the jobs listed in the manifest actually exist and are implemented
  if (runtime.manifest.jobs) {
    for (const name of Object.keys(runtime.manifest.jobs)) {
      let jobClass = null;
      try {
        jobClass = await runtime.getJobClass(name);
      } catch (e) {
        logger.error(e);
      }
      if (!jobClass) {
        errors.push(`Entry point not found for job: ${name}`);
      } else if (!(jobClass.prototype instanceof Job)) {
        errors.push(
          `Job entry point does not extend App.Job: ${runtime.manifest.jobs![name].entry_point}`
        );
      } else {
        if (typeof (jobClass.prototype.prepare) !== 'function') {
          errors.push(
            `Job entry point is missing the prepare method: ${runtime.manifest.jobs![name].entry_point}`
          );
        }
        if (typeof (jobClass.prototype.perform) !== 'function') {
          errors.push(
            `Job entry point is missing the perform method: ${runtime.manifest.jobs![name].entry_point}`
          );
        }
      }
    }
  }

  return errors;
}