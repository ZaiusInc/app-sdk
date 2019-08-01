import 'jest';
import {initializeJobApi, jobs} from './jobs';

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

  it('uses the configured implementation for trigger', () => {
    initializeJobApi(mockJobApi);
    jobs.trigger('foo', {});
    expect(mockJobApi.trigger).toHaveBeenCalled();
  });

  it('uses the configured implementation for getJobDetail', () => {
    initializeJobApi(mockJobApi);
    jobs.getDetail(mockJobId);
    expect(mockJobApi.getDetail).toHaveBeenCalledWith(mockJobId);
  });

  it('uses the configured implementation for getStatus', () => {
    initializeJobApi(mockJobApi);
    jobs.getStatus(mockJobId);
    expect(mockJobApi.getStatus).toHaveBeenCalledWith(mockJobId);
  });
});
