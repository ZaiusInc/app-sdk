module.exports = {
    extends: '@zaiusinc/eslint-config-presets/node',
    overrides: [
        {
          files: ['**/*.test.ts'],
          plugins: ['jest'],
          rules: {
            // you should turn the original rule off *only* for test files
            '@typescript-eslint/unbound-method': 'off',
            'jest/unbound-method': 'error',
          },
        },
    ],
    rules: {
    },
  }
  