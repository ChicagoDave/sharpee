/**
 * @module tests/web/session-store.test
 * @purpose Behavior tests for the `SessionStore` localStorage wrapper.
 *   Asserts the contract: round-tripped session matches input; malformed
 *   storage returns null; clear() removes the key.
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  SessionStore,
  type PersistedSession,
  type StorageBackend
} from '../../web/src/session-store';

class MemoryBackend implements StorageBackend {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  // Test-only escape hatch for injecting corrupted values.
  put(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('SessionStore', () => {
  let backend: MemoryBackend;
  let store: SessionStore;

  const sample: PersistedSession = {
    id: 'id-1',
    handle: 'alice',
    sessionToken: 'token-1'
  };

  beforeEach(() => {
    backend = new MemoryBackend();
    store = new SessionStore(backend);
  });

  it('returns null when nothing is persisted', () => {
    expect(store.load()).toBeNull();
  });

  it('save() then load() round-trips the session', () => {
    store.save(sample);
    expect(store.load()).toEqual(sample);
  });

  it('save() overwrites a prior value', () => {
    store.save(sample);
    const replacement: PersistedSession = {
      id: 'id-2',
      handle: 'bob',
      sessionToken: 'token-2'
    };
    store.save(replacement);
    expect(store.load()).toEqual(replacement);
  });

  it('clear() removes the persisted session', () => {
    store.save(sample);
    store.clear();
    expect(store.load()).toBeNull();
  });

  it('load() returns null on malformed JSON', () => {
    backend.put('zifmia:session', '{not json');
    expect(store.load()).toBeNull();
  });

  it('load() returns null when the stored object is missing required fields', () => {
    backend.put('zifmia:session', JSON.stringify({ id: 'id', handle: 'alice' }));
    expect(store.load()).toBeNull();
  });

  it('load() returns null when fields have wrong types', () => {
    backend.put(
      'zifmia:session',
      JSON.stringify({ id: 1, handle: 'alice', sessionToken: 't' })
    );
    expect(store.load()).toBeNull();
  });
});
