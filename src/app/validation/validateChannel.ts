import {logger} from '../../logging';
import {CHANNEL_REQUIRED_METHODS} from '../Channel';
import {Channel} from '../Channel';
import {Runtime} from '../Runtime';

export async function validateChannel(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];

  if (runtime.manifest.meta && (runtime.manifest.meta.categories || []).includes('Channel')) {
    if (!runtime.manifest.channel) {
      errors.push('Invalid app.yml: channel must exist when meta.categories includes "Channel"');
    }

    // Make sure the channel exists and is implemented
    let channelClass = null;
    try {
      channelClass = await runtime.getChannelClass();
    } catch (e) {
      logger.error(e);
    }
    if (!channelClass) {
      errors.push('Channel implementation not found');
    } else if (!(channelClass.prototype instanceof Channel)) {
      errors.push('Channel implementation does not extend App.Channel');
    } else {
      for (const method of CHANNEL_REQUIRED_METHODS) {
        if (typeof (channelClass.prototype as any)[method] !== 'function') {
          errors.push(`Channel implementation is missing the ${method} method`);
        }
      }
      if (runtime.manifest.channel && runtime.manifest.channel.targeting === 'dynamic' &&
        typeof (channelClass.prototype as any).target !== 'function') {
        errors.push('Channel implementation is missing the target method (required for dynamic targeting mode)');
      }
    }
  }

  return errors;
}
