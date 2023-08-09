export interface Queue {
  send(queueName: string, message: string, group?: string): Promise<void>;
  sendBatch(queueName: string, messages: string[], group?: string): Promise<void>;
}
