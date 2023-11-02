/* eslint max-classes-per-file: "off" */
import { ConsumerResult } from './types/ConsumerResult';
import { JSONEncodable } from '../queues';

export interface Batch<T extends JSONEncodable> {
  messages: Array<Message<T>>;
}

export interface Message<T extends JSONEncodable> {
  payload: T;
}

export abstract class Consumer<T extends JSONEncodable> {
  /**
   * Processes a batch of messages. Consumers should process a batch of messages and return a result containing
   * the success or failure of batch.
   * A batch should be processed in a timely manner. This means the batch size needs to be
   * adjusted to ensure timely processing.
   * @param batch The batch of messages to process.
   * @returns The result of the batch processing.
   */
  public abstract perform(batch: Batch<T>): Promise<ConsumerResult>;
}
