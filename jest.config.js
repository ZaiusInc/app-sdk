const {defaults} = require('jest-config');

process.env.ZAIUS_ENV = 'test';

const esModules = [
  'remark',
  'remark-',
  'mdast-util-.*',
  'micromark',
  'decode-named-character-reference',
  'character-entities',
  'unist-util-stringify-position',
  'zwitch',
  'longest-streak',
  'unist-util-.*',
  'unified',
  'bail',
  'devlop',
  'is-plain-obj',
  'trough',
  'vfile',
  'extend'
].join('|');

module.exports = {
  preset: "ts-jest/presets/js-with-ts",
  transform: {
    "^.+\\.[j|t]sx?$": "ts-jest",
    "node_modules/remark/.+\\.(j|t)sx?$": "ts-jest"
  },
  transformIgnorePatterns: [
    `node_modules/(?!${esModules})`
  ],
  globals: {
    'ts-jest': {
      useESM: true,
      isolatedModules: true,
    },
  },
  testRegex: "\\.test\\.tsx?$",
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/example*', '/.yalc/'],
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
