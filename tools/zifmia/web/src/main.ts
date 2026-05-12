/**
 * @module zifmia/web/main
 * @purpose Entry point. Bootstraps a session from localStorage, then
 *   either renders the identity form (no/invalid session) or hands
 *   off to the lobby (valid session). Phase 6a only ships the
 *   identity surface; later sub-phases add the lobby and room
 *   manager.
 * @owner Zifmia web client.
 */

// Vite bundles base.css alongside the JS entry. The path traverses
// up four levels: src → web → zifmia → tools → repo root.
import '../../../../templates/browser/base.css';

import { getMe } from './api/identity';
import { IdentityManager } from './managers/identity-manager';
import { SessionStore, type PersistedSession } from './session-store';

async function bootstrap(): Promise<void> {
  const root = document.getElementById('zifmia-root');
  if (!root) throw new Error('zifmia-root mount target missing');

  const sessionStore = new SessionStore();
  const persisted = sessionStore.load();

  if (persisted) {
    const result = await getMe({ sessionToken: persisted.sessionToken });
    if (result.ok) {
      onAuthenticated(persisted);
      return;
    }
    // 401 (any flavor) → token is no good; wipe and prompt.
    sessionStore.clear();
  }

  const manager = new IdentityManager({
    root,
    sessionStore,
    onAuthenticated
  });
  manager.mount();
}

function onAuthenticated(session: PersistedSession): void {
  // Phase 6a placeholder — Phase 6b replaces this with LobbyManager.mount.
  const root = document.getElementById('zifmia-root');
  if (root) {
    root.replaceChildren();
    const note = document.createElement('p');
    note.textContent = `Signed in as ${session.handle}. (Lobby ships in Phase 6b.)`;
    root.appendChild(note);
  }
}

void bootstrap();
