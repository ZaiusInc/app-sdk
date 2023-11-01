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
   * @param deduplicationId deduplication id for fifo queues
   */
  send<T extends JSONEncodable>(queueName: string, message: T, deduplicationId?: string): Promise<void>;

  /**
   * Sends a batch of messages to a queue.
   * @param queueName Name of the queue, as defined in app.yml
   * @param messages List of JSON-seralizable messages to send
   * @param deduplicationId deduplication id for fifo queues
   */
  sendBatch<T extends JSONEncodable>(queueName: string, messages: T[], deduplicationId?: string): Promise<void>;
}
