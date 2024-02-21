import 'jest';
import {jobs} from '../jobs';
import {LocalJobApi} from '../LocalJobApi';

describe('jobs', () => {
  const mockJobApi = {
    trigger: jest.fn(),
    getDetail: jest.fn(),
    getStatus: jest.fn()
  };
  const mockJobId = '8157c520-b0a3-47c7-a8a6-b09d3ca24b78';

  beforeEach(() => {
    global.ocpRuntime = {
      jobApi: mockJobApi
    } as any;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('uses local job Api if not configured', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.ocpRuntime = null;
    const getEndpointsFn = jest.spyOn(LocalJobApi.prototype, 'trigger');

    expect(() => jobs.trigger('foot', {})).toThrow();
    expect(getEndpointsFn).toHaveBeenCalled();
  });

  it('uses the configured implementation for trigger', async () => {
    await jobs.trigger('foo', {});
    expect(mockJobApi.trigger).toHaveBeenCalled();
  });

  it('uses the configured implementation for getJobDetail', async () => {
    await jobs.getDetail(mockJobId);
    expect(mockJobApi.getDetail).toHaveBeenCalledWith(mockJobId);
  });

  it('uses the configured implementation for getStatus', async () => {
    await jobs.getStatus(mockJobId);
    expect(mockJobApi.getStatus).toHaveBeenCalledWith(mockJobId);
  });
});
