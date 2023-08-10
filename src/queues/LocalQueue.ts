import { logger } from '../logging';
import { JSONEncodable, Queue } from './Queue';

export class LocalQueue implements Queue {
  public async send<T extends JSONEncodable>(queueName: string, message: T, group?: string) {
    logger.debug(`Sending message to queue: ${queueName}, group: ${group}, message: ${JSON.stringify(message)}`);
  }

  public async sendBatch<T extends JSONEncodable>(queueName: string, messages: T[], group?: string) {
    logger.debug(`Sending message to queue: ${queueName}, group: ${group}, messages: ${JSON.stringify(messages)}`);
  }
}
