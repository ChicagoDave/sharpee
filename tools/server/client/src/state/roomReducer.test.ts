/**
 * roomReducer behaviour tests.
 *
 * Behavior Statement — roomReducer
 *   DOES: folds each `ServerMsg` into `RoomState` as specified by ADR-153
 *         Interface Contracts. welcome replaces state; presence updates the
 *         matching participant's `connected`; lock_state sets
 *         `lockHolderId` and clears `draft` on null-holder; draft_frame
 *         stores the latest frame per typist and drops stale (smaller-seq)
 *         frames; story_output appends to `transcript` and clears `draft`;
 *         error records the envelope; room_closed records the close reason.
 *   WHEN: the reducer is called with a wire message.
 *   BECAUSE: the reducer is the one place `ServerMsg` turns into UI state.
 *   REJECTS WHEN: never — unknown / deferred kinds no-op and return the
 *                 prior state without exception.
 */

import { describe, expect, it } from 'vitest';
import { roomReducer } from './roomReducer';
import { initialRoomState, type RoomState } from './types';
import type {
  ParticipantSummary,
  RoomSnapshot,
} from '../types/wire';

const ROOM: RoomSnapshot = {
  room_id: 'room-1',
  title: 'Test Session',
  story_slug: 'zork',
  pinned: false,
  last_activity_at: '2026-04-22T17:00:00Z',
  lock_holder_id: null,
  saves: [],
};

const PARTS: ParticipantSummary[] = [
  {
    participant_id: 'p-host',
    display_name: 'Host',
    tier: 'primary_host',
    connected: true,
    muted: false,
  },
  {
    participant_id: 'p-guest',
    display_name: 'Guest',
    tier: 'participant',
    connected: true,
    muted: false,
  },
];

function welcomed(): RoomState {
  return roomReducer(initialRoomState, {
    kind: 'welcome',
    participant_id: 'p-guest',
    room: ROOM,
    participants: PARTS,
    recording_notice: 'This session is recorded.',
    chat_backlog: [],
    dm_threads: {},
  });
}

