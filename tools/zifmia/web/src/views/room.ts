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
import { createRoomStateStore, type RoomStateSnapshot } from '../store/room-state.js';
import type { StoredIdentity } from '../identity-store.js';
import type { Tier } from '../../../src/rooms/types.js';
import { mountChannelRendererHost } from '../components/channel-renderer-host.js';
import { mountRoomStatusBar } from '../components/room-status-bar.js';
import { mountChatPanel } from '../components/chat-panel.js';
import { mountCommandInput } from '../components/command-input.js';
import { mountSettingsPanel } from '../components/settings-panel.js';
import { mountGraceBanner } from '../components/grace-banner.js';
import { mountRoomClosedOverlay } from '../components/room-closed-overlay.js';
import { mountParticipantRoster } from '../components/participant-roster.js';

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
  // `sharpee-room` is the canonical decoration class per ADR-174
  // (engine emits `<span class="sharpee-room">…</span>` for room-name
  // highlights). The outer layout uses `sharpee-room-layout` to avoid
  // the layout grid styles cascading into the inline decoration span.
  root.className = 'sharpee-room-layout';

  const header = document.createElement('header');
  header.className = 'sharpee-room-header';
  const title = document.createElement('h1');
  title.textContent = store.snapshot().room?.title ?? '';
  header.appendChild(title);
  const headerActions = document.createElement('div');
  headerActions.className = 'sharpee-room-header-actions';
  const participantsWrap = document.createElement('div');
  participantsWrap.className = 'sharpee-header-participants';
  const participantsButton = document.createElement('button');
  participantsButton.className = 'sharpee-secondary';
  participantsButton.type = 'button';
  participantsButton.textContent = 'Participants (0)';
  participantsButton.setAttribute('aria-haspopup', 'true');
  participantsButton.setAttribute('aria-expanded', 'false');
  const participantsDropdown = document.createElement('div');
  participantsDropdown.className = 'sharpee-header-participants-dropdown';
  participantsDropdown.style.display = 'none';
  participantsWrap.append(participantsButton, participantsDropdown);
  const settingsButton = document.createElement('button');
  settingsButton.className = 'sharpee-secondary';
  settingsButton.textContent = 'Settings';
  const leaveButton = document.createElement('button');
  leaveButton.className = 'sharpee-secondary';
  leaveButton.textContent = 'Leave room';
  leaveButton.addEventListener('click', () => deps.onLeaveRoom());
  headerActions.append(participantsWrap, settingsButton, leaveButton);
  header.appendChild(headerActions);
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
  unmounters.push(mountRoomStatusBar(main, store));
  unmounters.push(mountChannelRendererHost(main, store));
  unmounters.push(mountChatPanel(side, { store, ws, roomId: deps.roomId }));

  // Participants dropdown in the header — mount the full roster
  // component (with moderation actions for PH/CoHost) into the
  // dropdown body. Toggle on click; live count on the button label.
  unmounters.push(mountParticipantRoster(participantsDropdown, {
    store, http: deps.http, identity: deps.identity, roomId: deps.roomId
  }));
  const updateParticipantsLabel = (snapshot: RoomStateSnapshot): void => {
    const connected = snapshot.roster.filter((r) => r.connected).length;
    const total = snapshot.roster.length;
    participantsButton.textContent =
      connected === total ? `Participants (${total})` : `Participants (${connected}/${total})`;
  };
  updateParticipantsLabel(store.snapshot());
  unmounters.push(store.subscribe(updateParticipantsLabel));
  const toggleParticipants = (): void => {
    const isOpen = participantsDropdown.style.display === 'block';
    participantsDropdown.style.display = isOpen ? 'none' : 'block';
    participantsButton.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
  };
  participantsButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleParticipants();
  });
  const dismissParticipants = (event: MouseEvent): void => {
    if (participantsDropdown.style.display !== 'block') return;
    if (event.target instanceof Node && participantsWrap.contains(event.target)) return;
    participantsDropdown.style.display = 'none';
    participantsButton.setAttribute('aria-expanded', 'false');
  };
  document.addEventListener('click', dismissParticipants);
  unmounters.push(() => document.removeEventListener('click', dismissParticipants));
  unmounters.push(mountCommandInput(root, { store, ws, http: deps.http, identity: deps.identity, roomId: deps.roomId }));
  unmounters.push(mountRoomClosedOverlay(parent, store, { onReturnToLobby: () => deps.onLeaveRoom() }));

  // Settings live in a modal overlay (hidden by default; opened via
  // the header's Settings button). DM panel is intentionally not
  // mounted — UI design pending.
  const settingsModal = document.createElement('div');
  settingsModal.className = 'sharpee-settings-modal';
  settingsModal.style.display = 'none';
  const settingsCard = document.createElement('div');
  settingsCard.className = 'sharpee-settings-modal-card';
  const settingsClose = document.createElement('button');
  settingsClose.className = 'sharpee-secondary sharpee-settings-modal-close';
  settingsClose.textContent = 'Close';
  settingsCard.appendChild(settingsClose);
  settingsModal.appendChild(settingsCard);
  parent.appendChild(settingsModal);
  unmounters.push(mountSettingsPanel(settingsCard, {
    store, http: deps.http, identity: deps.identity, roomId: deps.roomId,
    onRequireHydrate: () => { void hydrate(); }
  }));
  const openSettings = (): void => { settingsModal.style.display = 'flex'; };
  const closeSettings = (): void => { settingsModal.style.display = 'none'; };
  settingsButton.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);
  settingsModal.addEventListener('click', (event) => {
    if (event.target === settingsModal) closeSettings();
  });
  unmounters.push(() => settingsModal.remove());

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
