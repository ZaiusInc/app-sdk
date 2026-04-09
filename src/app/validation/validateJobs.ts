import * as cronValidator from 'cron-expression-validator';

import {Job} from '../Job';
import {Runtime} from '../Runtime';
import {getLoadErrorDetails, withManifestLine} from './entryPointErrors';
import {loadManifestSource} from './manifestSource';

export async function validateJobs(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];
  const manifestSource = loadManifestSource(runtime.baseDir);

  // Make sure all the jobs listed in the manifest actually exist and are implemented
  if (runtime.manifest.jobs) {
    for (const name of Object.keys(runtime.manifest.jobs)) {
      let jobClass = null;
      let loadErrorDetails = 'not found';
      try {
        jobClass = await runtime.getJobClass(name);
      } catch (e: any) {
        loadErrorDetails = getLoadErrorDetails(e);
      }
      if (!jobClass) {
        const entryPoint = runtime.manifest.jobs[name].entry_point;
        errors.push(
          withManifestLine({
            manifestSource,
            pathSegments: ['jobs', name, 'entry_point'],
            message: `Error loading entry point ${entryPoint}. Error: ${loadErrorDetails}`
          })
        );
      } else if (!(jobClass.prototype instanceof Job)) {
        errors.push(`Job entry point does not extend App.Job: ${runtime.manifest.jobs[name].entry_point}`);
      } else {
        if (typeof jobClass.prototype.prepare !== 'function') {
          errors.push(`Job entry point is missing the prepare method: ${runtime.manifest.jobs[name].entry_point}`);
        }
        if (typeof jobClass.prototype.perform !== 'function') {
          errors.push(`Job entry point is missing the perform method: ${runtime.manifest.jobs[name].entry_point}`);
        }
      }

      const job = runtime.manifest.jobs[name];
      if (job) {
        if (job.cron && !cronValidator.isValidCronExpression(job.cron)) {
          errors.push(`Invalid CRON expression: ${job.entry_point}`);
        }
      }
    }
  }

  return errors;
}
