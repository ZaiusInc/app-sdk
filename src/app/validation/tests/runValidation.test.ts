import 'jest';

import {Runtime} from '../../Runtime';
import {runValidation} from '../index';
import {validateApp} from '../validateApp';

jest.mock('../../Runtime');
jest.mock('../validateApp');

describe('runValidation', () => {
  const mockRuntime = {} as Runtime;

  beforeEach(() => {
    jest.clearAllMocks();
    (Runtime.initialize as jest.Mock).mockResolvedValue(mockRuntime);
    (validateApp as jest.Mock).mockResolvedValue([]);
  });

  it('returns success when validation passes', async () => {
    const result = await runValidation({silent: true});

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns failure with errors when validation fails', async () => {
    (validateApp as jest.Mock).mockResolvedValue(['error 1', 'error 2']);

    const result = await runValidation({silent: true});

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['error 1', 'error 2']);
  });

  it('uses default options when none provided', async () => {
    await runValidation({silent: true});

    expect(Runtime.initialize).toHaveBeenCalledWith(expect.stringContaining('dist'), true);
  });

  it('uses custom baseDir and distDir when provided', async () => {
    await runValidation({baseDir: '/custom/path', distDir: 'build', silent: true});

    expect(Runtime.initialize).toHaveBeenCalledWith('/custom/path/build', true);
  });

  it('passes baseObjectNames to validateApp', async () => {
    const baseObjectNames = ['events', 'customers'];
    await runValidation({baseObjectNames, silent: true});

    expect(validateApp).toHaveBeenCalledWith(mockRuntime, baseObjectNames);
  });

  it('handles runtime initialization errors', async () => {
    (Runtime.initialize as jest.Mock).mockRejectedValue(new Error('Failed to initialize'));

    const result = await runValidation({silent: true});

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['Validation process failed: Failed to initialize']);
  });

  it('handles validateApp throwing an error', async () => {
    (validateApp as jest.Mock).mockRejectedValue(new Error('Validation error'));

    const result = await runValidation({silent: true});

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['Validation process failed: Validation error']);
  });
});
