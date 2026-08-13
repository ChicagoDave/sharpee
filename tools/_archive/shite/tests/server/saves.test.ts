/**
 * @module tests/server/saves.test
 * @purpose Behavior tests for Phase 4b named-save routes:
 *   - `POST /rooms/:id/saves` — body validation, atTurn default,
 *     atTurn validation, room-not-found, no-turns-yet.
 *   - `GET /rooms/:id/saves` — list ordering, room-not-found.
 *   - No `DELETE` route exists (policy: room owns save lifecycle).
 *
 * @owner Zifmia server tests.
 *
 * Behavior Statement (rule 12):
 *  - DOES — `POST /rooms/:id/saves {label}` creates a named_saves row
 *    pointing at the latest save_blob's turn and returns it (201).
 *  - DOES — `POST /rooms/:id/saves {label, atTurn}` pins to that turn
 *    iff a save_blob exists for it; rejects otherwise.
 *  - DOES — `GET /rooms/:id/saves` returns the room's named saves,
 *    newest first.
 *  - REJECTS WHEN — body malformed (400 invalid_body); label empty /
 *    over-80 / non-string (400 invalid_body); atTurn non-integer or
 *    < 1 (400 invalid_body); room not found (404 room_not_found);
 *    no save_blob at atTurn (400 turn_not_saved); no turns at all
 *    with atTurn omitted (400 no_turns_yet); missing auth (401).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import { clearStoryCacheForTests } from '../../src/engine/bundle-loader';
import {
  buildTinyFixtureBundle,
  tinyFixtureConfig,
} from '../fixtures/build-bundle';

interface TestCtx {
  handle: ZifmiaServerHandle;
  baseUrl: string;
  token: string;
  identityId: string;
  identityHandle: string;
  roomId: string;
  emptyRoomId: string;
}

async function setup(): Promise<TestCtx> {
  clearStoryCacheForTests();
  const handle = await startServer({
    adapter: new SqliteAdapter({ filename: ':memory:' }),
    port: 0,
    host: '127.0.0.1',
    packageVersion: '0.1.0-test',
  });
  const baseUrl = `http://127.0.0.1:${handle.port}`;

  const reg = await fetch(`${baseUrl}/identity/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: 'saves-tester', passcode: 'a valid passcode' }),
  });
  const regBody = (await reg.json()) as {
    id: string;
    handle: string;
    sessionToken: string;
  };

  await handle.adapter.installStoryBundle({
    storyId: tinyFixtureConfig.id,
    version: tinyFixtureConfig.version,
    ifid: 'TEST-FIXTURE-0001',
    title: tinyFixtureConfig.title,
    installedBy: regBody.id,
    bundle: await buildTinyFixtureBundle(),
  });

  const room = await handle.adapter.createRoom({
    storyId: tinyFixtureConfig.id,
    bundleVersion: tinyFixtureConfig.version,
    title: 'Saves test room',
    public: true,
    createdBy: regBody.id,
  });
  const empty = await handle.adapter.createRoom({
    storyId: tinyFixtureConfig.id,
    bundleVersion: tinyFixtureConfig.version,
    title: 'Saves test empty room',
    public: true,
    createdBy: regBody.id,
  });

  return {
    handle,
    baseUrl,
    token: regBody.sessionToken,
    identityId: regBody.id,
    identityHandle: regBody.handle,
    roomId: room.id,
    emptyRoomId: empty.id,
  };
}

async function postCommand(ctx: TestCtx, command: string): Promise<void> {
  const res = await fetch(`${ctx.baseUrl}/rooms/${ctx.roomId}/command`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${ctx.token}`,
    },
    body: JSON.stringify({ command }),
  });
  if (res.status !== 200) {
    throw new Error(`postCommand: status ${res.status}: ${await res.text()}`);
  }
  await res.json();
}

async function postSave(
  ctx: TestCtx,
  roomId: string,
  body: unknown,
  opts: { auth?: boolean } = {},
): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.auth !== false) headers.authorization = `Bearer ${ctx.token}`;
  return fetch(`${ctx.baseUrl}/rooms/${roomId}/saves`, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function getSaves(
  ctx: TestCtx,
  roomId: string,
  opts: { auth?: boolean } = {},
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.auth !== false) headers.authorization = `Bearer ${ctx.token}`;
  return fetch(`${ctx.baseUrl}/rooms/${roomId}/saves`, { headers });
}

describe('POST /rooms/:id/saves', () => {
  let ctx: TestCtx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('creates a named save at the latest turn when atTurn is omitted', async () => {
    await postCommand(ctx, 'look');
    await postCommand(ctx, 'look');

    const res = await postSave(ctx, ctx.roomId, { label: 'before puzzle' });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      saveId: string;
      roomId: string;
      atTurn: number;
      label: string;
      createdBy: string;
      createdAt: number;
    };
    expect(body.saveId).toMatch(/.+/);
    expect(body.roomId).toBe(ctx.roomId);
    expect(body.atTurn).toBe(2);
    expect(body.label).toBe('before puzzle');
    expect(body.createdBy).toBe(ctx.identityId);
    expect(typeof body.createdAt).toBe('number');

    // State actually persisted in the adapter.
    const persisted = await ctx.handle.adapter.getNamedSave(body.saveId);
    expect(persisted).not.toBeNull();
    expect(persisted!.atTurn).toBe(2);
    expect(persisted!.label).toBe('before puzzle');
  });

  it('trims whitespace from the label', async () => {
    await postCommand(ctx, 'look');
    const res = await postSave(ctx, ctx.roomId, { label: '  midpoint  ' });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { label: string };
    expect(body.label).toBe('midpoint');
  });

  it('pins to an explicit atTurn when a save_blob exists for it', async () => {
    await postCommand(ctx, 'look');
    await postCommand(ctx, 'look');
    await postCommand(ctx, 'look');

    const res = await postSave(ctx, ctx.roomId, { label: 'turn-2 pin', atTurn: 2 });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { atTurn: number };
    expect(body.atTurn).toBe(2);
  });

  it('rejects atTurn pointing at a turn with no save_blob', async () => {
    await postCommand(ctx, 'look');
    const res = await postSave(ctx, ctx.roomId, { label: 'too far', atTurn: 99 });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('turn_not_saved');

    // No row should have been persisted.
    const saves = await ctx.handle.adapter.listNamedSaves(ctx.roomId);
    expect(saves).toEqual([]);
  });

  it('rejects atTurn omitted on a room with zero turns', async () => {
    const res = await postSave(ctx, ctx.emptyRoomId, { label: 'cant save yet' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('no_turns_yet');
  });

  it('rejects malformed bodies', async () => {
    await postCommand(ctx, 'look');

    for (const bad of [
      { /* no label */ },
      { label: '' },
      { label: '   ' },
      { label: 'a'.repeat(81) },
      { label: 42 },
      { label: 'ok', atTurn: 'two' },
      { label: 'ok', atTurn: 0 },
      { label: 'ok', atTurn: -1 },
      { label: 'ok', atTurn: 1.5 },
      '"not an object"',
    ]) {
      const res = await postSave(ctx, ctx.roomId, bad as unknown);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('invalid_body');
    }

    const saves = await ctx.handle.adapter.listNamedSaves(ctx.roomId);
    expect(saves).toEqual([]);
  });

  it('returns 404 for an unknown room', async () => {
    const res = await postSave(ctx, 'no-such-room', { label: 'ghost' });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('room_not_found');
  });

  it('returns 401 without a session token', async () => {
    const res = await postSave(ctx, ctx.roomId, { label: 'anon' }, { auth: false });
    expect(res.status).toBe(401);
  });
});

