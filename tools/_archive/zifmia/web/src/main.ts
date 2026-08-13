/**
 * Entry point for the zifmia web client.
 *
 * Routing → view dispatch:
 *   - no stored identity → mount IdentityClaim
 *   - `#/`               → mount LobbyPanel
 *   - `#/room/:id`       → mount RoomEntry
 */

import { createHttpClient } from './http-client.js';
import { mountIdentityPanel } from './views/identity.js';
import { mountLobbyPanel } from './views/lobby.js';
import { mountRoomView } from './views/room.js';
import { mountRecordingIndicator } from './components/recording-indicator.js';
import { readStoredIdentity } from './identity-store.js';
import { onRouteChange, navigateLobby, navigateRoom, parseRoute } from './routing.js';

const appRoot = document.getElementById('app');
const indicatorRoot = document.getElementById('recording-indicator-root');
if (!appRoot || !indicatorRoot) throw new Error('main.ts: required root elements missing');

const http = createHttpClient();
const recordingIndicator = mountRecordingIndicator(indicatorRoot);

let teardown: (() => void) | undefined;

async function dispatch(): Promise<void> {
  if (teardown) { teardown(); teardown = undefined; }
  recordingIndicator.hide();

  const identity = readStoredIdentity();
  if (!identity) {
    mountIdentityPanel(appRoot, http, {
      onIdentityChange: (next) => {
        if (next) navigateLobby();
        else dispatch();
      }
    });
    return;
  }

  const route = parseRoute(window.location.hash);
  if (route.kind === 'lobby') {
    const cleanup = mountLobbyPanel(appRoot, http, {
      onEnterRoom: (roomId) => navigateRoom(roomId),
      onLogout: () => dispatch()
    });
    teardown = cleanup;
    return;
  }

  // route.kind === 'room'
  try {
    const cleanup = await mountRoomView(appRoot, {
      http,
      identity,
      roomId: route.roomId,
      recordingIndicator,
      onLeaveRoom: () => navigateLobby()
    });
    teardown = cleanup;
  } catch (err) {
    appRoot.innerHTML = `<p>Failed to enter room: ${(err as Error).message}</p>`;
  }
}

onRouteChange(() => { void dispatch(); });
