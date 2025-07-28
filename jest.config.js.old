module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  projects: [
    '<rootDir>/packages/*/jest.config.js',
    '<rootDir>/stories/*/jest.config.js'
  ]
};
