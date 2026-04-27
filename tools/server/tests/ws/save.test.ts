/**
 * handleSave unit tests.
 *
 * Behavior Statement — handleSave
 *   DOES:
 *     - When sender tier ∈ {primary_host, co_host, command_entrant} AND sender
 *       is not muted: delegates to saveService.save; on success broadcasts
 *       save_created{ save_id, name, actor_id, ts } to every connection in
 *       the room.
 *     - On SaveServiceError: sends error{ code, detail } to sender only.
 *     - Otherwise: sends error to sender only — no state mutation, no broadcast.
 *   WHEN: a save frame arrives on the post-hello dispatch path.
 *   BECAUSE: ADR-153 Decision 2 (save via server), Decision 10 (authority
 *            tiers), Decision 11 (transparency — all participants see the
 *            new save).
 *   REJECTS WHEN:
 *     - sender unknown                         → unknown_participant
 *     - sender muted                           → muted
 *     - sender tier = participant              → insufficient_authority
 *     - SaveService throws SaveServiceError    → forwards its code to sender
 *     - SaveService throws non-SaveServiceError → save_failed
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { handleSave, type SaveDeps } from '../../src/ws/handlers/save.js';
import {
  SaveServiceError,
  type SaveService,
} from '../../src/saves/save-service.js';
import type { ConnectionManager } from '../../src/ws/connection-manager.js';
import type { ParticipantsRepository } from '../../src/repositories/participants.js';
import type { Participant, Tier } from '../../src/repositories/types.js';
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
    closeRoom: () => 0,
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

interface SaveCall {
  room_id: string;
  actor_id: string;
}

type SaveOutcome =
  | { ok: true; save_id: string; name: string; created_at: string }
  | { ok: false; error: unknown };

function fakeSaveService(outcome: SaveOutcome): {
  svc: SaveService;
  saveCalls: SaveCall[];
  restoreCalls: unknown[];
} {
  const saveCalls: SaveCall[] = [];
  const restoreCalls: unknown[] = [];
  const svc: SaveService = {
    async save(input) {
      saveCalls.push(input);
      if (!outcome.ok) throw outcome.error;
      return {
        save_id: outcome.save_id,
        name: outcome.name,
        created_at: outcome.created_at,
      };
    },
    async restore(input) {
      restoreCalls.push(input);
      throw new Error('not used');
    },
  };
  return { svc, saveCalls, restoreCalls };
}

/* ---------- tests ---------- */

