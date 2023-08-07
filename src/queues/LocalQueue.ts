import { logger } from '../logging';
import { BaseQueue } from './BaseQueue';

export class LocalQueue implements BaseQueue {
  public async send(queueName: string, message: string, group?: string) {
    logger.debug(`Sending message to queue: ${queueName}, group: ${group}, message: ${message}`);
  }

  public async sendBatch(queueName: string, messages: string[], group?: string) {
    logger.debug(`Sending message to queue: ${queueName}, group: ${group}, messages: ${messages.join(', ')}`);
  }
}
