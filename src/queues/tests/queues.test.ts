import 'jest';
import { initializeQueue, queue } from '../queues';
import { QueueMessage } from '../Queue';

describe('queues', () => {
  const mockQueueBackend = {
    send: jest.fn(),
    sendBatch: jest.fn()
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('uses the configured backed for send', async () => {
    initializeQueue(mockQueueBackend);
    await queue.send('name', new QueueMessage('message'));
    expect(mockQueueBackend.send).toHaveBeenCalledWith('name', 'message');
  });

  it('uses the configured backed for sendBatch', async () => {
    initializeQueue(mockQueueBackend);
    await queue.sendBatch('name', [new QueueMessage('message')]);
    expect(mockQueueBackend.sendBatch).toHaveBeenCalledWith('name', [new QueueMessage('message')]);
  });
});
