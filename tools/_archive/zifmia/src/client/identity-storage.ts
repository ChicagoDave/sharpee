/**
 * Browser localStorage helper for the user's claimed identity.
 *
 * Public interface: {@link readStoredIdentity}, {@link writeStoredIdentity},
 * {@link clearStoredIdentity}, {@link STORAGE_KEY}.
 * Owner: zifmia client. Pure module — no DOM imports beyond `Storage`.
 *
 * Per ADR-177 §5, the client persists `{id, handle}` so the lobby
 * stays identified across reloads. There is no token; localStorage IS
 * the entire client-side credential cache, mirroring the server-side
 * "handle is the credential" invariant.
 *
 * Importable in both browser and Node test contexts — accepts a
 * `Storage` instance, defaulting to `globalThis.localStorage` when
 * available so callers can pass a stub for unit tests.
 */

export const STORAGE_KEY = 'sharpee:identity';

export interface StoredIdentity {
  readonly id: string;
  readonly handle: string;
}

function defaultStorage(): Storage | undefined {
  return typeof globalThis !== 'undefined' && 'localStorage' in globalThis
    ? (globalThis as { localStorage?: Storage }).localStorage
    : undefined;
}

/** Read the stored identity, or `undefined` if absent or malformed. */
export function readStoredIdentity(storage: Storage | undefined = defaultStorage()): StoredIdentity | undefined {
  if (!storage) return undefined;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as StoredIdentity).id === 'string' &&
      typeof (parsed as StoredIdentity).handle === 'string'
    ) {
      return { id: (parsed as StoredIdentity).id, handle: (parsed as StoredIdentity).handle };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** Persist `{id, handle}` to localStorage. */
export function writeStoredIdentity(
  identity: StoredIdentity,
  storage: Storage | undefined = defaultStorage()
): void {
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify({ id: identity.id, handle: identity.handle }));
}

/** Remove the stored identity (called on erase, on 4007 close, on user logout). */
export function clearStoredIdentity(storage: Storage | undefined = defaultStorage()): void {
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
}
