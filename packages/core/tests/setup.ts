// Test setup file to clean up warnings

// Suppress deprecation warnings (like punycode)
process.removeAllListeners('warning');

// Store original console methods
const originalWarn = console.warn;
const originalError = console.error;

// Filter out specific warnings
global.console.warn = (...args) => {
  const warningMessage = args[0]?.toString() || '';
  
  // Filter out React key warnings (if any)
  if (warningMessage.includes('Each child in a list should have a unique "key"')) return;
  
  // Filter out punycode deprecation
  if (warningMessage.includes('DEP0040')) return;
  
  // Pass through other warnings
  originalWarn.apply(console, args);
};

// Optional: Filter errors if needed
global.console.error = (...args) => {
  const errorMessage = args[0]?.toString() || '';
  
  // Add any error filters here if needed
  
  originalError.apply(console, args);
};

// Restore console methods after all tests
afterAll(() => {
  global.console.warn = originalWarn;
  global.console.error = originalError;
});
