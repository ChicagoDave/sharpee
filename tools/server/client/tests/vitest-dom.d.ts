/**
 * Ambient declaration — wires @testing-library/jest-dom's extra matchers into
 * Vitest's Assertion interface for all test files.
 *
 * Public interface: none (ambient).
 * Bounded context: client test types.
 */

import '@testing-library/jest-dom/vitest';
