// packages/stdlib/jest.config.js

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    // Match test files in tests directory
    "**/tests/**/*.test.ts"
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.d.ts.map',
    '!src/**/*.js.map',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/index.ts', // Exclude index files that just re-export
    '!src/**/.archived/**', // Exclude archived files
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90
    },
    // Per-file/directory thresholds
    './src/actions/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/parser/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/validation/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Paths to ignore for coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/dist/',
    '/.archived/'
  ],
  
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: false,
    }],
  },
  
  // Test environment setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true
};
