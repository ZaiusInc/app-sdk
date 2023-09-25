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
   */
  send<T extends JSONEncodable>(queueName: string, message: T): Promise<void>;

  /**
   * Sends a batch of messages to a queue.
   * @param queueName Name of the queue, as defined in app.yml
   * @param messages List of JSON-seralizable messages to send
   */
  sendBatch<T extends JSONEncodable>(queueName: string, messages: T[]): Promise<void>;
}
