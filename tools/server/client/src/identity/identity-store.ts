/**
 * Persistent identity storage — keyed under the single localStorage entry
 * `sharpee:identity`, holding the three-field `(id, handle, passcode)`
 * triple from ADR-161.
 *
 * Public interface: {@link StoredIdentity}, {@link getStoredIdentity},
 * {@link storeIdentity}, {@link clearStoredIdentity},
 * {@link subscribeToIdentityChanges}.
 *
 * Bounded context: client-side identity persistence (ADR-161 portability).
 *
 * The server cannot recover the passcode, so the browser is the system of
 * record for everything needed to authenticate. All three fields persist
 * together; partial writes are not allowed by the API surface.
 *
 * Cross-tab notification: localStorage's `storage` event fires in *other*
 * tabs when a tab mutates the same key. We pair that with a custom
 * `IdentityChange` event for the writing tab itself, so a single subscriber
 * callback handles both same-tab and cross-tab changes uniformly. Code that
 * reads `getStoredIdentity()` after a remote tab erases will see null
 * within a render frame.
 *
 * All mutations silently no-op on storage failure (private browsing,
 * quota exceeded). The subscriber pathway still works in-tab even when
 * localStorage throws — the in-memory event listeners are independent.
 */

const STORAGE_KEY = 'sharpee:identity';
const SAME_TAB_EVENT = 'sharpee:identity-change';

export interface StoredIdentity {
  id: string;
  handle: string;
  passcode: string;
}

function isStoredIdentity(value: unknown): value is StoredIdentity {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.handle === 'string' &&
    v.handle.length > 0 &&
    typeof v.passcode === 'string' &&
    v.passcode.length > 0
  );
}

/**
 * Read the persisted identity, or `null` if absent, malformed, missing
 * fields, or if storage access throws.
 */
export function getStoredIdentity(): StoredIdentity | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredIdentity(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Persist a fresh identity triple. Notifies same-tab subscribers via a
 * synthetic event so callers in this tab see the change without polling.
 * Cross-tab subscribers receive notification via the browser's `storage`
 * event automatically.
 */
export function storeIdentity(identity: StoredIdentity): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // ignore — storage failures must not crash the identity-setup flow
  }
  dispatchSameTab();
}

/** Remove the persisted identity and notify subscribers. */
export function clearStoredIdentity(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  dispatchSameTab();
}

/**
 * Subscribe to identity changes from any source — same tab or cross-tab.
 *
 * The callback fires after the change has landed in localStorage; consumers
 * should call `getStoredIdentity()` from inside the callback to read the
 * fresh value.
 *
 * Returns an unsubscribe function. Idempotent — calling it twice is safe.
 */
export function subscribeToIdentityChanges(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    // Filter to our key only — other tabs may write unrelated keys.
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    callback();
  };
  const onSameTab = () => callback();

  window.addEventListener('storage', onStorage);
  window.addEventListener(SAME_TAB_EVENT, onSameTab);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(SAME_TAB_EVENT, onSameTab);
  };
}

function dispatchSameTab(): void {
  try {
    window.dispatchEvent(new Event(SAME_TAB_EVENT));
  } catch {
    // Event constructor not available in some test envs — ignore silently.
  }
}
