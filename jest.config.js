const {defaults} = require('jest-config');

process.env.ZAIUS_ENV = 'test';

module.exports = {
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testRegex: "\\.test\\.tsx?$",
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/example*', '/.yalc/'],
  moduleFileExtensions: [
    ...defaults.moduleFileExtensions,
    "ts"
  ],
  setupFilesAfterEnv: ['./src/test/setup.ts'],
  verbose: true,
  // note: jobApi.ts is presently only interfaces. see: https://github.com/kulshekhar/ts-jest/issues/378
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/index.ts',
    '!src/test/**/*',
    '!src/functions/FunctionApi.ts',
    '!src/functions/LocalFunctionApi.ts',
    '!src/jobs/JobApi.ts',
    '!src/jobs/LocalJobApi.ts',
    '!src/notifications/LocalNotifier.ts',
    '!src/store/LocalStore.ts',
    '!src/store/LocalKVStore.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  testEnvironment: 'node'
};
