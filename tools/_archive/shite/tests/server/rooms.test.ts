/**
 * @module tests/server/rooms.test
 * @purpose Behavior tests for `POST /rooms`, `GET /rooms`,
 *   `GET /rooms/:id/state` (stub). Confirms auth gating, story-library
 *   validation (404 when no active version), and the public-lobby
 *   filter on listing.
 * @owner Zifmia server (tools/zifmia/tests/server).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import type { Room } from '../../src/storage/types';
import {
  buildTinyFixtureBundle,
  tinyFixtureConfig
} from '../fixtures/build-bundle';
import {
  clearStoryCacheForTests,
  clearManifestCacheForTests
} from '../../src/engine';

interface TestContext {
  handle: ZifmiaServerHandle;
  baseUrl: string;
  sessionToken: string;
  identityId: string;
}

async function seedIdentityAndLogin(
  handle: ZifmiaServerHandle,
  userHandle: string = 'creator'
): Promise<{ sessionToken: string; identityId: string }> {
  const res = await fetch(`http://127.0.0.1:${handle.port}/identity/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: userHandle, passcode: 'a valid passcode' })
  });
  const body = (await res.json()) as { id: string; sessionToken: string };
  return { sessionToken: body.sessionToken, identityId: body.id };
}

async function seedStory(
  handle: ZifmiaServerHandle,
  identityId: string,
  storyId: string,
  version: string = '1.0.0'
): Promise<void> {
  await handle.adapter.installStoryBundle({
    storyId,
    version,
    ifid: `IFID-${storyId}`,
    title: `Story ${storyId}`,
    installedBy: identityId,
    bundle: new Uint8Array([0])
  });
}

async function setup(): Promise<TestContext> {
  const handle = await startServer({
    adapter: new SqliteAdapter({ filename: ':memory:' }),
    port: 0,
    host: '127.0.0.1',
    packageVersion: '0.1.0-test'
  });
  const { sessionToken, identityId } = await seedIdentityAndLogin(handle);
  return {
    handle,
    baseUrl: `http://127.0.0.1:${handle.port}`,
    sessionToken,
    identityId
  };
}

describe('POST /rooms', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('creates a room pinned to the latest active bundle version', async () => {
    // Install two versions; latest installed should be picked.
    await seedStory(ctx.handle, ctx.identityId, 'story-A', '1.0.0');
    await seedStory(ctx.handle, ctx.identityId, 'story-A', '1.1.0');

    const res = await fetch(`${ctx.baseUrl}/rooms`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ctx.sessionToken}`
      },
      body: JSON.stringify({
        storyId: 'story-A',
        title: 'My Room',
        public: true
      })
    });
    expect(res.status).toBe(201);
    const room = (await res.json()) as Room;
    expect(room.storyId).toBe('story-A');
    expect(room.bundleVersion).toBe('1.1.0');
    expect(room.title).toBe('My Room');
    expect(room.public).toBe(true);
    expect(room.createdBy).toBe(ctx.identityId);

    // Persisted in DB.
    const stored = await ctx.handle.adapter.getRoom(room.id);
    expect(stored).not.toBeNull();
    expect(stored?.bundleVersion).toBe('1.1.0');
  });

  it('defaults `public` to true when omitted', async () => {
    await seedStory(ctx.handle, ctx.identityId, 'story-B');
    const res = await fetch(`${ctx.baseUrl}/rooms`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ctx.sessionToken}`
      },
      body: JSON.stringify({ storyId: 'story-B', title: 'Default Visibility' })
    });
    expect(res.status).toBe(201);
    expect(((await res.json()) as Room).public).toBe(true);
  });

  it('returns 404 story_not_found when storyId has no active version', async () => {
    const res = await fetch(`${ctx.baseUrl}/rooms`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ctx.sessionToken}`
      },
      body: JSON.stringify({ storyId: 'no-such-story', title: 'Phantom' })
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'story_not_found' });
  });

  it('returns 401 unauthenticated without bearer token', async () => {
    const res = await fetch(`${ctx.baseUrl}/rooms`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ storyId: 'story-A', title: 'Anon Room' })
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 on malformed body', async () => {
    const res = await fetch(`${ctx.baseUrl}/rooms`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ctx.sessionToken}`
      },
      body: JSON.stringify({ storyId: '!!!', title: '' })
    });
    expect(res.status).toBe(400);
  });

  it('Phase 5b: appends a room.create audit row on successful create', async () => {
    await seedStory(ctx.handle, ctx.identityId, 'story-audit', '2.0.0');

    const res = await fetch(`${ctx.baseUrl}/rooms`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ctx.sessionToken}`
      },
      body: JSON.stringify({
        storyId: 'story-audit',
        title: 'Audited Room',
        public: false
      })
    });
    expect(res.status).toBe(201);
    const room = (await res.json()) as Room;

    const entries = await ctx.handle.adapter.listAuditEntries({ limit: 100 });
    const creates = entries.filter((e) => e.action === 'room.create');
    expect(creates).toHaveLength(1);

    const entry = creates[0]!;
    expect(entry.actorId).toBe(ctx.identityId);
    expect(entry.targetKind).toBe('room');
    expect(entry.targetId).toBe(room.id);

    const detail = JSON.parse(entry.detail) as {
      roomId: string;
      storyId: string;
      bundleVersion: string;
      title: string;
      public: boolean;
    };
    expect(detail).toEqual({
      roomId: room.id,
      storyId: 'story-audit',
      bundleVersion: '2.0.0',
      title: 'Audited Room',
      public: false
    });
  });

  it('Phase 5b: writes no audit row on validation 400 (no room created)', async () => {
    const res = await fetch(`${ctx.baseUrl}/rooms`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ctx.sessionToken}`
      },
      body: JSON.stringify({ storyId: '', title: '', public: true })
    });
    expect(res.status).toBe(400);
    const entries = await ctx.handle.adapter.listAuditEntries({ limit: 100 });
    expect(entries.filter((e) => e.action === 'room.create')).toEqual([]);
  });

  it('Phase 5b: writes no audit row on story_not_found 404', async () => {
    const res = await fetch(`${ctx.baseUrl}/rooms`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ctx.sessionToken}`
      },
      body: JSON.stringify({
        storyId: 'no-such-story',
        title: 'Doomed Room',
        public: true
      })
    });
    expect(res.status).toBe(404);
    const entries = await ctx.handle.adapter.listAuditEntries({ limit: 100 });
    expect(entries.filter((e) => e.action === 'room.create')).toEqual([]);
  });
});

describe('GET /rooms', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('returns only public + open rooms (private filtered out)', async () => {
    await seedStory(ctx.handle, ctx.identityId, 'story-C');

    // Public room.
    const pub = await ctx.handle.adapter.createRoom({
      storyId: 'story-C',
      bundleVersion: '1.0.0',
      title: 'Public',
      public: true,
      createdBy: ctx.identityId
    });
    // Private room.
    const priv = await ctx.handle.adapter.createRoom({
      storyId: 'story-C',
      bundleVersion: '1.0.0',
      title: 'Private',
      public: false,
      createdBy: ctx.identityId
    });

    const res = await fetch(`${ctx.baseUrl}/rooms`);
    expect(res.status).toBe(200);
    const list = (await res.json()) as Room[];
    const ids = list.map((r) => r.id);
    expect(ids).toContain(pub.id);
    expect(ids).not.toContain(priv.id);
  });

  it('does not require auth (public lobby)', async () => {
    const res = await fetch(`${ctx.baseUrl}/rooms`);
    expect(res.status).toBe(200);
  });

  it('excludes closed rooms', async () => {
    await seedStory(ctx.handle, ctx.identityId, 'story-D');
    const room = await ctx.handle.adapter.createRoom({
      storyId: 'story-D',
      bundleVersion: '1.0.0',
      title: 'Will Close',
      public: true,
      createdBy: ctx.identityId
    });
    await ctx.handle.adapter.closeRoom(room.id);

    const res = await fetch(`${ctx.baseUrl}/rooms`);
    const list = (await res.json()) as Room[];
    expect(list.map((r) => r.id)).not.toContain(room.id);
  });
});

describe('GET /rooms/:id/state (stub for Phase 3b)', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('returns cmgt + empty transcript for an existing room with a real bundle', async () => {
    // Phase 6c-server: state route now loads the bundle to capture
    // the engine's `channel:manifest` emit, so the test needs a real
    // (zip-parseable) fixture rather than the `Uint8Array([0])` stub
    // the other rooms tests use.
    clearStoryCacheForTests();
    clearManifestCacheForTests();
    await ctx.handle.adapter.installStoryBundle({
      storyId: tinyFixtureConfig.id,
      version: tinyFixtureConfig.version,
      ifid: 'IFID-STATE-TEST',
      title: tinyFixtureConfig.title,
      installedBy: ctx.identityId,
      bundle: await buildTinyFixtureBundle()
    });
    const room = await ctx.handle.adapter.createRoom({
      storyId: tinyFixtureConfig.id,
      bundleVersion: tinyFixtureConfig.version,
      title: 'State Test',
      public: true,
      createdBy: ctx.identityId
    });

    const res = await fetch(`${ctx.baseUrl}/rooms/${room.id}/state`, {
      headers: { authorization: `Bearer ${ctx.sessionToken}` }
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      cmgt: { kind: string; protocol_version: number; channels: unknown[] };
      transcript: unknown[];
      currentValues: Record<string, unknown>;
    };
    expect(body.cmgt.kind).toBe('cmgt');
    expect(body.cmgt.protocol_version).toBe(1);
    expect(Array.isArray(body.cmgt.channels)).toBe(true);
    expect(body.cmgt.channels.length).toBeGreaterThan(0);
    expect(body.transcript).toEqual([]);
    expect(body.currentValues).toEqual({});

    // captureRoomManifest caches per (storyId, version). A second call
    // on the same room must return an identical manifest; a third call
    // on a SEPARATE room pinned to the same bundle must reuse the
    // cached entry (no cache-key crosstalk).
    const res2 = await fetch(`${ctx.baseUrl}/rooms/${room.id}/state`, {
      headers: { authorization: `Bearer ${ctx.sessionToken}` }
    });
    expect(res2.status).toBe(200);
    const body2 = (await res2.json()) as { cmgt: unknown };
    expect(body2.cmgt).toEqual(body.cmgt);

    const sibling = await ctx.handle.adapter.createRoom({
      storyId: tinyFixtureConfig.id,
      bundleVersion: tinyFixtureConfig.version,
      title: 'Sibling Room',
      public: true,
      createdBy: ctx.identityId
    });
    const res3 = await fetch(`${ctx.baseUrl}/rooms/${sibling.id}/state`, {
      headers: { authorization: `Bearer ${ctx.sessionToken}` }
    });
    expect(res3.status).toBe(200);
    const body3 = (await res3.json()) as { cmgt: unknown };
    expect(body3.cmgt).toEqual(body.cmgt);
  });

  it('returns 404 room_not_found for unknown room', async () => {
    const res = await fetch(`${ctx.baseUrl}/rooms/not-a-real-id/state`, {
      headers: { authorization: `Bearer ${ctx.sessionToken}` }
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'room_not_found' });
  });

  it('returns 401 unauthenticated without bearer token', async () => {
    const res = await fetch(`${ctx.baseUrl}/rooms/any-id/state`);
    expect(res.status).toBe(401);
  });
});
