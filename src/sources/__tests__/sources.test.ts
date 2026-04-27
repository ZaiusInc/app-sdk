import {sources, initializeSourceApi, SourceApi} from '../sources';

describe('sources.emit', () => {
  let mockEmitToSource: jest.Mock;
  let mockApi: SourceApi;

  beforeEach(() => {
    mockEmitToSource = jest.fn().mockResolvedValue({success: true});
    mockApi = {
      emit: jest.fn(),
      emitToSource: mockEmitToSource
    } as unknown as SourceApi;
    initializeSourceApi(mockApi);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('forwards data without _locale to emitToSource', async () => {
    const result = await sources.emit<{id: string; _locale?: string}>('product_listing', {data: {id: 'p1'}});
    expect(result.success).toBe(true);
    expect(mockEmitToSource).toHaveBeenCalledWith('product_listing', {data: {id: 'p1'}});
  });

  it('forwards data with _locale verbatim to emitToSource', async () => {
    const data = {data: {_locale: 'en', id: 'p1'}};
    const result = await sources.emit('product_listing', data);
    expect(result.success).toBe(true);
    expect(mockEmitToSource).toHaveBeenCalledWith('product_listing', data);
  });

  it('throws when sourceApi is not initialized', async () => {
    initializeSourceApi(undefined as any);
    await expect(sources.emit<{id: string; _locale?: string}>('product_listing', {data: {id: 'p1'}})).rejects.toThrow(
      'Source API is not initialized'
    );
  });
});
