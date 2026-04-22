/**
 * handleRestore unit tests.
 *
 * Behavior Statement — handleRestore
 *   DOES:
 *     - When sender tier ∈ {primary_host, co_host, command_entrant} AND sender
 *       is not muted AND save_id is non-empty: delegates to saveService.restore;
 *       on success broadcasts `restored{ save_id, text_blocks, actor_id }` to
 *       every connection in the room. If the room had an active lock holder,
 *       force-releases it and broadcasts `lock_state{ holder_id: null }`.
 *     - On SaveServiceError: sends `error{ code, detail }` to sender only; no
 *       broadcast; no lock mutation.
 *     - Otherwise: sends error to sender only — no state mutation, no broadcast.
 *   WHEN: a restore frame arrives on the post-hello dispatch path.
 *   BECAUSE: ADR-153 Decision 2 (restore via server), Decision 10 (authority
 *            tiers); plan §Restore Cycle step 9 — the game state just changed,
 *            so any in-flight typing lock is stale and must be cleared.
 *   REJECTS WHEN:
 *     - save_id missing/empty                      → bad_save_id
 *     - sender unknown                             → unknown_participant
 *     - sender muted                               → muted
 *     - sender tier = participant                  → insufficient_authority
 *     - SaveService throws SaveServiceError        → forwards its code
 *     - SaveService throws non-SaveServiceError    → restore_failed
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { handleRestore, type RestoreDeps } from '../../src/ws/handlers/restore.js';
import { createLockManager, type LockManager } from '../../src/ws/lock-manager.js';
import {
  SaveServiceError,
  type SaveService,
} from '../../src/saves/save-service.js';
import type { ConnectionManager } from '../../src/ws/connection-manager.js';
import type { ParticipantsRepository } from '../../src/repositories/participants.js';
import type { Participant, Tier, TextBlock } from '../../src/repositories/types.js';
import type { ClientMsg, ServerMsg } from '../../src/wire/browser-server.js';

/* ---------- fakes ---------- */

interface FakeSocket {
  sent: ServerMsg[];
  send(data: string): void;
}

function fakeSocket(): FakeSocket {
  const sent: ServerMsg[] = [];
  return {
    sent,
    send(data: string) {
      sent.push(JSON.parse(data) as ServerMsg);
    },
  };
}

interface BroadcastCall {
  room_id: string;
  msg: ServerMsg;
}

function fakeConnections(): { mgr: ConnectionManager; calls: BroadcastCall[] } {
  const calls: BroadcastCall[] = [];
  const mgr: ConnectionManager = {
    register: () => {},
    unregisterParticipant: () => null,
    unregisterSocket: () => null,
    broadcast: (room_id, msg) => {
      calls.push({ room_id, msg });
    },
    send: () => false,
    getConnectedCount: () => 0,
    getParticipantSocket: () => null,
    getSocketMeta: () => null,
    size: () => 0,
  };
  return { mgr, calls };
}

function fakeParticipants(
  entries: Array<Partial<Participant> & { participant_id: string; tier: Tier }>
): ParticipantsRepository {
  const byId = new Map<string, Participant>();
  for (const e of entries) {
    byId.set(e.participant_id, {
      participant_id: e.participant_id,
      room_id: e.room_id ?? 'room-A',
      token: e.token ?? 'tok-' + e.participant_id,
      display_name: e.display_name ?? e.participant_id,
      tier: e.tier,
      muted: e.muted ?? false,
      connected: e.connected ?? true,
      is_successor: e.is_successor ?? false,
      joined_at: e.joined_at ?? '2026-04-21T00:00:00Z',
    });
  }
  return {
    findById: (id) => byId.get(id) ?? null,
    createOrReconnect: () => {
      throw new Error('not used');
    },
    createWithId: () => {
      throw new Error('not used');
    },
    findByToken: () => null,
    setTier: () => {},
    setMuted: () => {},
    setConnected: () => {},
    listForRoom: () => [],
    earliestConnectedParticipant: () => null,
  };
}

interface RestoreCall {
  room_id: string;
  actor_id: string;
  save_id: string;
}

type RestoreOutcome =
  | { ok: true; save_id: string; text_blocks: TextBlock[] }
  | { ok: false; error: unknown };

