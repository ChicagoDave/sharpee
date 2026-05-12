/**
 * @module zifmia/web/session-store
 * @purpose Wraps the browser's `localStorage` for the
 *   `zifmia:session` key. Manages persistence of `{id, handle,
 *   sessionToken}` across page loads so a refresh recovers the
 *   identity without re-prompting.
 * @owner Zifmia web client.
 *
 * The store is intentionally narrow: load/save/clear. Identity-aware
 * caller code (IdentityManager, RoomManager) reads via load() and
 * never writes localStorage directly — keeps the storage key, JSON
 * shape, and migration concerns in one place.
 */

const STORAGE_KEY = 'zifmia:session';

export interface PersistedSession {
  id: string;
  handle: string;
  sessionToken: string;
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

export class SessionStore {
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

  /** Returns the persisted session or `null` when none/malformed. */
  load(): PersistedSession | null {
    const raw = this.backend.getItem(STORAGE_KEY);
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as PersistedSession).id === 'string' &&
        typeof (parsed as PersistedSession).handle === 'string' &&
        typeof (parsed as PersistedSession).sessionToken === 'string'
      ) {
        return parsed as PersistedSession;
      }
    } catch {
      // Fall through to null on malformed JSON — a corrupted value is
      // indistinguishable from "no session" for the caller.
    }
    return null;
  }

  /** Persist a session. Overwrites any prior value. */
  save(session: PersistedSession): void {
    this.backend.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  /** Remove the persisted session. */
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
