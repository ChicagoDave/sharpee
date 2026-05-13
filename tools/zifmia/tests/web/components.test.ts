/**
 * Component DOM-mutation tests against happy-dom. These verify that
 * components re-render correctly when the store mutates — the
 * deterministic half of UI behavior. Visual / interaction details
 * still need browser hand-testing.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createRoomStateStore } from '../../web/src/store/room-state.js';
import type { RoomStateResponse } from '../../web/src/http-client.js';
import { mountChatPanel } from '../../web/src/components/chat-panel.js';
import { mountDmPanel } from '../../web/src/components/dm-panel.js';
import { mountParticipantRoster } from '../../web/src/components/participant-roster.js';
import { mountGraceBanner } from '../../web/src/components/grace-banner.js';
import { mountRoomClosedOverlay } from '../../web/src/components/room-closed-overlay.js';
import { mountChannelRendererHost } from '../../web/src/components/channel-renderer-host.js';
import { mountRecordingIndicator } from '../../web/src/components/recording-indicator.js';

function freshResponse(): RoomStateResponse {
  return {
    room: {
      id: 'r1',
      join_code: 'ABCD1234',
      title: 'My Room',
      story_slug: 'dungeo',
      pinned: false,
      primary_host_id: 'i1',
      recording_notice: 'be aware'
    },
    cmgt: { channels: [] },
    transcript_backlog: [],
    roster: [
      { participant_id: 'p1', identity_id: 'i1', handle: 'alice', tier: 'primary_host', muted: false, connected: true, is_successor: false },
      { participant_id: 'p2', identity_id: 'i2', handle: 'bob', tier: 'participant', muted: false, connected: true, is_successor: false }
    ],
    lock: { holder: null, expiresAt: null }
  };
}

const STUB_WS = { open() {}, send() {}, close() {}, status: () => 'open' as const };
const stubHttp = (overrides: Record<string, unknown> = {}) => ({
  claimIdentity: async () => ({ id: 'x', handle: 'x', is_admin: false }),
  eraseIdentity: async () => ({ erased: true }),
  listLobby: async () => ({ rooms: [] }),
  resolveJoinCode: async () => ({ id: 'r1', join_code: 'X', title: 'X' }),
  listStories: async () => ({ stories: [] }),
  createRoom: async () => { throw new Error('not impl'); },
  joinRoom: async () => { throw new Error('not impl'); },
  getRoomState: async () => freshResponse(),
  renameRoom: async () => { throw new Error('not impl'); },
  pinRoom: async () => { throw new Error('not impl'); },
  promote: async () => { throw new Error('not impl'); },
  demote: async () => { throw new Error('not impl'); },
  nominateSuccessor: async () => { throw new Error('not impl'); },
  mute: async () => { throw new Error('not impl'); },
  forceRelease: async () => { throw new Error('not impl'); },
  deleteRoom: async () => { throw new Error('not impl'); },
  submitCommand: async () => ({ turnId: 't1' }),
  listSaves: async () => ({ saves: [] }),
  createSave: async () => { throw new Error('not impl'); },
  restore: async () => { throw new Error('not impl'); },
  sendDm: async () => ({ id: 'd1', ts: 1 }),
  ...overrides
} as unknown as import('../../web/src/http-client.js').HttpClient);

const IDENTITY = { id: 'i1', handle: 'alice' };

describe('chat-panel', () => {
  let host: HTMLElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });

  it('renders incoming chat:message frames', () => {
    const store = createRoomStateStore();
    store.hydrate(freshResponse());
    mountChatPanel(host, { store, ws: STUB_WS, roomId: 'r1' });
    store.applyFrame({
      type: 'chat:message', id: 'c1', roomId: 'r1', fromId: 'i1', fromHandle: 'alice', text: 'hi', ts: 1
    });
    const messages = host.querySelectorAll('.sharpee-chat-message');
    expect(messages).toHaveLength(1);
    expect(messages[0].textContent).toContain('alice');
    expect(messages[0].textContent).toContain('hi');
  });

  it('disables the input + button when own row is muted', () => {
    const store = createRoomStateStore();
    store.hydrate(freshResponse());
    store.setOwnParticipant({ participantId: 'p2', tier: 'participant' });
    mountChatPanel(host, { store, ws: STUB_WS, roomId: 'r1' });

    store.applyFrame({ type: 'mute_state', roomId: 'r1', participantId: 'p2', muted: true });

    const input = host.querySelector<HTMLInputElement>('input')!;
    const button = host.querySelector<HTMLButtonElement>('button')!;
    expect(input.disabled).toBe(true);
    expect(button.disabled).toBe(true);
    expect(input.placeholder).toBe('You are muted.');
  });
});

describe('dm-panel', () => {
  let host: HTMLElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });

  it('hides for participants; shows for PH/CoHost', () => {
    const store = createRoomStateStore();
    store.hydrate(freshResponse());
    store.setOwnParticipant({ participantId: 'p2', tier: 'participant' });
    mountDmPanel(host, { store, http: stubHttp(), identity: { id: 'i2', handle: 'bob' }, roomId: 'r1' });
    expect(host.querySelector<HTMLElement>('.sharpee-dm-panel')!.style.display).toBe('none');

    store.applyFrame({ type: 'role_change', roomId: 'r1', participantId: 'p2', tier: 'co_host' });
    expect(host.querySelector<HTMLElement>('.sharpee-dm-panel')!.style.display).toBe('');
  });

  it('appends dm:message frames when visible', () => {
    const store = createRoomStateStore();
    store.hydrate(freshResponse());
    store.setOwnParticipant({ participantId: 'p1', tier: 'primary_host' });
    mountDmPanel(host, { store, http: stubHttp(), identity: IDENTITY, roomId: 'r1' });
    store.applyFrame({
      type: 'dm:message', id: 'd1', roomId: 'r1', fromId: 'i1', fromHandle: 'alice', text: 'aside', ts: 1
    });
    expect(host.querySelectorAll('.sharpee-dm-message')).toHaveLength(1);
  });
});

describe('participant-roster', () => {
  let host: HTMLElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });

  it('marks disconnected + muted + successor rows with the right classes', () => {
    const store = createRoomStateStore();
    const resp = freshResponse();
    resp.roster = [
      { participant_id: 'p1', identity_id: 'i1', handle: 'alice', tier: 'primary_host', muted: false, connected: true, is_successor: false },
      { participant_id: 'p2', identity_id: 'i2', handle: 'bob', tier: 'participant', muted: true, connected: false, is_successor: true }
    ];
    store.hydrate(resp);
    store.setOwnParticipant({ participantId: 'p1', tier: 'primary_host' });
    mountParticipantRoster(host, { store, http: stubHttp(), identity: IDENTITY, roomId: 'r1' });

    const bobRow = host.querySelectorAll('.sharpee-participant-row')[1];
    expect(bobRow.classList.contains('sharpee-disconnected')).toBe(true);
    expect(bobRow.classList.contains('sharpee-muted')).toBe(true);
    expect(bobRow.classList.contains('sharpee-successor')).toBe(true);
  });

  it('exposes host actions only for PH/CoHost viewers', () => {
    const store = createRoomStateStore();
    store.hydrate(freshResponse());
    store.setOwnParticipant({ participantId: 'p2', tier: 'participant' });
    mountParticipantRoster(host, { store, http: stubHttp(), identity: { id: 'i2', handle: 'bob' }, roomId: 'r1' });
    const buttons = host.querySelectorAll('button');
    expect(buttons).toHaveLength(0); // participant viewer sees no actions
  });
});

describe('grace-banner', () => {
  let host: HTMLElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });

  it('shows when gracePending becomes true and hides on reconnect', () => {
    const store = createRoomStateStore();
    store.hydrate(freshResponse());
    mountGraceBanner(host, store);
    const banner = host.querySelector<HTMLElement>('.sharpee-grace-banner')!;
    expect(banner.style.display).toBe('none');

    store.applyFrame({
      type: 'presence', roomId: 'r1', participantId: 'p1', connected: false, graceDeadline: Date.now() + 5000
    });
    expect(banner.style.display).not.toBe('none');
    expect(banner.textContent).toMatch(/succession in/);

    store.applyFrame({ type: 'presence', roomId: 'r1', participantId: 'p1', connected: true });
    expect(banner.style.display).toBe('none');
  });
});

describe('room-closed-overlay', () => {
  let host: HTMLElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });

  it('mounts the overlay with the right message on terminal close', () => {
    const store = createRoomStateStore();
    let returnedToLobby = false;
    mountRoomClosedOverlay(host, store, { onReturnToLobby: () => { returnedToLobby = true; } });
    expect(host.querySelector('.sharpee-room-closed-overlay')).toBeNull();

    store.setTerminalClose({ code: 4007, reason: 'erased' });
    const overlay = host.querySelector('.sharpee-room-closed-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.textContent).toContain('Your identity was erased.');

    overlay!.querySelector('button')!.click();
    expect(returnedToLobby).toBe(true);
  });
});

describe('channel-renderer-host', () => {
  let host: HTMLElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });

  it('appends a turn-submitter header and renders the main channel per new turn frame', () => {
    // Phase 7 rewrite: channel-renderer-host adds a `.sharpee-turn-submitter`
    // header in front of each new turn (carrying submitter handle and
    // optional command echo + timestamp); main-channel content is rendered
    // by `@sharpee/platform-browser`'s `createMainChannelRenderer` rather
    // than wrapped in a host-owned turn-block.
    const store = createRoomStateStore();
    store.hydrate(freshResponse());
    mountChannelRendererHost(host, store);
    store.applyFrame({
      type: 'turn', roomId: 'r1', turnId: 't1', submitter: { id: 'i1', handle: 'alice' },
      // `main` entries are `MainEntry` (`{ content: TextContent[] }`).
      // A `TextContent` is either a string or a decoration node — strings
      // render as text nodes.
      packet: {
        turnId: 't1',
        channels: { main: [{ content: ['you look around'] }] }
      }
    });
    expect(host.querySelectorAll('.sharpee-turn-submitter')).toHaveLength(1);
    expect(host.textContent).toContain('alice');
    expect(host.textContent).toContain('you look around');
  });
});

describe('recording-indicator', () => {
  let host: HTMLElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });

  it('shows + hides the indicator', () => {
    const handle = mountRecordingIndicator(host);
    expect(host.querySelector('.sharpee-window-rec-indicator')).toBeNull();

    handle.show('be aware');
    const node = host.querySelector<HTMLElement>('.sharpee-window-rec-indicator')!;
    expect(node).not.toBeNull();
    expect(node.classList.contains('sharpee-window-rec-indicator-hidden')).toBe(false);
    expect(node.textContent).toContain('be aware');

    handle.hide();
    expect(node.classList.contains('sharpee-window-rec-indicator-hidden')).toBe(true);
  });
});
