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
  send<T extends JSONEncodable>(queueName: string, message: T) {
    return queueBackend.send(queueName, message);
  },
  sendBatch<T extends JSONEncodable>(queueName: string, messages: T[]) {
    return queueBackend.sendBatch(queueName, messages);
  }
};
