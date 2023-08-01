import { BaseQueue, JSONEncodable } from './BaseQueue';
import { LocalQueue } from './LocalQueue';

let queueBackend: BaseQueue = new LocalQueue();

export const initializeQueue = (newQueue: BaseQueue) => {
  queueBackend = newQueue;
};

export const queue: BaseQueue = {
  send<T extends JSONEncodable>(queueName: string, message: T, group?: string) {
    return queueBackend.send(queueName, message, group);
  },
  sendBatch<T extends JSONEncodable>(queueName: string, messages: T[], group?: string) {
    return queueBackend.sendBatch(queueName, messages, group);
  }
};
