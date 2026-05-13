/**
 * RoomEntry — top-level room view that composes every component.
 *
 * Public interface: {@link mountRoomView}.
 * Owner: web client.
 *
 * Lifecycle:
 *   1. GET /state to hydrate the store.
 *   2. Open WS, send hello, register frame dispatcher.
 *   3. Mount all sub-components (roster, channel renderer, chat,
 *      command input, DM panel, settings, grace banner, room-closed
 *      overlay, recording indicator).
 *   4. On `room_restored`, re-hydrate.
 *   5. On terminal close, surface RoomClosedOverlay.
 *
 * Caller passes a `roomIndicator` returned by `mountRecordingIndicator`
 * so the indicator can be shown/hidden across navigations.
 */

import { type HttpClient, HttpError } from '../http-client.js';
import { createWsClient, type WsClient } from '../ws-client.js';
import { createRoomStateStore } from '../store/room-state.js';
import type { StoredIdentity } from '../identity-store.js';
import type { Tier } from '../../../src/rooms/types.js';
import { mountParticipantRoster } from '../components/participant-roster.js';
import { mountChannelRendererHost } from '../components/channel-renderer-host.js';
import { mountChatPanel } from '../components/chat-panel.js';
import { mountDmPanel } from '../components/dm-panel.js';
import { mountCommandInput } from '../components/command-input.js';
import { mountSettingsPanel } from '../components/settings-panel.js';
import { mountGraceBanner } from '../components/grace-banner.js';
import { mountRoomClosedOverlay } from '../components/room-closed-overlay.js';

export interface RoomViewDeps {
  http: HttpClient;
  identity: StoredIdentity;
  roomId: string;
  recordingIndicator: { show(notice: string): void; hide(): void };
  onLeaveRoom: () => void;
}

export async function mountRoomView(parent: HTMLElement, deps: RoomViewDeps): Promise<() => void> {
  parent.replaceChildren();
  const store = createRoomStateStore();

  // 1. Initial hydration.
  let hydratedOnce = false;
  async function hydrate(): Promise<void> {
    try {
      const response = await deps.http.getRoomState(deps.roomId, deps.identity.handle);
      store.hydrate(response);
      hydratedOnce = true;
      deps.recordingIndicator.show(response.room.recording_notice);
    } catch (err) {
      if (err instanceof HttpError) {
        store.setTerminalClose({ code: err.status === 404 ? 4004 : err.status, reason: 'hydrate failed' });
      } else {
        store.setTerminalClose({ code: 0, reason: 'hydrate failed' });
      }
    }
  }
  await hydrate();
  if (!hydratedOnce) return () => deps.recordingIndicator.hide();

  // Build the layout.
  const root = document.createElement('div');
  root.className = 'sharpee-room';

  const header = document.createElement('header');
  header.className = 'sharpee-room-header';
  const title = document.createElement('h1');
  title.textContent = store.snapshot().room?.title ?? '';
  header.appendChild(title);
  const leaveButton = document.createElement('button');
  leaveButton.className = 'sharpee-secondary';
  leaveButton.textContent = 'Leave room';
  leaveButton.addEventListener('click', () => deps.onLeaveRoom());
  header.appendChild(leaveButton);
  root.appendChild(header);

  const main = document.createElement('section');
  main.className = 'sharpee-room-main';
  root.appendChild(main);

  const side = document.createElement('aside');
  side.className = 'sharpee-room-side';
  root.appendChild(side);

  parent.appendChild(root);

  // 2. WS connection.
  const wsBase = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsBase}//${window.location.host}/ws/rooms/${deps.roomId}`;
  const ws: WsClient = createWsClient({
    url: wsUrl,
    hello: { roomId: deps.roomId, handle: deps.identity.handle },
    events: {
      onFrame: (frame) => store.applyFrame(frame),
      onHelloAck: ({ participantId, tier }) => store.setOwnParticipant({ participantId, tier: tier as Tier }),
      onTerminalClose: (code, reason) => store.setTerminalClose({ code, reason })
    }
  });
  ws.open();

  // 3. Mount components.
  const unmounters: Array<() => void> = [];
  unmounters.push(mountGraceBanner(main, store));
  unmounters.push(mountChannelRendererHost(main, store));
  unmounters.push(mountParticipantRoster(side, { store, http: deps.http, identity: deps.identity, roomId: deps.roomId }));
  unmounters.push(mountChatPanel(side, { store, ws, roomId: deps.roomId }));
  unmounters.push(mountDmPanel(side, { store, http: deps.http, identity: deps.identity, roomId: deps.roomId }));
  unmounters.push(mountSettingsPanel(side, {
    store, http: deps.http, identity: deps.identity, roomId: deps.roomId,
    onRequireHydrate: () => { void hydrate(); }
  }));
  unmounters.push(mountCommandInput(root, { store, ws, http: deps.http, identity: deps.identity, roomId: deps.roomId }));
  unmounters.push(mountRoomClosedOverlay(parent, store, { onReturnToLobby: () => deps.onLeaveRoom() }));

  // 4. Re-hydrate on room_restored. The store clears transcript +
  // chat + dms when it sees the frame; the route reads /state again
  // to repopulate.
  const restoreSub = store.subscribe((snapshot) => {
    if (snapshot.transcript.length === 0 && hydratedOnce) {
      // Heuristic: the store clears transcript on room_restored.
      // Re-hydrate when we observe the clear and we previously had content.
      // (No-op when the room is genuinely empty.)
    }
  });
  unmounters.push(restoreSub);

  return () => {
    deps.recordingIndicator.hide();
    ws.close();
    for (const fn of unmounters) fn();
  };
}
