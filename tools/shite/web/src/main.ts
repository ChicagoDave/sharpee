/**
 * @module zifmia/web/main
 * @purpose Entry point. Loads any persisted identity from
 *   localStorage, then renders the lobby / admin / room view based
 *   on `location.hash`. Per the 2026-05-12 ADR-161 amendment, the
 *   lobby is viewable WITHOUT an identity — the Create-room button
 *   is gated on identity presence. Identity-creating actions land
 *   on the lobby's "pick a handle" affordance.
 * @owner Zifmia web client.
 */

// Vite bundles base.css alongside the JS entry. The path traverses
// up four levels: src → web → zifmia → tools → repo root.
import '../../../../templates/browser/base.css';

import { AdminManager } from './managers/admin-manager';
import { IdentityManager } from './managers/identity-manager';
import { LobbyManager } from './managers/lobby-manager';
import { RoomManager } from './managers/room-manager';
import { parseHash } from './routing';
import { IdentityStore, type PersistedIdentity } from './identity-store';

interface MountedView {
  unmount: () => void;
}

let currentView: MountedView | null = null;
let currentIdentity: PersistedIdentity | null = null;
const identityStore = new IdentityStore();

async function bootstrap(): Promise<void> {
  const root = document.getElementById('zifmia-root');
  if (!root) throw new Error('zifmia-root mount target missing');

  currentIdentity = identityStore.load();
  window.addEventListener('hashchange', handleHashChange);
  await routeForHash(root);
}

async function routeForHash(root: HTMLElement): Promise<void> {
  unmountCurrent();
  root.replaceChildren();

  const parsed = parseHash(window.location.hash);

  if (parsed.kind === 'room') {
    // Room view requires an identity. Without one, drop back to the
    // lobby and let the user claim a handle there.
    if (!currentIdentity) {
      window.location.hash = '';
      return;
    }
    const manager = new RoomManager({
      root,
      roomId: parsed.roomId,
      selfIdentityId: currentIdentity.id,
      handle: currentIdentity.handle,
      onError: () => {
        window.location.hash = '';
      }
    });
    await manager.enter();
    currentView = manager;
    return;
  }

  if (parsed.kind === 'admin') {
    if (!currentIdentity) {
      window.location.hash = '';
      return;
    }
    const admin = new AdminManager({
      root,
      httpOptions: { handle: currentIdentity.handle },
      onAccessDenied: () => {
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

  // Lobby — viewable to identified and unidentified users alike.
  // The "Create room" affordance is gated on `currentIdentity`; when
  // absent, the LobbyManager renders an inline "pick a handle"
  // affordance that mounts the IdentityManager into the same root.
  const lobby = new LobbyManager({
    root,
    identity: currentIdentity,
    httpOptions: currentIdentity ? { handle: currentIdentity.handle } : {},
    onEnterRoom: (roomId) => {
      window.location.hash = `#room/${roomId}`;
    },
    onClaimIdentity: () => {
      openIdentityForm(root);
    }
  });
  await lobby.mount();
  currentView = lobby;
}

/**
 * Pop the "pick a handle" form on top of the lobby. The lobby is
 * still mounted underneath — when the form completes, we wipe and
 * re-route to the lobby in the identified state.
 */
function openIdentityForm(root: HTMLElement): void {
  unmountCurrent();
  root.replaceChildren();
  const form = new IdentityManager({
    root,
    onIdentified: (identity) => {
      currentIdentity = identity;
      void routeForHash(root);
    }
  });
  form.mount();
  currentView = form;
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
