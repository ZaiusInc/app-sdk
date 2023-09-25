import { logger } from '../logging';
import { JSONEncodable, Queue } from './Queue';

/**
 * @hidden
 * Local stub of the Queue interface.
 * Only logs inputs for now.
 */
export class LocalQueue implements Queue {
  public async send<T extends JSONEncodable>(queueName: string, message: T) {
    logger.debug(`Sending message to queue: ${queueName}, message: ${JSON.stringify(message)}`);
  }

  public async sendBatch<T extends JSONEncodable>(queueName: string, messages: T[]) {
    logger.debug(`Sending message to queue: ${queueName}, messages: ${JSON.stringify(messages)}`);
  }
}
