import { logger } from '../logging';
import { JSONEncodable, Queue, QueueMessage } from './Queue';

/**
 * @hidden
 * Local stub of the Queue interface.
 * Only logs inputs for now.
 */
export class LocalQueue implements Queue {
  public async send<T extends JSONEncodable>(queueName: string, queueMessage: QueueMessage<T>) {
    logger.debug(
      `Sending message to queue: ${queueName}, 
      message: ${JSON.stringify(queueMessage)}`);
  }

  public async sendBatch<T extends JSONEncodable>(queueName: string, queueMessages: Array<QueueMessage<T>>) {
    logger.debug(
      `Sending message to queue: ${queueName}, 
      essages: ${JSON.stringify(queueMessages)}`);
  }
}
