import 'jest';
import {initializeJobApi, jobs} from '../jobs';

describe('jobs', () => {
  const mockJobApi = {
    trigger: jest.fn(),
    getDetail: jest.fn(),
    getStatus: jest.fn()
  };
  const mockJobId = '8157c520-b0a3-47c7-a8a6-b09d3ca24b78';

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('uses the configured implementation for trigger', async () => {
    initializeJobApi(mockJobApi);
    await jobs.trigger('foo', {});
    expect(mockJobApi.trigger).toHaveBeenCalled();
  });

  it('uses the configured implementation for getJobDetail', async () => {
    initializeJobApi(mockJobApi);
    await jobs.getDetail(mockJobId);
    expect(mockJobApi.getDetail).toHaveBeenCalledWith(mockJobId);
  });

  it('uses the configured implementation for getStatus', async () => {
    initializeJobApi(mockJobApi);
    await jobs.getStatus(mockJobId);
    expect(mockJobApi.getStatus).toHaveBeenCalledWith(mockJobId);
  });
});
