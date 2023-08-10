export type JSONEncodable = string | number | boolean | null | JSONEncodable[] | { [key: string]: JSONEncodable };

export interface Queue {
  send<T extends JSONEncodable>(queueName: string, message: T, group?: string): Promise<void>;
  sendBatch<T extends JSONEncodable>(queueName: string, messages: T[], group?: string): Promise<void>;
}
