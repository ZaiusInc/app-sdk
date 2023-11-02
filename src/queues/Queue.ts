/**
 * Imposes a JSON-serializable constraint on queue messages.
 */
export type JSONEncodable = string | number | boolean | null | JSONEncodable[] | { [key: string]: JSONEncodable };

/**
 * Queue message
 * @param message JSON-seralizable message to send
 * @param deduplicationId deduplication id is applicable for fifo queues and ignored for standard queues.
 * Messages sent with identical message content are considered as duplicates if deduplication id is omitted.
 * If a message with a particular deduplicationId is sent successfully,
 * any messages sent with the same deduplicationId are accepted successfully but aren't delivered
 * during the 5-minute interval.
 */
export interface QueueMessage<T extends JSONEncodable> {
  message: T;
  deduplicationId?: string;
}

/**
 * Interface to send messages to a queue
 */
export interface Queue {
  /**
   * Send a single queue message to a queue.
   * @param queueName Name of the queue, as defined in app.yml
   * @param queueMessage JSON-seralizable message to send
   */
  send<T extends JSONEncodable>(queueName: string, queueMessage: QueueMessage<T> | T): Promise<void>;

  /**
   * Sends a batch of queue messages to a queue.
   * @param queueName Name of the queue, as defined in app.yml
   * @param messages List of JSON-seralizable messages to send
   */
  sendBatch<T extends JSONEncodable>(queueName: string, messages: Array<QueueMessage<T>> | T[]): Promise<void>;
}
