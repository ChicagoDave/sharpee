module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  displayName: 'stdlib',
  rootDir: './'
};
