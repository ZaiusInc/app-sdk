import {logger} from '../../logging';
import {Channel, CHANNEL_REQUIRED_METHODS} from '../Channel';
import {Runtime} from '../Runtime';

export async function validateChannel(runtime: Runtime): Promise<string[]> {
  const errors: string[] = [];
  const channelManifest = runtime.manifest.channel;

  if (runtime.manifest.meta && (runtime.manifest.meta.categories || []).includes('Channel')) {
    if (!channelManifest) {
      errors.push('Invalid app.yml: channel must exist when meta.categories includes "Channel"');
    } else if (channelManifest?.targeting === undefined) {
      errors.push('Invalid app.yml: channel.targeting cannot be blank for a channel app');
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

      const hasPrepare = typeof (channelClass.prototype as any).prepare === 'function';
      const needsPrepare = channelManifest?.options?.prepare === undefined ? true : channelManifest.options.prepare;
      if (needsPrepare && !hasPrepare) {
        errors.push('Channel implementation is missing the prepare method. ' +
          'Either implement prepare or specify you do not need prepare in the channel options.');
      } else if (!needsPrepare && hasPrepare) {
        errors.push('Channel implementation implements the prepare method, ' +
          'but the channel options specify you do not need prepare');
      }

      const hasTarget = typeof (channelClass.prototype as any).target === 'function';
      const needsTarget = channelManifest?.targeting === 'dynamic';
      if (needsTarget && !hasTarget) {
        errors.push('Channel implementation is missing the target method (required for dynamic targeting)');
      } else if (!needsTarget && hasTarget) {
        errors.push(
          'Channel implementation implements the target method, but it will not be used with static targeting'
        );
      }
    }
  }

  return errors;
}
