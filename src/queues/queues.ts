import { JSONEncodable, Queue } from './Queue';
import { LocalQueue } from './LocalQueue';

let queueBackend: Queue = new LocalQueue();

/**
 * @hidden
 */
export const initializeQueue = (newQueue: Queue) => {
  queueBackend = newQueue;
};

/**
 * Exposes the queue API
 */
export const queue: Queue = {
  send<T extends JSONEncodable>(queueName: string, message: T, deduplicationId?: string) {
    return queueBackend.send(queueName, message, deduplicationId);
  },
  sendBatch<T extends JSONEncodable>(queueName: string, messages: T[], deduplicationId?: string) {
    return queueBackend.sendBatch(queueName, messages, deduplicationId);
  }
};
