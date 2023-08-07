import { BaseQueue } from './BaseQueue';
import { LocalQueue } from './LocalQueue';

let queueBackend: BaseQueue = new LocalQueue();

export const initializeQueue = (newQueue: BaseQueue) => {
  queueBackend = newQueue;
};

export const queue: BaseQueue = {
  send(queueName: string, message: string, group?: string) {
    return queueBackend.send(queueName, message, group);
  },
  sendBatch(queueName: string, messages: string[], group?: string) {
    return queueBackend.sendBatch(queueName, messages, group);
  }
};
