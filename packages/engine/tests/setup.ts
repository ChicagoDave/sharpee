/**
 * Test setup for @sharpee/engine
 * 
 * This file is run before all tests
 */

import { beforeAll, afterAll, vi } from 'vitest'

// Mock console for cleaner test output
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  // Suppress expected warnings in tests
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterAll(() => {
  // Restore console
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global test utilities
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// No longer importing language provider here - stories will handle this through proper initialization
