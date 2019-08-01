import 'jest';
import {functions, initializeFunctionApi} from './functions';

describe('functions', () => {
  const mockFunctionApi = {
    getEndpoints: jest.fn()
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('uses the configured implementation for getAllEndpoints', () => {
    initializeFunctionApi(mockFunctionApi);
    functions.getEndpoints();
    expect(mockFunctionApi.getEndpoints).toHaveBeenCalled();
  });
});
