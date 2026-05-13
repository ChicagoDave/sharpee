/**
 * Unit tests for the client-side room-state store.
 * Pure-logic; no DOM required.
 */

import { describe, it, expect } from 'vitest';
import { createRoomStateStore } from '../../web/src/store/room-state.js';
import type { RoomStateResponse } from '../../web/src/http-client.js';

function emptyResponse(): RoomStateResponse {
  return {
    room: {
      id: 'r1',
      join_code: 'ABCD1234',
      title: 'Test',
      story_slug: 'dungeo',
      pinned: false,
      primary_host_id: 'i1',
      recording_notice: 'rec notice'
    },
    cmgt: { channels: [] },
    transcript_backlog: [],
    roster: [
      { participant_id: 'p1', identity_id: 'i1', handle: 'alice', tier: 'primary_host', muted: false, connected: false, is_successor: false },
      { participant_id: 'p2', identity_id: 'i2', handle: 'bob', tier: 'participant', muted: false, connected: false, is_successor: true }
    ],
    lock: { holder: null, expiresAt: null }
  };
}

describe('createRoomStateStore', () => {
  it('hydrate populates room + roster + cmgt + transcript_backlog as transcript', () => {
    const store = createRoomStateStore();
    const response = emptyResponse();
    response.transcript_backlog = [{ turnId: 't1', channels: { main: ['hello'] } }];
    store.hydrate(response);

    const snap = store.snapshot();
    expect(snap.room?.title).toBe('Test');
    expect(snap.roster).toHaveLength(2);
    expect(snap.transcript).toHaveLength(1);
    expect(snap.transcript[0].turnId).toBe('t1');
    expect(snap.lock.holder).toBeNull();
    expect(snap.gracePending).toBe(false);
  });

  it('subscribe fires on hydrate + applyFrame', () => {
    const store = createRoomStateStore();
    let fires = 0;
    store.subscribe(() => { fires += 1; });

    store.hydrate(emptyResponse());
    expect(fires).toBe(1);

    store.applyFrame({ type: 'lock:state', roomId: 'r1', holder: 'p2', expiresAt: 100 });
    expect(fires).toBe(2);

    expect(store.snapshot().lock).toEqual({ holder: 'p2', expiresAt: 100 });
  });

  it('chat:message frames append to chat array', () => {
    const store = createRoomStateStore();
    store.hydrate(emptyResponse());
    store.applyFrame({
      type: 'chat:message', id: 'c1', roomId: 'r1', fromId: 'i1', fromHandle: 'alice', text: 'hi', ts: 1
    });
    expect(store.snapshot().chat).toHaveLength(1);
    expect(store.snapshot().chat[0].text).toBe('hi');
  });

  it('dm:message frames append to dms array', () => {
    const store = createRoomStateStore();
    store.hydrate(emptyResponse());
    store.applyFrame({
      type: 'dm:message', id: 'd1', roomId: 'r1', fromId: 'i1', fromHandle: 'alice', text: 'sidebar', ts: 1
    });
    expect(store.snapshot().dms).toHaveLength(1);
    expect(store.snapshot().chat).toHaveLength(0);
  });

  it('role_change updates roster row + ownTier when it is self', () => {
    const store = createRoomStateStore();
    store.hydrate(emptyResponse());
    store.setOwnParticipant({ participantId: 'p2', tier: 'participant' });
    store.applyFrame({ type: 'role_change', roomId: 'r1', participantId: 'p2', tier: 'co_host' });
    const snap = store.snapshot();
    expect(snap.roster.find((r) => r.participant_id === 'p2')?.tier).toBe('co_host');
    expect(snap.ownTier).toBe('co_host');
  });

  it('presence frame with graceDeadline sets gracePending', () => {
    const store = createRoomStateStore();
    store.hydrate(emptyResponse());
    store.applyFrame({
      type: 'presence', roomId: 'r1', participantId: 'p1', connected: false, graceDeadline: 5000
    });
    const snap = store.snapshot();
    expect(snap.gracePending).toBe(true);
    expect(snap.graceDeadline).toBe(5000);
    expect(snap.roster.find((r) => r.participant_id === 'p1')?.connected).toBe(false);
  });

  it('presence reconnect clears gracePending', () => {
    const store = createRoomStateStore();
    store.hydrate(emptyResponse());
    store.applyFrame({
      type: 'presence', roomId: 'r1', participantId: 'p1', connected: false, graceDeadline: 5000
    });
    store.applyFrame({ type: 'presence', roomId: 'r1', participantId: 'p1', connected: true });
    expect(store.snapshot().gracePending).toBe(false);
  });

  it('mute_state updates roster row', () => {
    const store = createRoomStateStore();
    store.hydrate(emptyResponse());
    store.applyFrame({ type: 'mute_state', roomId: 'r1', participantId: 'p2', muted: true });
    expect(store.snapshot().roster.find((r) => r.participant_id === 'p2')?.muted).toBe(true);
  });

  it('turn frame appends to transcript', () => {
    const store = createRoomStateStore();
    store.hydrate(emptyResponse());
    store.applyFrame({
      type: 'turn',
      roomId: 'r1',
      turnId: 't42',
      submitter: { id: 'i1', handle: 'alice' },
      packet: { turnId: 't42', channels: { main: [{ text: 'look' }] } }
    });
    const snap = store.snapshot();
    expect(snap.transcript).toHaveLength(1);
    expect(snap.transcript[0].turnId).toBe('t42');
    expect(snap.transcript[0].submitter?.handle).toBe('alice');
  });

  it('room_restored clears transcript + chat + dms', () => {
    const store = createRoomStateStore();
    store.hydrate(emptyResponse());
    store.applyFrame({
      type: 'turn', roomId: 'r1', turnId: 't1', submitter: { id: 'i1', handle: 'alice' },
      packet: { turnId: 't1', channels: {} }
    });
    store.applyFrame({
      type: 'chat:message', id: 'c1', roomId: 'r1', fromId: 'i1', fromHandle: 'alice', text: 'x', ts: 1
    });
    expect(store.snapshot().transcript).toHaveLength(1);
    store.applyFrame({ type: 'room_restored', roomId: 'r1', atSaveId: 's1', byHandle: 'alice' });
    expect(store.snapshot().transcript).toHaveLength(0);
    expect(store.snapshot().chat).toHaveLength(0);
    expect(store.snapshot().dms).toHaveLength(0);
  });

  it('setTerminalClose records the close', () => {
    const store = createRoomStateStore();
    store.setTerminalClose({ code: 4007, reason: 'erased' });
    expect(store.snapshot().terminalClose).toEqual({ code: 4007, reason: 'erased' });
  });

  it('setOwnParticipant marks own row connected', () => {
    const store = createRoomStateStore();
    store.hydrate(emptyResponse());
    store.setOwnParticipant({ participantId: 'p1', tier: 'primary_host' });
    expect(store.snapshot().ownParticipantId).toBe('p1');
    expect(store.snapshot().ownTier).toBe('primary_host');
    expect(store.snapshot().roster.find((r) => r.participant_id === 'p1')?.connected).toBe(true);
  });
});