function fakeSaveService(outcome: RestoreOutcome): {
  svc: SaveService;
  restoreCalls: RestoreCall[];
  saveCalls: unknown[];
} {
  const restoreCalls: RestoreCall[] = [];
  const saveCalls: unknown[] = [];
  const svc: SaveService = {
    async save(input) {
      saveCalls.push(input);
      throw new Error('not used');
    },
    async restore(input) {
      restoreCalls.push(input);
      if (!outcome.ok) throw outcome.error;
      return {
        save_id: outcome.save_id,
        text_blocks: outcome.text_blocks,
      };
    },
  };
  return { svc, restoreCalls, saveCalls };
}

/* ---------- tests ---------- */

describe('handleRestore', () => {
  const ROOM = 'room-A';
  const PH = 'ph-id';
  const COHOST = 'cohost-id';
  const ENTRANT = 'entrant-id';
  const ALICE = 'alice-id';

  const OK_TEXT: TextBlock[] = [{ kind: 'para', text: 'You are in the hall.' }];

  let conns: ReturnType<typeof fakeConnections>;
  let participants: ParticipantsRepository;
  let locks: LockManager;
  let ws: FakeSocket;

  beforeEach(() => {
    conns = fakeConnections();
    locks = createLockManager();
    participants = fakeParticipants([
      { participant_id: PH, tier: 'primary_host' },
      { participant_id: COHOST, tier: 'co_host' },
      { participant_id: ENTRANT, tier: 'command_entrant' },
      { participant_id: ALICE, tier: 'participant' },
      { participant_id: 'muted-ph', tier: 'primary_host', muted: true },
    ]);
    ws = fakeSocket();
  });

  async function invoke(
    actorId: string,
    svc: SaveService,
    msg: Extract<ClientMsg, { kind: 'restore' }> = { kind: 'restore', save_id: 's-1' }
  ): Promise<void> {
    const deps: RestoreDeps = {
      participants,
      connections: conns.mgr,
      locks,
      saveService: svc,
    };
    await handleRestore(
      deps,
      ws as unknown as import('ws').WebSocket,
      { participant_id: actorId, room_id: ROOM },
      msg
    );
  }

  /* ---- happy paths ---- */

  it('primary_host restore with no active lock: broadcasts restored; no lock_state broadcast', async () => {
    const { svc, restoreCalls } = fakeSaveService({
      ok: true,
      save_id: 's-1',
      text_blocks: OK_TEXT,
    });

    await invoke(PH, svc);

    expect(restoreCalls).toEqual([{ room_id: ROOM, actor_id: PH, save_id: 's-1' }]);
    expect(conns.calls).toEqual([
      {
        room_id: ROOM,
        msg: {
          kind: 'restored',
          save_id: 's-1',
          text_blocks: OK_TEXT,
          actor_id: PH,
        },
      },
    ]);
    expect(ws.sent).toEqual([]);
    expect(locks.getState(ROOM).holder_id).toBeNull();
  });

  it('co_host restore: restored broadcast with actor_id = co_host', async () => {
    const { svc } = fakeSaveService({
      ok: true,
      save_id: 's-2',
      text_blocks: [],
    });
    await invoke(COHOST, svc, { kind: 'restore', save_id: 's-2' });
    expect(conns.calls[0]!.msg).toMatchObject({
      kind: 'restored',
      actor_id: COHOST,
      save_id: 's-2',
    });
  });

  it('command_entrant restore: restored broadcast', async () => {
    const { svc } = fakeSaveService({
      ok: true,
      save_id: 's-3',
      text_blocks: [],
    });
    await invoke(ENTRANT, svc, { kind: 'restore', save_id: 's-3' });
    expect(conns.calls[0]!.msg).toMatchObject({
      kind: 'restored',
      actor_id: ENTRANT,
    });
  });

  it('restore clears an active lock: lock_state(null) broadcast after restored', async () => {
    locks.acquireOrUpdate(ROOM, ALICE, 1);
    expect(locks.getState(ROOM).holder_id).toBe(ALICE);

    const { svc } = fakeSaveService({
      ok: true,
      save_id: 's-1',
      text_blocks: OK_TEXT,
    });

    await invoke(PH, svc);

    expect(locks.getState(ROOM).holder_id).toBeNull();
    expect(conns.calls.length).toBe(2);
    expect(conns.calls[0]!.msg.kind).toBe('restored');
    expect(conns.calls[1]!.msg).toEqual({ kind: 'lock_state', holder_id: null });
  });

  /* ---- bad inputs ---- */

  it('empty save_id: bad_save_id to sender, no service call, no broadcast', async () => {
    const { svc, restoreCalls } = fakeSaveService({
      ok: true,
      save_id: 'x',
      text_blocks: [],
    });

    await invoke(PH, svc, { kind: 'restore', save_id: '' });

    expect(ws.sent).toEqual([
      {
        kind: 'error',
        code: 'bad_save_id',
        detail: 'restore.save_id must be a non-empty string',
      },
    ]);
    expect(restoreCalls).toEqual([]);
    expect(conns.calls).toEqual([]);
  });

  /* ---- authority rejections ---- */

  it('Participant restore: insufficient_authority, no broadcast, no service call', async () => {
    const { svc, restoreCalls } = fakeSaveService({
      ok: true,
      save_id: 'x',
      text_blocks: [],
    });
    await invoke(ALICE, svc);

    expect(ws.sent).toEqual([
      {
        kind: 'error',
        code: 'insufficient_authority',
        detail: 'restore requires command_entrant, co_host, or primary_host tier',
      },
    ]);
    expect(conns.calls).toEqual([]);
    expect(restoreCalls).toEqual([]);
  });

  it('muted sender: muted error, no broadcast, no service call', async () => {
    const { svc, restoreCalls } = fakeSaveService({
      ok: true,
      save_id: 'x',
      text_blocks: [],
    });
    await invoke('muted-ph', svc);

    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('muted');
    expect(conns.calls).toEqual([]);
    expect(restoreCalls).toEqual([]);
  });

  it('unknown sender: unknown_participant error, no broadcast, no service call', async () => {
    const { svc, restoreCalls } = fakeSaveService({
      ok: true,
      save_id: 'x',
      text_blocks: [],
    });
    await invoke('ghost-id', svc);

    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'unknown_participant'
    );
    expect(conns.calls).toEqual([]);
    expect(restoreCalls).toEqual([]);
  });

  /* ---- service failures ---- */

  it('save_not_found: forwards to sender; no broadcast; lock state untouched', async () => {
    locks.acquireOrUpdate(ROOM, ALICE, 1);
    const { svc } = fakeSaveService({
      ok: false,
      error: new SaveServiceError('save_not_found', 'save x not found'),
    });

    await invoke(PH, svc, { kind: 'restore', save_id: 'nope' });

    expect(ws.sent).toEqual([
      { kind: 'error', code: 'save_not_found', detail: 'save x not found' },
    ]);
    expect(conns.calls).toEqual([]);
    expect(locks.getState(ROOM).holder_id).toBe(ALICE);
  });

  it('save_room_mismatch: forwards to sender; no broadcast', async () => {
    const { svc } = fakeSaveService({
      ok: false,
      error: new SaveServiceError('save_room_mismatch', 'wrong room'),
    });
    await invoke(PH, svc);

    expect(ws.sent).toEqual([
      { kind: 'error', code: 'save_room_mismatch', detail: 'wrong room' },
    ]);
    expect(conns.calls).toEqual([]);
  });

  it('sandbox_timeout: forwards by code', async () => {
    const { svc } = fakeSaveService({
      ok: false,
      error: new SaveServiceError('sandbox_timeout', 'RESTORE timed out'),
    });
    await invoke(PH, svc);

    expect(ws.sent).toEqual([
      { kind: 'error', code: 'sandbox_timeout', detail: 'RESTORE timed out' },
    ]);
    expect(conns.calls).toEqual([]);
  });

  it('non-SaveServiceError throw is wrapped as restore_failed', async () => {
    const { svc } = fakeSaveService({
      ok: false,
      error: new Error('db corrupt'),
    });
    await invoke(PH, svc);

    expect(ws.sent).toEqual([
      { kind: 'error', code: 'restore_failed', detail: 'db corrupt' },
    ]);
    expect(conns.calls).toEqual([]);
  });
});
