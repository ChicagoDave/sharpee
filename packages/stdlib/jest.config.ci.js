// Jest configuration for CI environments
// Extends the base configuration with CI-specific settings

const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  
  // CI-specific settings
  ci: true,
  
  // Disable watch mode
  watchAll: false,
  
  // Run tests in band to avoid memory issues
  maxWorkers: 2,
  
  // Fail on coverage threshold violations
  coverageThreshold: {
    ...baseConfig.coverageThreshold,
    global: {
      branches: 75, // Slightly lower for CI initially
      functions: 80,
      lines: 85,
      statements: 85
    }
  },
  
  // Silent mode for cleaner CI logs
  silent: false,
  
  // Bail on first test failure
  bail: 1,
  
  // Additional reporters for CI
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: 'true'
    }]
  ]
};