describe('roomReducer', () => {
  it('welcome hydrates a fresh snapshot', () => {
    const s = welcomed();
    expect(s.hydrated).toBe(true);
    expect(s.selfId).toBe('p-guest');
    expect(s.room).toEqual(ROOM);
    expect(s.recordingNotice).toBe('This session is recorded.');
    expect(s.participants).toHaveLength(2);
    expect(s.lockHolderId).toBeNull();
    expect(s.transcript).toEqual([]);
  });

  it('welcome with a non-null lock_holder_id carries it onto state', () => {
    const s = roomReducer(initialRoomState, {
      kind: 'welcome',
      participant_id: 'p-guest',
      room: { ...ROOM, lock_holder_id: 'p-host' },
      participants: PARTS,
      recording_notice: '',
      chat_backlog: [],
      dm_threads: {},
    });
    expect(s.lockHolderId).toBe('p-host');
  });

  it('welcome replaces any prior state (reconnect case)', () => {
    const prior: RoomState = {
      ...welcomed(),
      transcript: [{ turn_id: 't1', text_blocks: [], events: [] }],
      lastError: { code: 'runtime_crash', detail: 'boom' },
    };
    const s = roomReducer(prior, {
      kind: 'welcome',
      participant_id: 'p-guest',
      room: ROOM,
      participants: PARTS,
      recording_notice: '',
      chat_backlog: [],
      dm_threads: {},
    });
    expect(s.transcript).toEqual([]);
    expect(s.lastError).toBeNull();
  });

  it('presence flips the target participant connected flag', () => {
    const s = roomReducer(welcomed(), {
      kind: 'presence',
      participant_id: 'p-host',
      connected: false,
      grace_deadline: '2026-04-23T18:05:00Z',
    });
    expect(s.participants.find((p) => p.participant_id === 'p-host')?.connected).toBe(false);
    expect(s.participants.find((p) => p.participant_id === 'p-guest')?.connected).toBe(true);
  });

  it('presence for an unknown participant is a no-op (same reference)', () => {
    const before = welcomed();
    const after = roomReducer(before, {
      kind: 'presence',
      participant_id: 'p-unknown',
      connected: false,
      grace_deadline: null,
    });
    expect(after).toBe(before);
  });

  it('presence(PH, connected=false, grace_deadline) sets phGraceDeadline', () => {
    const s = roomReducer(welcomed(), {
      kind: 'presence',
      participant_id: 'p-host',
      connected: false,
      grace_deadline: '2026-04-23T18:05:00Z',
    });
    expect(s.phGraceDeadline).toBe('2026-04-23T18:05:00Z');
  });

  it('presence(non-PH disconnect) does not set phGraceDeadline', () => {
    const s = roomReducer(welcomed(), {
      kind: 'presence',
      participant_id: 'p-guest',
      connected: false,
      grace_deadline: null,
    });
    expect(s.phGraceDeadline).toBeNull();
  });

  it('presence(PH reconnect) clears a pending phGraceDeadline', () => {
    const disconnected = roomReducer(welcomed(), {
      kind: 'presence',
      participant_id: 'p-host',
      connected: false,
      grace_deadline: '2026-04-23T18:05:00Z',
    });
    const reconnected = roomReducer(disconnected, {
      kind: 'presence',
      participant_id: 'p-host',
      connected: true,
      grace_deadline: null,
    });
    expect(reconnected.phGraceDeadline).toBeNull();
  });

  it('role_change promoting a new PH clears a pending phGraceDeadline', () => {
    const disconnected = roomReducer(welcomed(), {
      kind: 'presence',
      participant_id: 'p-host',
      connected: false,
      grace_deadline: '2026-04-23T18:05:00Z',
    });
    const afterPromotion = roomReducer(disconnected, {
      kind: 'role_change',
      participant_id: 'p-guest',
      tier: 'primary_host',
      actor_id: null,
    });
    expect(afterPromotion.phGraceDeadline).toBeNull();
  });

  it('lock_state with non-null holder sets lockHolderId', () => {
    const s = roomReducer(welcomed(), {
      kind: 'lock_state',
      holder_id: 'p-host',
    });
    expect(s.lockHolderId).toBe('p-host');
  });

  it('lock_state transition from A to B clears the prior draft', () => {
    const withDraft = roomReducer(
      { ...welcomed(), lockHolderId: 'p-host' },
      { kind: 'draft_frame', typist_id: 'p-host', seq: 1, text: 'loo' },
    );
    expect(withDraft.draft?.text).toBe('loo');
    const handedOff = roomReducer(withDraft, { kind: 'lock_state', holder_id: 'p-guest' });
    expect(handedOff.lockHolderId).toBe('p-guest');
    expect(handedOff.draft).toBeNull();
  });

  it('lock_state with the same holder is a no-op (same reference)', () => {
    const held = roomReducer(welcomed(), { kind: 'lock_state', holder_id: 'p-host' });
    const echo = roomReducer(held, { kind: 'lock_state', holder_id: 'p-host' });
    expect(echo).toBe(held);
  });

  it('lock_state release clears both holder and draft', () => {
    const held = roomReducer(welcomed(), { kind: 'lock_state', holder_id: 'p-host' });
    const mid = roomReducer(held, {
      kind: 'draft_frame',
      typist_id: 'p-host',
      seq: 1,
      text: 'loo',
    });
    const released = roomReducer(mid, { kind: 'lock_state', holder_id: null });
    expect(released.lockHolderId).toBeNull();
    expect(released.draft).toBeNull();
  });

  it('draft_frame stores the latest keystroke', () => {
    const s = roomReducer(welcomed(), {
      kind: 'draft_frame',
      typist_id: 'p-host',
      seq: 3,
      text: 'look',
    });
    expect(s.draft).toEqual({ typist_id: 'p-host', seq: 3, text: 'look' });
  });

  it('draft_frame with a stale seq is dropped', () => {
    const s1 = roomReducer(welcomed(), {
      kind: 'draft_frame',
      typist_id: 'p-host',
      seq: 5,
      text: 'look ar',
    });
    const s2 = roomReducer(s1, {
      kind: 'draft_frame',
      typist_id: 'p-host',
      seq: 4,
      text: 'look a',
    });
    expect(s2).toBe(s1);
  });

  it('story_output appends transcript and clears draft', () => {
    const mid = roomReducer(welcomed(), {
      kind: 'draft_frame',
      typist_id: 'p-host',
      seq: 1,
      text: 'look',
    });
    const after = roomReducer(mid, {
      kind: 'story_output',
      turn_id: 't-1',
      text_blocks: [{ kind: 'paragraph', text: 'You are in a room.' }],
      events: [{ type: 'describe_room' }],
    });
    expect(after.transcript).toHaveLength(1);
    expect(after.transcript[0]!.turn_id).toBe('t-1');
    expect(after.transcript[0]!.text_blocks).toHaveLength(1);
    expect(after.draft).toBeNull();
  });

  it('error with code=runtime_crash flips sandboxCrashed and stores the envelope', () => {
    const s = roomReducer(welcomed(), {
      kind: 'error',
      code: 'runtime_crash',
      detail: 'The story runtime crashed.',
      turn_id: 't-9',
    });
    expect(s.sandboxCrashed).toBe(true);
    expect(s.lastError).toEqual({
      code: 'runtime_crash',
      detail: 'The story runtime crashed.',
      turn_id: 't-9',
    });
  });

  it('error with an unrelated code does NOT flip sandboxCrashed', () => {
    const s = roomReducer(welcomed(), {
      kind: 'error',
      code: 'insufficient_authority',
      detail: 'nope',
    });
    expect(s.sandboxCrashed).toBe(false);
  });

  it('restored clears sandboxCrashed', () => {
    const crashed = roomReducer(welcomed(), {
      kind: 'error',
      code: 'runtime_crash',
      detail: 'boom',
    });
    expect(crashed.sandboxCrashed).toBe(true);
    const recovered = roomReducer(crashed, {
      kind: 'restored',
      save_id: 's-1',
      text_blocks: [],
      actor_id: 'p-host',
    });
    expect(recovered.sandboxCrashed).toBe(false);
  });

  it('error stores the envelope including optional turn_id', () => {
    const s = roomReducer(welcomed(), {
      kind: 'error',
      code: 'runtime_crash',
      detail: 'story threw',
      turn_id: 't-42',
    });
    expect(s.lastError).toEqual({
      code: 'runtime_crash',
      detail: 'story threw',
      turn_id: 't-42',
    });
  });

  it('room_closed stores reason and optional message', () => {
    const s = roomReducer(welcomed(), {
      kind: 'room_closed',
      reason: 'deleted',
      message: 'Host deleted the room.',
    });
    expect(s.closed).toEqual({ reason: 'deleted', message: 'Host deleted the room.' });
  });

  it('welcome seeds chatMessages from chat_backlog', () => {
    const s = roomReducer(initialRoomState, {
      kind: 'welcome',
      participant_id: 'p-guest',
      room: ROOM,
      participants: PARTS,
      recording_notice: '',
      chat_backlog: [
        { event_id: 1, from: 'p-host', text: 'welcome in', ts: '2026-04-22T17:00:00Z' },
        { event_id: 2, from: 'p-guest', text: 'thanks', ts: '2026-04-22T17:00:01Z' },
      ],
      dm_threads: {},
    });
    expect(s.chatMessages).toHaveLength(2);
    expect(s.chatMessages[0]!.text).toBe('welcome in');
    expect(s.chatMessages[1]!.from).toBe('p-guest');
  });

  it('chat ServerMsg appends to chatMessages in arrival order', () => {
    const s1 = roomReducer(welcomed(), {
      kind: 'chat',
      event_id: 10,
      from: 'p-host',
      text: 'hello',
      ts: '2026-04-22T17:00:00Z',
    });
    const s2 = roomReducer(s1, {
      kind: 'chat',
      event_id: 11,
      from: 'p-guest',
      text: 'hi',
      ts: '2026-04-22T17:00:01Z',
    });
    expect(s2.chatMessages).toHaveLength(2);
    expect(s2.chatMessages.map((m) => m.event_id)).toEqual([10, 11]);
  });

  it('chat ServerMsg with duplicate event_id is ignored (same reference)', () => {
    const s1 = roomReducer(welcomed(), {
      kind: 'chat',
      event_id: 10,
      from: 'p-host',
      text: 'hello',
      ts: '2026-04-22T17:00:00Z',
    });
    const s2 = roomReducer(s1, {
      kind: 'chat',
      event_id: 10,
      from: 'p-host',
      text: 'hello',
      ts: '2026-04-22T17:00:00Z',
    });
    expect(s2).toBe(s1);
  });

  it('chat ServerMsg drops oldest entries when the cap is exceeded', () => {
    // Seed at the cap, then add one more.
    const seeded: typeof initialRoomState = {
      ...welcomed(),
      chatMessages: Array.from({ length: 500 }, (_, i) => ({
        event_id: i + 1,
        from: 'p-host',
        text: `m${i + 1}`,
        ts: '2026-04-22T17:00:00Z',
      })),
    };
    const next = roomReducer(seeded, {
      kind: 'chat',
      event_id: 9999,
      from: 'p-host',
      text: 'overflow',
      ts: '2026-04-22T17:01:00Z',
    });
    expect(next.chatMessages).toHaveLength(500);
    expect(next.chatMessages[0]!.event_id).toBe(2); // oldest dropped
    expect(next.chatMessages.at(-1)!.event_id).toBe(9999);
  });

  it('mute_state flips the target participant muted flag', () => {
    const s = roomReducer(welcomed(), {
      kind: 'mute_state',
      participant_id: 'p-guest',
      muted: true,
      actor_id: 'p-host',
    });
    expect(s.participants.find((p) => p.participant_id === 'p-guest')?.muted).toBe(true);
    expect(s.participants.find((p) => p.participant_id === 'p-host')?.muted).toBe(false);
  });

  it('mute_state with the already-current value is a no-op (same reference)', () => {
    const before = welcomed();
    const after = roomReducer(before, {
      kind: 'mute_state',
      participant_id: 'p-guest',
      muted: false, // p-guest starts with muted=false
      actor_id: 'p-host',
    });
    expect(after).toBe(before);
  });

  it('mute_state for an unknown participant is a no-op (same reference)', () => {
    const before = welcomed();
    const after = roomReducer(before, {
      kind: 'mute_state',
      participant_id: 'p-ghost',
      muted: true,
      actor_id: 'p-host',
    });
    expect(after).toBe(before);
  });

  it('role_change updates the target participant tier', () => {
    const s = roomReducer(welcomed(), {
      kind: 'role_change',
      participant_id: 'p-guest',
      tier: 'command_entrant',
      actor_id: 'p-host',
    });
    expect(s.participants.find((p) => p.participant_id === 'p-guest')?.tier).toBe(
      'command_entrant',
    );
    expect(s.participants.find((p) => p.participant_id === 'p-host')?.tier).toBe(
      'primary_host',
    );
  });

  it('role_change with the already-current tier is a no-op (same reference)', () => {
    const before = welcomed();
    const after = roomReducer(before, {
      kind: 'role_change',
      participant_id: 'p-guest',
      tier: 'participant', // unchanged
      actor_id: 'p-host',
    });
    expect(after).toBe(before);
  });

  it('role_change for an unknown participant is a no-op (same reference)', () => {
    const before = welcomed();
    const after = roomReducer(before, {
      kind: 'role_change',
      participant_id: 'p-ghost',
      tier: 'co_host',
      actor_id: 'p-host',
    });
    expect(after).toBe(before);
  });

  it('room_state updates pinned + last_activity_at + title on state.room', () => {
    const s = roomReducer(welcomed(), {
      kind: 'room_state',
      pinned: true,
      last_activity_at: '2026-04-23T18:00:00Z',
      title: 'Renamed',
    });
    expect(s.room?.pinned).toBe(true);
    expect(s.room?.title).toBe('Renamed');
    expect(s.room?.last_activity_at).toBe('2026-04-23T18:00:00Z');
  });

  it('room_state with no net change returns the prior state reference', () => {
    const before = welcomed();
    const after = roomReducer(before, {
      kind: 'room_state',
      pinned: before.room!.pinned,
      last_activity_at: before.room!.last_activity_at,
      title: before.room!.title,
    });
    expect(after).toBe(before);
  });

  it('successor sets designatedSuccessorId', () => {
    const s = roomReducer(welcomed(), {
      kind: 'successor',
      participant_id: 'p-guest',
    });
    expect(s.designatedSuccessorId).toBe('p-guest');
  });

  it('successor with the already-current nominee returns the prior state', () => {
    const first = roomReducer(welcomed(), {
      kind: 'successor',
      participant_id: 'p-guest',
    });
    const second = roomReducer(first, {
      kind: 'successor',
      participant_id: 'p-guest',
    });
    expect(second).toBe(first);
  });

  it('save_created appends a save to state.room.saves', () => {
    const s = roomReducer(welcomed(), {
      kind: 'save_created',
      save_id: 's-1',
      name: 'zork turn 12 @ 17:00',
      actor_id: 'p-host',
      ts: '2026-04-23T17:00:00Z',
    });
    expect(s.room?.saves).toHaveLength(1);
    expect(s.room?.saves[0]).toEqual({
      save_id: 's-1',
      name: 'zork turn 12 @ 17:00',
      created_at: '2026-04-23T17:00:00Z',
    });
  });

  it('save_created with a duplicate save_id returns the prior state reference', () => {
    const once = roomReducer(welcomed(), {
      kind: 'save_created',
      save_id: 's-1',
      name: 'save one',
      actor_id: 'p-host',
      ts: '2026-04-23T17:00:00Z',
    });
    const twice = roomReducer(once, {
      kind: 'save_created',
      save_id: 's-1',
      name: 'save one',
      actor_id: 'p-host',
      ts: '2026-04-23T17:00:00Z',
    });
    expect(twice).toBe(once);
  });

  it('restored appends a transcript entry tagged with save_id and resolves the save_name', () => {
    const withSave = roomReducer(welcomed(), {
      kind: 'save_created',
      save_id: 's-1',
      name: 'zork t-3',
      actor_id: 'p-host',
      ts: '2026-04-23T17:00:00Z',
    });
    const after = roomReducer(withSave, {
      kind: 'restored',
      save_id: 's-1',
      text_blocks: [{ kind: 'paragraph', text: 'You wake up with a start.' }],
      actor_id: 'p-host',
    });
    expect(after.transcript).toHaveLength(1);
    const entry = after.transcript[0]!;
    expect(entry.turn_id).toBe('restore-s-1');
    expect(entry.restored).toEqual({ save_id: 's-1', save_name: 'zork t-3' });
    expect(entry.text_blocks).toHaveLength(1);
    expect(after.draft).toBeNull();
  });

  it('restored falls back to "(unknown)" when the save is not in state', () => {
    const after = roomReducer(welcomed(), {
      kind: 'restored',
      save_id: 's-missing',
      text_blocks: [],
      actor_id: 'p-host',
    });
    expect(after.transcript[0]!.restored?.save_name).toBe('(unknown)');
  });

  it('restored clears any pending draft', () => {
    const withHold = roomReducer(welcomed(), {
      kind: 'lock_state',
      holder_id: 'p-host',
    });
    const withDraft = roomReducer(withHold, {
      kind: 'draft_frame',
      typist_id: 'p-host',
      seq: 1,
      text: 'unread',
    });
    expect(withDraft.draft).not.toBeNull();
    const after = roomReducer(withDraft, {
      kind: 'restored',
      save_id: 's-1',
      text_blocks: [],
      actor_id: 'p-host',
    });
    expect(after.draft).toBeNull();
  });

  it('dm to the PH from a Co-Host opens a thread keyed on the peer id', () => {
    // welcomed() has p-host (PH) as selfId=p-guest (a Participant). We need
    // a PH viewer and a CH peer. Build a fresh welcome for that scenario.
    const phState = roomReducer(initialRoomState, {
      kind: 'welcome',
      participant_id: 'p-host',
      room: ROOM,
      participants: [
        {
          participant_id: 'p-host',
          display_name: 'Host',
          tier: 'primary_host',
          connected: true,
          muted: false,
        },
        {
          participant_id: 'p-ch',
          display_name: 'Alice',
          tier: 'co_host',
          connected: true,
          muted: false,
        },
      ],
      recording_notice: '',
      chat_backlog: [],
      dm_threads: {},
    });
    const s = roomReducer(phState, {
      kind: 'dm',
      event_id: 10,
      from: 'p-ch',
      to: 'p-host',
      text: 'psst',
      ts: '2026-04-23T17:00:00Z',
    });
    expect(s.dmThreads['p-ch']).toHaveLength(1);
    expect(s.dmThreads['p-ch']![0]).toEqual({
      event_id: 10,
      from: 'p-ch',
      to: 'p-host',
      text: 'psst',
      ts: '2026-04-23T17:00:00Z',
    });
  });

  it('dm entitlement: Participant viewer drops the message (same state reference)', () => {
    const before = welcomed(); // selfId=p-guest, tier=participant
    const after = roomReducer(before, {
      kind: 'dm',
      event_id: 10,
      from: 'p-host',
      to: 'p-guest',
      text: 'hi',
      ts: '2026-04-23T17:00:00Z',
    });
    expect(after).toBe(before);
    expect(after.dmThreads).toEqual({});
  });

  it('dm entitlement: CH viewer only stores messages on the PH axis', () => {
    const chState = roomReducer(initialRoomState, {
      kind: 'welcome',
      participant_id: 'p-ch',
      room: ROOM,
      participants: [
        {
          participant_id: 'p-host',
          display_name: 'Host',
          tier: 'primary_host',
          connected: true,
          muted: false,
        },
        {
          participant_id: 'p-ch',
          display_name: 'Alice',
          tier: 'co_host',
          connected: true,
          muted: false,
        },
        {
          participant_id: 'p-ch2',
          display_name: 'Bob',
          tier: 'co_host',
          connected: true,
          muted: false,
        },
      ],
      recording_notice: '',
      chat_backlog: [],
      dm_threads: {},
    });
    // CH ↔ CH — not allowed; should drop.
    const tryChPeer = roomReducer(chState, {
      kind: 'dm',
      event_id: 11,
      from: 'p-ch',
      to: 'p-ch2',
      text: 'no',
      ts: '2026-04-23T17:00:00Z',
    });
    expect(tryChPeer).toBe(chState);
    // CH ↔ PH — allowed; thread key = PH.
    const okDm = roomReducer(chState, {
      kind: 'dm',
      event_id: 12,
      from: 'p-host',
      to: 'p-ch',
      text: 'hi',
      ts: '2026-04-23T17:00:00Z',
    });
    expect(okDm.dmThreads['p-host']).toHaveLength(1);
  });

  it('dm with a duplicate event_id is ignored (same reference)', () => {
    const phState = roomReducer(initialRoomState, {
      kind: 'welcome',
      participant_id: 'p-host',
      room: ROOM,
      participants: [
        {
          participant_id: 'p-host',
          display_name: 'Host',
          tier: 'primary_host',
          connected: true,
          muted: false,
        },
        {
          participant_id: 'p-ch',
          display_name: 'Alice',
          tier: 'co_host',
          connected: true,
          muted: false,
        },
      ],
      recording_notice: '',
      chat_backlog: [],
      dm_threads: {},
    });
    const once = roomReducer(phState, {
      kind: 'dm',
      event_id: 7,
      from: 'p-ch',
      to: 'p-host',
      text: 'x',
      ts: '2026-04-23T17:00:00Z',
    });
    const twice = roomReducer(once, {
      kind: 'dm',
      event_id: 7,
      from: 'p-ch',
      to: 'p-host',
      text: 'x',
      ts: '2026-04-23T17:00:00Z',
    });
    expect(twice).toBe(once);
  });

  // ---------- Plan 04 Phase 3 — DM read cursors ----------

  it('initial state has an empty dmReadCursors map', () => {
    expect(initialRoomState.dmReadCursors).toEqual({});
  });

  it('welcome resets dmReadCursors to {}', () => {
    // Seed a state with a non-empty cursor map, then welcome again.
    const seeded: RoomState = {
      ...welcomed(),
      dmReadCursors: { 'p-other': 99 },
    };
    const next = roomReducer(seeded, {
      kind: 'welcome',
      participant_id: 'p-guest',
      room: ROOM,
      participants: PARTS,
      recording_notice: '',
      chat_backlog: [],
      dm_threads: {},
    });
    expect(next.dmReadCursors).toEqual({});
  });

  it('ui:dm_read advances the cursor for the named peer', () => {
    const next = roomReducer(welcomed(), {
      kind: 'ui:dm_read',
      peer_participant_id: 'p-host',
      up_to_event_id: 12,
    });
    expect(next.dmReadCursors['p-host']).toBe(12);
  });

  it('ui:dm_read on a peer with an existing cursor advances it strictly upward', () => {
    const seeded: RoomState = {
      ...welcomed(),
      dmReadCursors: { 'p-host': 5 },
    };
    const next = roomReducer(seeded, {
      kind: 'ui:dm_read',
      peer_participant_id: 'p-host',
      up_to_event_id: 8,
    });
    expect(next.dmReadCursors['p-host']).toBe(8);
  });

  it('ui:dm_read with up_to_event_id <= current cursor is a no-op (same reference)', () => {
    const seeded: RoomState = {
      ...welcomed(),
      dmReadCursors: { 'p-host': 10 },
    };
    const equal = roomReducer(seeded, {
      kind: 'ui:dm_read',
      peer_participant_id: 'p-host',
      up_to_event_id: 10,
    });
    const lower = roomReducer(seeded, {
      kind: 'ui:dm_read',
      peer_participant_id: 'p-host',
      up_to_event_id: 3,
    });
    expect(equal).toBe(seeded);
    expect(lower).toBe(seeded);
  });

  it('ui:dm_read for one peer leaves other peers cursors untouched', () => {
    const seeded: RoomState = {
      ...welcomed(),
      dmReadCursors: { 'p-host': 4, 'p-other': 9 },
    };
    const next = roomReducer(seeded, {
      kind: 'ui:dm_read',
      peer_participant_id: 'p-host',
      up_to_event_id: 7,
    });
    expect(next.dmReadCursors).toEqual({ 'p-host': 7, 'p-other': 9 });
  });

  // ---------- Plan 04 Phase 4 — DM rehydration on welcome ----------

  it('welcome with dm_threads populates dmThreads verbatim', () => {
    const s = roomReducer(initialRoomState, {
      kind: 'welcome',
      participant_id: 'p-host',
      room: ROOM,
      participants: PARTS,
      recording_notice: '',
      chat_backlog: [],
      dm_threads: {
        'p-ch': [
          { event_id: 5, from: 'p-host', to: 'p-ch', text: 'hi', ts: 't' },
          { event_id: 8, from: 'p-ch', to: 'p-host', text: 'hey', ts: 't' },
        ],
      },
    });
    expect(s.dmThreads['p-ch']).toHaveLength(2);
    expect(s.dmThreads['p-ch']![0]!.event_id).toBe(5);
    expect(s.dmThreads['p-ch']![1]!.event_id).toBe(8);
  });

  it('welcome seeds dmReadCursors to the per-thread max event_id', () => {
    const s = roomReducer(initialRoomState, {
      kind: 'welcome',
      participant_id: 'p-host',
      room: ROOM,
      participants: PARTS,
      recording_notice: '',
      chat_backlog: [],
      dm_threads: {
        'p-ch': [
          { event_id: 5, from: 'p-host', to: 'p-ch', text: 'a', ts: 't' },
          { event_id: 12, from: 'p-ch', to: 'p-host', text: 'b', ts: 't' },
          { event_id: 9, from: 'p-host', to: 'p-ch', text: 'c', ts: 't' },
        ],
        'p-ch2': [
          { event_id: 3, from: 'p-host', to: 'p-ch2', text: 'd', ts: 't' },
        ],
      },
    });
    // Max of the thread, not assuming sorted input.
    expect(s.dmReadCursors['p-ch']).toBe(12);
    expect(s.dmReadCursors['p-ch2']).toBe(3);
  });

  it('welcome with empty dm_threads leaves dmReadCursors empty', () => {
    const s = roomReducer(initialRoomState, {
      kind: 'welcome',
      participant_id: 'p-host',
      room: ROOM,
      participants: PARTS,
      recording_notice: '',
      chat_backlog: [],
      dm_threads: {},
    });
    expect(s.dmReadCursors).toEqual({});
  });

  it('incoming dm does not advance the cursor — it accumulates as unread', () => {
    // PH state with Alice (CH) so the dm is admitted by dmPeerFor.
    const phState = roomReducer(initialRoomState, {
      kind: 'welcome',
      participant_id: 'p-host',
      room: ROOM,
      participants: [
        {
          participant_id: 'p-host',
          display_name: 'Host',
          tier: 'primary_host',
          connected: true,
          muted: false,
        },
        {
          participant_id: 'p-ch',
          display_name: 'Alice',
          tier: 'co_host',
          connected: true,
          muted: false,
        },
      ],
      recording_notice: '',
      chat_backlog: [],
      dm_threads: {},
    });
    const after = roomReducer(phState, {
      kind: 'dm',
      event_id: 42,
      from: 'p-ch',
      to: 'p-host',
      text: 'hey',
      ts: '2026-04-23T17:00:00Z',
    });
    expect(after.dmThreads['p-ch']).toHaveLength(1);
    // Cursor untouched — only ui:dm_read may advance it.
    expect(after.dmReadCursors['p-ch']).toBeUndefined();
  });
});
