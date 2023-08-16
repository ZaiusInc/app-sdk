import 'jest';
import { initializeQueue, queue } from '../queues';

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
    await queue.send('name', 'message', 'group');
    expect(mockQueueBackend.send).toHaveBeenCalledWith('name', 'message', 'group');
  });

  it('uses the configured backed for sendBatch', async () => {
    initializeQueue(mockQueueBackend);
    await queue.sendBatch('name', ['message'], 'group');
    expect(mockQueueBackend.sendBatch).toHaveBeenCalledWith('name', ['message'], 'group');
  });
});
