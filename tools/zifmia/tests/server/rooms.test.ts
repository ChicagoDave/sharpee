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

  it('returns the stub shape for an existing room', async () => {
    await seedStory(ctx.handle, ctx.identityId, 'story-E');
    const room = await ctx.handle.adapter.createRoom({
      storyId: 'story-E',
      bundleVersion: '1.0.0',
      title: 'State Test',
      public: true,
      createdBy: ctx.identityId
    });

    const res = await fetch(`${ctx.baseUrl}/rooms/${room.id}/state`, {
      headers: { authorization: `Bearer ${ctx.sessionToken}` }
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      cmgt: null,
      transcript: [],
      currentValues: {}
    });
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
