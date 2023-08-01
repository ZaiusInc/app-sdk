import { logger } from '../logging';
import { BaseQueue, JSONEncodable } from './BaseQueue';

export class LocalQueue implements BaseQueue {
  public async send<T extends JSONEncodable>(queueName: string, message: T, group?: string) {
    logger.debug(`Sending message to queue: ${queueName}, group: ${group}, message: ${JSON.stringify(message)}`);
  }

  public async sendBatch<T extends JSONEncodable>(queueName: string, messages: T[], group?: string) {
    logger.debug(`Sending message to queue: ${queueName}, group: ${group}, messages: ${JSON.stringify(messages)}`);
  }
}
