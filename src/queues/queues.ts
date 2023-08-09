import { Queue } from './Queue';
import { LocalQueue } from './LocalQueue';

let queueBackend: Queue = new LocalQueue();

export const initializeQueue = (newQueue: Queue) => {
  queueBackend = newQueue;
};

export const queue: Queue = {
  send(queueName: string, message: string, group?: string) {
    return queueBackend.send(queueName, message, group);
  },
  sendBatch(queueName: string, messages: string[], group?: string) {
    return queueBackend.sendBatch(queueName, messages, group);
  }
};
