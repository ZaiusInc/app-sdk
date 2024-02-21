import 'jest';
import {functions} from '../functions';
import {LocalFunctionApi} from '../LocalFunctionApi';

describe('functions', () => {
  const mockFunctionApi = {
    getEndpoints: jest.fn(),
    getGlobalEndpoints: jest.fn(),
    getAuthorizationGrantUrl: jest.fn()
  };

  beforeEach(() => {
    global.ocpRuntime = {
      functionApi: mockFunctionApi
    } as any;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('uses local functions if not configured', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.ocpRuntime = null;
    const getEndpointsFn = jest.spyOn(LocalFunctionApi.prototype, 'getEndpoints');

    expect(() => functions.getEndpoints()).toThrow();
    expect(getEndpointsFn).toHaveBeenCalled();
  });

  it('uses the configured implementation for getAllEndpoints', async () => {
    await functions.getEndpoints();
    expect(mockFunctionApi.getEndpoints).toHaveBeenCalled();
  });

  it('uses the configured implementation for getGlobalEndpoints', async () => {
    await functions.getGlobalEndpoints();
    expect(mockFunctionApi.getGlobalEndpoints).toHaveBeenCalled();
  });

  it('uses the configured implementation for getAuthorizationGrantUrl', () => {
    functions.getAuthorizationGrantUrl();
    expect(mockFunctionApi.getAuthorizationGrantUrl).toHaveBeenCalled();
  });
});
