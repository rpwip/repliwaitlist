/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  moduleNameMapper: {
    '^@db/(.*)$': '<rootDir>/db/$1',
  },
  setupFiles: ['<rootDir>/server/tests/setup.ts'],
};
