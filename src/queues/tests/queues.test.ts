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
    await queue.send('name', { message: 'message' });
    expect(mockQueueBackend.send).toHaveBeenCalledWith('name', { message: 'message' });
  });

  it('uses the configured backed for send', async () => {
    initializeQueue(mockQueueBackend);
    await queue.send('name', 'message');
    expect(mockQueueBackend.send).toHaveBeenCalledWith('name', 'message');
  });

  it('uses the configured backed for send with deduplicationId', async () => {
    initializeQueue(mockQueueBackend);
    await queue.send('name', { message: 'message', deduplicationId: '123' });
    expect(mockQueueBackend.send).toHaveBeenCalledWith('name', { message: 'message', deduplicationId: '123' });
  });

  it('uses the configured backed for sendBatch', async () => {
    initializeQueue(mockQueueBackend);
    await queue.sendBatch('name', ['message']);
    expect(mockQueueBackend.sendBatch).toHaveBeenCalledWith('name', ['message']);
  });

  it('uses the configured backed for sendBatch with deduplicationId', async () => {
    initializeQueue(mockQueueBackend);
    await queue.sendBatch('name', [{ message: 'message', deduplicationId: '123' }]);
    expect(mockQueueBackend.sendBatch).toHaveBeenCalledWith('name', [{ message: 'message', deduplicationId: '123' }]);
  });
});
