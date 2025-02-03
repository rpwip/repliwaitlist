/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  moduleNameMapper: {
    '^@db$': '<rootDir>/db',
    '^@db/(.*)$': '<rootDir>/db/$1',
  },
  setupFiles: [
    '<rootDir>/server/tests/test-setup.ts',
    '<rootDir>/server/tests/setup.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: './tsconfig.json'
    }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'cjs', 'json'],
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  testTimeout: 30000
};