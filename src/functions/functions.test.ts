import 'jest';
import {initializeFunctionApi, functions} from './functions';

describe('functions', () => {
  const mockFunctionApi = {
    getEndpoint: jest.fn(),
    getAllEndpoints: jest.fn()
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('uses the configured implementation for getEndpoint', () => {
    initializeFunctionApi(mockFunctionApi);
    functions.getEndpoint('foo');
    expect(mockFunctionApi.getEndpoint).toHaveBeenCalledWith('foo');
  });

  it('uses the configured implementation for getAllEndpoints', () => {
    initializeFunctionApi(mockFunctionApi);
    functions.getAllEndpoints();
    expect(mockFunctionApi.getAllEndpoints).toHaveBeenCalled();
  });
});
