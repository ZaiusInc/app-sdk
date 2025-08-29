import node from '@zaiusinc/eslint-config-presets/node.mjs';
import prettier from "eslint-plugin-prettier";
import eslintConfigPrettier from 'eslint-config-prettier';

import jestPlugin from 'eslint-plugin-jest';

export default [
  ...node,
  {
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['**/*.test.ts'],
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      'jest/unbound-method': 'error',
    }
  },
  eslintConfigPrettier
];
