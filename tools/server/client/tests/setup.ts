/**
 * Vitest setup — runs before each test file.
 *
 * Public interface: none (side-effect module).
 *
 * Bounded context: client test infrastructure. Wires up the jest-dom matchers,
 * replaces Node 25's experimental (and non-functional-without-a-file)
 * `globalThis.localStorage` with an in-memory polyfill that satisfies the
 * Storage interface, and resets state that survives between tests.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/** Minimal in-memory Storage, sufficient for the tests we run. */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

// Override Node 25's experimental localStorage (which is non-functional
// without `--localstorage-file`) with a working polyfill on both window and
// globalThis. Defined as a writable property so tests can spy on
// Storage.prototype methods.
const memoryStorage = new MemoryStorage();
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  writable: true,
  value: memoryStorage,
});
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: memoryStorage,
});

afterEach(() => {
  cleanup();
  memoryStorage.clear();
  // Reset the URL so router-driven tests start from a known state.
  window.history.replaceState(null, '', '/');
});
