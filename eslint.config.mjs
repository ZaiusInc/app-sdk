import node from '@zaiusinc/eslint-config-presets/node.mjs';
import jestPlugin from 'eslint-plugin-jest';

export default [
  ...node,
  {
    files: ['**/*.test.ts'],
    plugins: {
      jest: jestPlugin
    },
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      'jest/unbound-method': 'error'
    }
  }
];