describe('GET /rooms/:id/saves', () => {
  let ctx: TestCtx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('returns the room\'s named saves, newest first', async () => {
    await postCommand(ctx, 'look');
    await postCommand(ctx, 'look');

    await postSave(ctx, ctx.roomId, { label: 'first', atTurn: 1 });
    // The adapter orders named_saves by `created_at DESC`. Without a
    // distinct-millisecond gap between these two POSTs, the order is
    // not deterministic when `Date.now()` ties (observed under load
    // when the integration suite runs ahead of this one).
    await new Promise((r) => setTimeout(r, 5));
    await postSave(ctx, ctx.roomId, { label: 'second' });

    const res = await getSaves(ctx, ctx.roomId);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ label: string; atTurn: number }>;
    expect(body.map((s) => s.label)).toEqual(['second', 'first']);
    expect(body[0].atTurn).toBe(2);
    expect(body[1].atTurn).toBe(1);
  });

  it('returns an empty array for a room with no named saves', async () => {
    const res = await getSaves(ctx, ctx.roomId);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns 404 for an unknown room', async () => {
    const res = await getSaves(ctx, 'no-such-room');
    expect(res.status).toBe(404);
  });

  it('returns 401 without a session token', async () => {
    const res = await getSaves(ctx, ctx.roomId, { auth: false });
    expect(res.status).toBe(401);
  });
});

describe('Named saves do not have a DELETE endpoint (policy)', () => {
  let ctx: TestCtx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('DELETE /rooms/:id/saves/:saveId returns 404 (route not registered)', async () => {
    await postCommand(ctx, 'look');
    const createRes = await postSave(ctx, ctx.roomId, { label: 'a save' });
    const { saveId } = (await createRes.json()) as { saveId: string };

    const delRes = await fetch(
      `${ctx.baseUrl}/rooms/${ctx.roomId}/saves/${saveId}`,
      {
        method: 'DELETE',
        headers: { authorization: `Bearer ${ctx.token}` },
      },
    );
    expect(delRes.status).toBe(404);

    // The save row is still present.
    const persisted = await ctx.handle.adapter.getNamedSave(saveId);
    expect(persisted).not.toBeNull();
  });
});
