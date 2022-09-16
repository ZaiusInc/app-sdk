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
    '!src/jobs/JobNotFoundError.ts',
    '!src/notifications/LocalNotifier.ts',
    '!src/app/validation/runValidation.ts',
    '!src/globals.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  testEnvironment: 'node'
};
