/**
 * Wrapper over `src/client/identity-storage` for the web client.
 * Re-exports so views import a stable path under `web/src/`.
 */

export {
  readStoredIdentity,
  writeStoredIdentity,
  clearStoredIdentity,
  STORAGE_KEY,
  type StoredIdentity
} from '../../src/client/identity-storage.js';
