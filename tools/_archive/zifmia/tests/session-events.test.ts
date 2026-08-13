/**
 * Session-events tests: repository semantics + auto-persistence on
 * chat / command / role_change / lifecycle paths. REAL-PATH against
 * `:memory:` SQLite + Fastify+WS.
 */

import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import {
  startBoundServer,
  openSocket,
  claim,
  createRoom,
  joinRoom,
  type BoundServer,
  type TestSocket
} from './ws-helpers.js';

const STORIES = [{ slug: 'dungeo', path: '/fake/dungeo.sharpee' }] as const;

async function helloAndDrainPresence(sock: TestSocket, roomId: string, handle: string): Promise<string> {
  sock.send({ type: 'hello', roomId, handle });
  const ack = await sock.recv();
  if (ack.type !== 'hello:ack') throw new Error('expected hello:ack');
  await sock.recvWhere((f) => f.type === 'presence' && f.connected === true && f.participantId === ack.participantId);
  return ack.participantId;
}

describe('session_events auto-persistence (REAL-PATH)', () => {
  let bound: BoundServer;

  beforeEach(async () => {
    bound = await startBoundServer({
      dbFile: ':memory:',
      stories: STORIES,
      helloTimeoutMs: 5000,
      lockExpiryMs: 500,
      recycleManualOnly: true
    });
  });

  afterEach(async () => {
    await bound.close();
  });

  it('room creation appends a lifecycle row', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    const events = bound.server.sessionEvents.listByRoom(room.id);
    expect(events.some((e) => e.kind === 'lifecycle' && (e.payload as { event: string }).event === 'room_created')).toBe(true);
  });

  it('join appends a join row', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    const joinEvents = bound.server.sessionEvents.listByRoom(room.id, { kinds: ['join'] });
    expect(joinEvents).toHaveLength(1);
    expect((joinEvents[0].payload as { handle: string }).handle).toBe('bob');
  });

  it('chat:send over WS appends a chat row', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    const sock = await openSocket(bound.wsBase, room.id);
    await helloAndDrainPresence(sock, room.id, 'alice');
    sock.send({ type: 'chat:send', roomId: room.id, text: 'hi' });
    await sock.recvWhere((f) => f.type === 'chat:message');

    const chats = bound.server.sessionEvents.listByRoom(room.id, { kinds: ['chat'] });
    expect(chats).toHaveLength(1);
    const payload = chats[0].payload as { text: string; fromHandle: string };
    expect(payload.text).toBe('hi');
    expect(payload.fromHandle).toBe('alice');
    sock.close();
  });

  it('POST /command appends a command row carrying { turnId, text }', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');

    const res = await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/command`,
      payload: { handle: 'alice', text: 'look' }
    });
    expect(res.statusCode).toBe(200);
    const turnId = (res.json() as { turnId: string }).turnId;

    const cmds = bound.server.sessionEvents.listByRoom(room.id, { kinds: ['command'] });
    expect(cmds).toHaveLength(1);
    const payload = cmds[0].payload as { turnId: string; text: string };
    expect(payload.turnId).toBe(turnId);
    expect(payload.text).toBe('look');
  });

  it('promote / demote append role_change + nominate-successor appends nominated_successor', async () => {
    await claim(bound.server, 'alice');
    await claim(bound.server, 'bob');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    await joinRoom(bound.server, 'bob', room.id);

    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/nominate-successor`,
      payload: { handle: 'alice', target: 'bob' }
    });
    await bound.server.app.inject({
      method: 'POST',
      url: `/api/rooms/${room.id}/promote`,
      payload: { handle: 'alice', target: 'bob', to_tier: 'co_host' }
    });

    const noms = bound.server.sessionEvents.listByRoom(room.id, { kinds: ['nominated_successor'] });
    expect(noms).toHaveLength(1);
    const roles = bound.server.sessionEvents.listByRoom(room.id, { kinds: ['role_change'] });
    expect(roles).toHaveLength(1);
    const payload = roles[0].payload as { direction: string; to_tier: string };
    expect(payload.direction).toBe('promote');
    expect(payload.to_tier).toBe('co_host');
  });

  it('repository list respects kinds filter + limit', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');

    // Append 5 commands.
    for (let i = 0; i < 5; i += 1) {
      bound.server.sessionEvents.append({
        roomId: room.id,
        kind: 'command',
        payload: { turnId: `t${i}`, text: `cmd ${i}` }
      });
    }

    const limited = bound.server.sessionEvents.listByRoom(room.id, { kinds: ['command'], limit: 3 });
    expect(limited).toHaveLength(3);

    const all = bound.server.sessionEvents.listByRoom(room.id, { kinds: ['command'] });
    expect(all).toHaveLength(5);
    expect((all[0].payload as { turnId: string }).turnId).toBe('t0');
    expect((all[4].payload as { turnId: string }).turnId).toBe('t4');
  });

  it('session_events CASCADE on room delete', async () => {
    await claim(bound.server, 'alice');
    const room = await createRoom(bound.server, 'alice', 'dungeo', 'R1');
    bound.server.sessionEvents.append({ roomId: room.id, kind: 'chat', payload: { text: 'x' } });
    expect(bound.server.sessionEvents.countByRoom(room.id)).toBeGreaterThan(0);

    // Force-delete via direct SQL (Phase-6 will add the HTTP route).
    bound.server.db.prepare('DELETE FROM rooms WHERE id = ?').run(room.id);
    expect(bound.server.sessionEvents.countByRoom(room.id)).toBe(0);
  });
});
