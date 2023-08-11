/* eslint max-classes-per-file: "off" */
import { ConsumerResult } from './types/ConsumerResult';

export class Batch {
  public constructor(private messages: Message[]) {
  }

  public getMessages(): Message[] {
    return this.messages;
  }
}

export class Message {
  private payload: object;

  public constructor(payload: object) {
    this.payload = payload;
  }

  public getPayload(): object {
    return this.payload;
  }
}

export abstract class Consumer {
  /**
   * Initializes a Consumer to be executed
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: 6138 declared but never read
  public constructor(protected batch: Batch) {
  }

  /**
   * Processes a batch of messages. Consumers should process a batch of messages and return a result containing
   * the success or failure of batch.
   * A batch should be processed in a timely manner this means the batch size needs to be
   * adjusted to ensure timely processing.
   * @returns The result of the batch processing.
   */
  public abstract perform(): Promise<ConsumerResult>;
}
