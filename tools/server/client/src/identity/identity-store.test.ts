/**
 * Identity-store behavior tests (ADR-161).
 *
 * Behavior Statement — identity-store
 *   DOES: getStoredIdentity reads the three-field triple from
 *         `sharpee:identity` and returns it (or null on missing /
 *         malformed). storeIdentity writes the JSON and notifies same-tab
 *         subscribers. clearStoredIdentity removes the key and notifies.
 *         subscribeToIdentityChanges fires for cross-tab `storage` events
 *         keyed to ours, plus same-tab updates.
 *   WHEN: any client code that reads or mutates the persistent identity.
 *   BECAUSE: ADR-161 — the server cannot recover the passcode; the
 *            browser is the system of record. Cross-tab change propagation
 *            keeps a tab from acting as a now-erased identity.
 *   REJECTS WHEN: localStorage unavailable → reads return null, writes
 *                 silently no-op; malformed JSON or wrong shape →
 *                 getStoredIdentity returns null.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearStoredIdentity,
  getStoredIdentity,
  storeIdentity,
  subscribeToIdentityChanges,
} from './identity-store';

const STORAGE_KEY = 'sharpee:identity';

describe('identity/identity-store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  describe('getStoredIdentity', () => {
    it('returns null when no identity is stored', () => {
      expect(getStoredIdentity()).toBeNull();
    });

    it('returns the persisted triple round-trip', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' }),
      );
      expect(getStoredIdentity()).toEqual({
        id: '1234-ABCD',
        handle: 'Alice',
        passcode: 'plate-music',
      });
    });

    it('returns null when JSON is malformed', () => {
      window.localStorage.setItem(STORAGE_KEY, '{not json');
      expect(getStoredIdentity()).toBeNull();
    });

    it('returns null when id is missing', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ handle: 'Alice', passcode: 'plate-music' }),
      );
      expect(getStoredIdentity()).toBeNull();
    });

    it('returns null when handle is missing', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ id: '1234-ABCD', passcode: 'plate-music' }),
      );
      expect(getStoredIdentity()).toBeNull();
    });

    it('returns null when passcode is missing', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ id: '1234-ABCD', handle: 'Alice' }),
      );
      expect(getStoredIdentity()).toBeNull();
    });

    it('returns null when a field is the wrong type', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ id: 1234, handle: 'Alice', passcode: 'plate-music' }),
      );
      expect(getStoredIdentity()).toBeNull();
    });

    it('returns null when localStorage.getItem throws', () => {
      const spy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(getStoredIdentity()).toBeNull();
      spy.mockRestore();
    });
  });

  describe('storeIdentity', () => {
    it('persists the triple as JSON under the canonical key', () => {
      storeIdentity({ id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' });
      const raw = window.localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw as string)).toEqual({
        id: '1234-ABCD',
        handle: 'Alice',
        passcode: 'plate-music',
      });
    });

    it('does not throw when localStorage.setItem throws', () => {
      const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      expect(() =>
        storeIdentity({ id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' }),
      ).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('clearStoredIdentity', () => {
    it('removes the persisted key', () => {
      storeIdentity({ id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' });
      clearStoredIdentity();
      expect(getStoredIdentity()).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not throw when localStorage.removeItem throws', () => {
      const spy = vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(() => clearStoredIdentity()).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('subscribeToIdentityChanges', () => {
    it('fires the callback when storeIdentity is called in the same tab', () => {
      const cb = vi.fn();
      const unsubscribe = subscribeToIdentityChanges(cb);
      try {
        storeIdentity({ id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' });
        expect(cb).toHaveBeenCalledTimes(1);
      } finally {
        unsubscribe();
      }
    });

    it('fires the callback when clearStoredIdentity is called in the same tab', () => {
      const cb = vi.fn();
      const unsubscribe = subscribeToIdentityChanges(cb);
      try {
        clearStoredIdentity();
        expect(cb).toHaveBeenCalledTimes(1);
      } finally {
        unsubscribe();
      }
    });

    it('fires the callback when another tab mutates the canonical key', () => {
      const cb = vi.fn();
      const unsubscribe = subscribeToIdentityChanges(cb);
      try {
        // Simulate a cross-tab `storage` event for our key.
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: JSON.stringify({
              id: '1234-ABCD',
              handle: 'Alice',
              passcode: 'plate-music',
            }),
            oldValue: null,
            storageArea: window.localStorage,
          }),
        );
        expect(cb).toHaveBeenCalledTimes(1);
      } finally {
        unsubscribe();
      }
    });

    it('ignores cross-tab storage events for unrelated keys', () => {
      const cb = vi.fn();
      const unsubscribe = subscribeToIdentityChanges(cb);
      try {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'sharpee.token.room-A',
            newValue: 'tok-A',
            oldValue: null,
            storageArea: window.localStorage,
          }),
        );
        expect(cb).not.toHaveBeenCalled();
      } finally {
        unsubscribe();
      }
    });

    it('unsubscribe stops further callback invocations', () => {
      const cb = vi.fn();
      const unsubscribe = subscribeToIdentityChanges(cb);
      unsubscribe();
      storeIdentity({ id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' });
      expect(cb).not.toHaveBeenCalled();
    });

    it('still fires same-tab callbacks even when localStorage write fails', () => {
      const cb = vi.fn();
      const unsubscribe = subscribeToIdentityChanges(cb);
      const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      try {
        storeIdentity({ id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' });
        expect(cb).toHaveBeenCalledTimes(1);
      } finally {
        unsubscribe();
        spy.mockRestore();
      }
    });
  });
});
