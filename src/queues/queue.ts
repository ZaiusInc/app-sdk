/**
 * Imposes a JSON-serializable constraint on queue messages.
 */
export type JSONEncodable = string | number | boolean | null | JSONEncodable[] | { [key: string]: JSONEncodable };

/**
 * Interface to send messages to a queue
 */
export interface Queue {
  /**
   * Send a single message to a queue.
   * @param queueName Name of the queue, as defined in app.yml
   * @param message JSON-seralizable message to send
   * @param group Optional group id of the message (for FIFO queues only)
   */
  send<T extends JSONEncodable>(queueName: string, message: T, group?: string): Promise<void>;

  /**
   * Sends a batch of messages to a queue.
   * @param queueName Name of the queue, as defined in app.yml
   * @param messages List of JSON-seralizable messages to send
   * @param group Optional group id of all messages (for FIFO queues only)
   */
  sendBatch<T extends JSONEncodable>(queueName: string, messages: T[], group?: string): Promise<void>;
}
