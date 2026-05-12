/**
 * @module zifmia/web/main
 * @purpose Entry point. Bootstraps a session from localStorage, then
 *   either renders the identity form (no/invalid session) or the
 *   lobby / room stub depending on `location.hash`. Phase 6b ships
 *   the lobby and the room hash-routing stub; Phase 6c replaces the
 *   stub with the full RoomManager view.
 * @owner Zifmia web client.
 */

// Vite bundles base.css alongside the JS entry. The path traverses
// up four levels: src → web → zifmia → tools → repo root.
import '../../../../templates/browser/base.css';

import { getMe } from './api/identity';
import { AdminManager } from './managers/admin-manager';
import { IdentityManager } from './managers/identity-manager';
import { LobbyManager } from './managers/lobby-manager';
import { RoomManager } from './managers/room-manager';
import { parseHash } from './routing';
import { SessionStore, type PersistedSession } from './session-store';

interface MountedView {
  unmount: () => void;
}

let currentView: MountedView | null = null;
let currentSession: PersistedSession | null = null;

async function bootstrap(): Promise<void> {
  const root = document.getElementById('zifmia-root');
  if (!root) throw new Error('zifmia-root mount target missing');

  const sessionStore = new SessionStore();
  const persisted = sessionStore.load();

  if (persisted) {
    const result = await getMe({ sessionToken: persisted.sessionToken });
    if (result.ok) {
      await enterAuthenticated(root, persisted);
      return;
    }
    // 401 (any flavor) → token is no good; wipe and prompt.
    sessionStore.clear();
  }

  const manager = new IdentityManager({
    root,
    sessionStore,
    onAuthenticated: (session) => {
      void enterAuthenticated(root, session);
    }
  });
  manager.mount();
}

async function enterAuthenticated(
  root: HTMLElement,
  session: PersistedSession
): Promise<void> {
  currentSession = session;
  window.addEventListener('hashchange', handleHashChange);
  await routeForHash(root);
}

async function routeForHash(root: HTMLElement): Promise<void> {
  unmountCurrent();
  const session = currentSession;
  if (!session) return;
  root.replaceChildren();

  const parsed = parseHash(window.location.hash);
  if (parsed.kind === 'room') {
    const manager = new RoomManager({
      root,
      roomId: parsed.roomId,
      selfIdentityId: session.id,
      sessionToken: session.sessionToken,
      onError: () => {
        // Drop back to the lobby on any state-fetch failure — the
        // hash change re-routes via the existing `hashchange` listener.
        window.location.hash = '';
      }
    });
    await manager.enter();
    currentView = manager;
    return;
  }

  if (parsed.kind === 'admin') {
    const admin = new AdminManager({
      root,
      httpOptions: { sessionToken: session.sessionToken },
      onAccessDenied: () => {
        // Non-admin or expired session — drop back to the lobby.
        window.location.hash = '';
      },
      onLeave: () => {
        window.location.hash = '';
      }
    });
    await admin.enter();
    currentView = admin;
    return;
  }

  const lobby = new LobbyManager({
    root,
    httpOptions: { sessionToken: session.sessionToken },
    onEnterRoom: (roomId) => {
      window.location.hash = `#room/${roomId}`;
    }
  });
  await lobby.mount();
  currentView = lobby;
}

function handleHashChange(): void {
  const root = document.getElementById('zifmia-root');
  if (!root) return;
  void routeForHash(root);
}

function unmountCurrent(): void {
  if (!currentView) return;
  currentView.unmount();
  currentView = null;
}

void bootstrap();
