const {defaults} = require('jest-config');

process.env.ZAIUS_ENV = 'test';

module.exports = {
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testRegex: "\\.test\\.tsx?$",
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/example*'],
  moduleFileExtensions: [
    ...defaults.moduleFileExtensions,
    "ts"
  ],
  setupFilesAfterEnv: ['./src/test/setup.ts'],
  verbose: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/test/**/*', '!src/**/index.ts'],
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
