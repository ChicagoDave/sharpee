// packages/core/jest.config.js

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: [
      // Match test files in __tests__ directories
      "**/__tests__/**/*.test.ts",
      // Also match test files with .test.ts suffix in any directory (for compatibility)
      "**/*.test.ts"
    ],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/**/*.d.ts',
      '!src/**/__tests__/**',
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    transform: {
      '^.+\\.tsx?$': ['ts-jest', {
        tsconfig: 'tsconfig.json',
        diagnostics: false,
      }],
    },
  };
