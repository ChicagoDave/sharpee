// packages/core/jest.config.js

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: [
      // Match test files in tests directory
      "**/tests/**/*.test.ts",
      // Also match test files in __tests__ directories (for compatibility)
      "**/__tests__/**/*.test.ts"
    ],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/**/*.d.ts',
      '!src/**/__tests__/**',
      '!src/**/*.test.ts',
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    transform: {
      '^.+\\.tsx?$': ['ts-jest', {
        tsconfig: 'tsconfig.json',
        diagnostics: false,
      }],
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
  };
