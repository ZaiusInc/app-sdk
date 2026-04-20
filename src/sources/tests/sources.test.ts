import {SourceData} from '../Source';
import {SourceApi, initializeSourceApi, sources} from '../sources';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import sourcesModule = require('../sources');

// Mock SourceApi that records calls
const createMockSourceApi = (): SourceApi & {lastCall?: {sourceName: string; data: SourceData<any>}} => {
  const api: SourceApi & {lastCall?: {sourceName: string; data: SourceData<any>}} = {
    emit: jest.fn().mockResolvedValue({success: true}),
    emitToSource: jest.fn().mockImplementation(async (sourceName: string, data: SourceData<any>) => {
      api.lastCall = {sourceName, data};
      return {success: true};
    })
  };
  return api;
};

describe('sources.emit', () => {
  let mockApi: ReturnType<typeof createMockSourceApi>;

  beforeEach(() => {
    mockApi = createMockSourceApi();
    initializeSourceApi(mockApi);
  });

  it('throws if sourceApi is not initialized', async () => {
    sourcesModule.sourceApi = undefined;

    await expect(sources.emit('test', {data: {}} as any)).rejects.toThrow('Source API is not initialized');

    // Restore
    sourcesModule.sourceApi = mockApi;
  });

  it('passes through data without _language', async () => {
    const data = {data: {foo: 'bar'}} as any;
    const result = await sources.emit('mySource', data);
    expect(result.success).toBe(true);
    expect(mockApi.emitToSource).toHaveBeenCalledWith('mySource', data);
  });

  it('passes through data with valid _language', async () => {
    const result = await sources.emit('mySource', {data: {_language: 'en'}} as any);
    expect(result.success).toBe(true);
    expect(mockApi.lastCall?.data.data._language).toBe('en');
  });

  it('normalizes _language before passing to emitToSource', async () => {
    const data = {data: {_language: 'en_us', title: 'Hello'}} as any;
    const result = await sources.emit('mySource', data);
    expect(result.success).toBe(true);
    // emitToSource receives the normalized form
    expect(mockApi.lastCall?.data.data._language).toBe('en-US');
    // caller's original object is not mutated
    expect(data.data._language).toBe('en_us');
  });

  it('returns failure for invalid _language without calling emitToSource', async () => {
    const result = await sources.emit('mySource', {data: {_language: 'invalid-tag-zzz'}} as any);
    expect(result.success).toBe(false);
    expect(result.message).toContain('_language');
    expect(mockApi.emitToSource).not.toHaveBeenCalled();
  });

  it('passes through null _language without validation', async () => {
    const result = await sources.emit('mySource', {data: {_language: null, id: '1'}} as any);
    expect(result.success).toBe(true);
    expect(mockApi.lastCall?.data.data._language).toBeNull();
  });

  it('returns failure for non-string _language', async () => {
    const result = await sources.emit('mySource', {data: {_language: 123}} as any);
    expect(result.success).toBe(false);
    expect(result.message).toContain('must be a string');
  });

  it('passes through undefined _language without validation', async () => {
    const result = await sources.emit('mySource', {data: {_language: undefined, id: '1'}} as any);
    expect(result.success).toBe(true);
    expect(mockApi.lastCall?.data.data._language).toBeUndefined();
  });

  it('passes through _isDeleted alongside valid _language', async () => {
    const result = await sources.emit('mySource', {
      data: {_isDeleted: true, _language: 'fr', id: '123'}
    } as any);
    expect(result.success).toBe(true);
    expect(mockApi.lastCall?.data.data._isDeleted).toBe(true);
    expect(mockApi.lastCall?.data.data._language).toBe('fr');
  });
});
