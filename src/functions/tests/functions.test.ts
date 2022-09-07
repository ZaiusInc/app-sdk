import 'jest';
import {functions, initializeFunctionApi} from '../functions';

describe('functions', () => {
  const mockFunctionApi = {
    getEndpoints: jest.fn(),
    getGlobalEndpoints: jest.fn(),
    getAuthorizationGrantUrl: jest.fn()
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('uses the configured implementation for getAllEndpoints', async () => {
    initializeFunctionApi(mockFunctionApi);
    await functions.getEndpoints();
    expect(mockFunctionApi.getEndpoints).toHaveBeenCalled();
  });

  it('uses the configured implementation for getGlobalEndpoints', async () => {
    initializeFunctionApi(mockFunctionApi);
    await functions.getGlobalEndpoints();
    expect(mockFunctionApi.getGlobalEndpoints).toHaveBeenCalled();
  });

  it('uses the configured implementation for getAuthorizationGrantUrl', () => {
    initializeFunctionApi(mockFunctionApi);
    functions.getAuthorizationGrantUrl();
    expect(mockFunctionApi.getAuthorizationGrantUrl).toHaveBeenCalled();
  });
});
