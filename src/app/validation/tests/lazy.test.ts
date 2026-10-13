import * as fs from 'fs';
import 'jest';
import * as path from 'path';

// No static imports from the SDK here: they would load modules before the tracking mocks below exist.
const mockLoaded: string[] = [];

// Record when a validation-only module is loaded. The package root is on the hot path of every function and
// job process, so none of these may load until validation is actually requested.
const validationDir = path.resolve(__dirname, '..');
for (const file of fs.readdirSync(validationDir)) {
  const name = path.basename(file, '.ts');
  // index and validateApp are stubbed below, and lazy is the root's entry into validation
  if (!file.endsWith('.ts') || ['index', 'validateApp', 'lazy'].includes(name)) {
    continue;
  }
  const modulePath = path.join(validationDir, name);
  // doMock isn't hoisted, which is fine: nothing from the SDK loads until a test imports it
  jest.doMock(modulePath, () => {
    mockLoaded.push(name);
    return jest.requireActual(modulePath);
  });
}
jest.mock('remark', () => {
  mockLoaded.push('remark');
  return jest.requireActual('remark');
});
jest.mock('remark-validate-links', () => {
  mockLoaded.push('remark-validate-links');
  return jest.requireActual('remark-validate-links');
});
jest.mock('json-schema-merge-allof', () => {
  mockLoaded.push('json-schema-merge-allof');
  return jest.requireActual('json-schema-merge-allof');
});
jest.mock('jsonpath-rfc9535', () => {
  mockLoaded.push('jsonpath-rfc9535');
  return jest.requireActual('jsonpath-rfc9535');
});
// Runtime only needs ajv to validate the manifest, so it must not load with the root either
jest.mock('ajv', () => {
  mockLoaded.push('ajv');
  return jest.requireActual('ajv');
});
// Keep the module's real exports so a regressed barrel that re-exports it still exposes the full API, and the
// test fails on mockLoaded rather than on a missing export.
jest.mock('../index', () => {
  mockLoaded.push('validation');
  return {
    ...jest.requireActual('../index'),
    runValidation: jest.fn().mockResolvedValue({success: false, errors: ['error']})
  };
});
jest.mock('../validateApp', () => {
  mockLoaded.push('validateApp');
  return {validateApp: jest.fn().mockResolvedValue(['error'])};
});

describe('lazy validation', () => {
  beforeEach(() => {
    jest.resetModules();
    mockLoaded.length = 0;
  });

  it('does not load the validation subtree when the package root is imported', async () => {
    const sdk = await import('../../../index');

    expect(mockLoaded).toEqual([]);
    expect(sdk.runValidation).toBeDefined();
    expect(sdk.validateApp).toBeDefined();
  });

  it('loads validation on the first runValidation call', async () => {
    const {runValidation} = await import('../../../index');

    const result = await runValidation({silent: true});

    expect(result).toEqual({success: false, errors: ['error']});
    expect((await import('../index')).runValidation).toHaveBeenCalledWith({silent: true});
  });

  it('loads validation on the first validateApp call', async () => {
    const {Runtime, validateApp} = await import('../../../index');
    const runtime = Runtime.fromJson(JSON.stringify({appManifest: {}, dirName: '/tmp/foo'}));

    const errors = await validateApp(runtime, ['events']);

    expect(errors).toEqual(['error']);
    expect((await import('../validateApp')).validateApp).toHaveBeenCalledWith(runtime, ['events']);
  });
});