describe('handleSave', () => {
  const ROOM = 'room-A';
  const PH = 'ph-id';
  const COHOST = 'cohost-id';
  const ENTRANT = 'entrant-id';
  const ALICE = 'alice-id';

  let conns: ReturnType<typeof fakeConnections>;
  let participants: ParticipantsRepository;
  let ws: FakeSocket;

  beforeEach(() => {
    conns = fakeConnections();
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
    msg: Extract<ClientMsg, { kind: 'save' }> = { kind: 'save' }
  ): Promise<void> {
    const deps: SaveDeps = {
      participants,
      connections: conns.mgr,
      saveService: svc,
    };
    await handleSave(
      deps,
      ws as unknown as import('ws').WebSocket,
      { participant_id: actorId, room_id: ROOM },
      msg
    );
  }

  /* ---- happy paths ---- */

  it('primary_host save: broadcasts save_created to room; no error to sender', async () => {
    const { svc, saveCalls } = fakeSaveService({
      ok: true,
      save_id: 's-1',
      name: 'zork — T3 — 2026-04-21T00:00:00.000Z',
      created_at: '2026-04-21T00:00:00.000Z',
    });

    await invoke(PH, svc);

    expect(saveCalls).toEqual([{ room_id: ROOM, actor_id: PH }]);
    expect(conns.calls).toEqual([
      {
        room_id: ROOM,
        msg: {
          kind: 'save_created',
          save_id: 's-1',
          name: 'zork — T3 — 2026-04-21T00:00:00.000Z',
          actor_id: PH,
          ts: '2026-04-21T00:00:00.000Z',
        },
      },
    ]);
    expect(ws.sent).toEqual([]);
  });

  it('co_host save: broadcasts save_created', async () => {
    const { svc } = fakeSaveService({
      ok: true,
      save_id: 's-2',
      name: 'n',
      created_at: 't',
    });
    await invoke(COHOST, svc);
    expect(conns.calls.length).toBe(1);
    expect(conns.calls[0]!.msg).toMatchObject({
      kind: 'save_created',
      actor_id: COHOST,
      save_id: 's-2',
    });
  });

  it('command_entrant save: broadcasts save_created', async () => {
    const { svc } = fakeSaveService({
      ok: true,
      save_id: 's-3',
      name: 'n',
      created_at: 't',
    });
    await invoke(ENTRANT, svc);
    expect(conns.calls.length).toBe(1);
    expect(conns.calls[0]!.msg).toMatchObject({
      kind: 'save_created',
      actor_id: ENTRANT,
    });
  });

  /* ---- authority rejections ---- */

  it('Participant save: insufficient_authority to sender, no broadcast, no service call', async () => {
    const { svc, saveCalls } = fakeSaveService({
      ok: true,
      save_id: 'x',
      name: 'x',
      created_at: 'x',
    });
    await invoke(ALICE, svc);

    expect(ws.sent).toEqual([
      {
        kind: 'error',
        code: 'insufficient_authority',
        detail: 'save requires command_entrant, co_host, or primary_host tier',
      },
    ]);
    expect(conns.calls).toEqual([]);
    expect(saveCalls).toEqual([]);
  });

  it('muted sender: muted error, no broadcast, no service call', async () => {
    const { svc, saveCalls } = fakeSaveService({
      ok: true,
      save_id: 'x',
      name: 'x',
      created_at: 'x',
    });
    await invoke('muted-ph', svc);

    expect(ws.sent.length).toBe(1);
    expect(ws.sent[0]!.kind).toBe('error');
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe('muted');
    expect(conns.calls).toEqual([]);
    expect(saveCalls).toEqual([]);
  });

  it('unknown sender: unknown_participant error, no broadcast, no service call', async () => {
    const { svc, saveCalls } = fakeSaveService({
      ok: true,
      save_id: 'x',
      name: 'x',
      created_at: 'x',
    });
    await invoke('ghost-id', svc);

    expect(ws.sent.length).toBe(1);
    expect((ws.sent[0] as Extract<ServerMsg, { kind: 'error' }>).code).toBe(
      'unknown_participant'
    );
    expect(conns.calls).toEqual([]);
    expect(saveCalls).toEqual([]);
  });

  /* ---- service failures ---- */

  it('SaveServiceError is forwarded by code to sender; no broadcast', async () => {
    const { svc } = fakeSaveService({
      ok: false,
      error: new SaveServiceError('sandbox_timeout', 'SAVE timed out'),
    });
    await invoke(PH, svc);

    expect(ws.sent).toEqual([
      { kind: 'error', code: 'sandbox_timeout', detail: 'SAVE timed out' },
    ]);
    expect(conns.calls).toEqual([]);
  });

  it('sandbox_error is forwarded by code with its detail', async () => {
    const { svc } = fakeSaveService({
      ok: false,
      error: new SaveServiceError('sandbox_error', 'disk full'),
    });
    await invoke(PH, svc);

    expect(ws.sent).toEqual([
      { kind: 'error', code: 'sandbox_error', detail: 'disk full' },
    ]);
    expect(conns.calls).toEqual([]);
  });

  it('non-SaveServiceError throw is wrapped as save_failed', async () => {
    const { svc } = fakeSaveService({
      ok: false,
      error: new Error('db corrupt'),
    });
    await invoke(PH, svc);

    expect(ws.sent).toEqual([
      { kind: 'error', code: 'save_failed', detail: 'db corrupt' },
    ]);
    expect(conns.calls).toEqual([]);
  });

  it('persistence_failure broadcasts to the room (N-2); nothing is sent to sender only', async () => {
    const { svc } = fakeSaveService({
      ok: false,
      error: new SaveServiceError('persistence_failure', 'disk full'),
    });
    await invoke(PH, svc);

    // Sender receives nothing direct — the broadcast reaches them via the room.
    expect(ws.sent).toEqual([]);
    // Room-wide broadcast with the canonical wording from ADR-153.
    expect(conns.calls).toEqual([
      {
        room_id: 'room-A',
        msg: {
          kind: 'error',
          code: 'persistence_failure',
          detail: 'The session log could not be written. The action has been rolled back.',
        },
      },
    ]);
  });
});
