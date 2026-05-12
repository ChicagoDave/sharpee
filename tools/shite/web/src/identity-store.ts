/**
 * @module zifmia/web/identity-store
 * @purpose Wraps the browser's `localStorage` for the
 *   `sharpee:identity` key (ADR-161). Persists `{id, handle}` across
 *   page loads so a refresh recovers identity without re-prompting.
 * @owner Zifmia web client.
 *
 * Per the 2026-05-12 ADR-161 amendment the identity is just
 * `{id, handle}` — no passcode, no session token. The handle IS the
 * credential; anyone who types your handle on another machine
 * becomes you. Cross-device "reclaim" is "type the same handle".
 *
 * The store is intentionally narrow: load/save/clear. Identity-aware
 * caller code (IdentityManager, RoomManager) reads via load() and
 * never writes localStorage directly — keeps the storage key, JSON
 * shape, and migration concerns in one place.
 */

const STORAGE_KEY = 'sharpee:identity';

export interface PersistedIdentity {
  id: string;
  handle: string;
}

/**
 * Minimal Storage-like surface so jsdom/happy-dom tests and mocks can
 * inject an in-memory store without binding to the real
 * `window.localStorage`.
 */
export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class IdentityStore {
  private readonly backend: StorageBackend;

  /**
   * @param backend - Storage backend (defaults to `localStorage` when
   *   present). Tests inject a Map-backed stub.
   */
  constructor(backend?: StorageBackend) {
    this.backend =
      backend ??
      (typeof localStorage !== 'undefined'
        ? localStorage
        : memoryBackend());
  }

  /** Returns the persisted identity or `null` when none/malformed. */
  load(): PersistedIdentity | null {
    const raw = this.backend.getItem(STORAGE_KEY);
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as PersistedIdentity).id === 'string' &&
        typeof (parsed as PersistedIdentity).handle === 'string'
      ) {
        return {
          id: (parsed as PersistedIdentity).id,
          handle: (parsed as PersistedIdentity).handle
        };
      }
    } catch {
      // Fall through to null on malformed JSON — a corrupted value is
      // indistinguishable from "no identity" for the caller.
    }
    return null;
  }

  /** Persist an identity. Overwrites any prior value. */
  save(identity: PersistedIdentity): void {
    this.backend.setItem(STORAGE_KEY, JSON.stringify(identity));
  }

  /** Remove the persisted identity. */
  clear(): void {
    this.backend.removeItem(STORAGE_KEY);
  }
}

function memoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    }
  };
}
