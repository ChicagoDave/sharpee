/**
 * @module tests/server/stories.test
 * @purpose Behavior tests for `GET /stories` (public). Confirms:
 *   no-auth access; empty library returns `{stories: []}`; lists
 *   one entry per storyId at its most-recent installed version;
 *   filters out stories whose every version is inactive;
 *   sort order is title-alphabetical (deterministic dropdown).
 * @owner Zifmia server tests.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';

interface TestContext {
  handle: ZifmiaServerHandle;
  baseUrl: string;
  identityId: string;
}

async function seedIdentity(handle: ZifmiaServerHandle): Promise<string> {
  const res = await fetch(`http://127.0.0.1:${handle.port}/identity/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: 'installer', passcode: 'long enough passcode' })
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function installStory(
  handle: ZifmiaServerHandle,
  installedBy: string,
  storyId: string,
  title: string,
  version: string
): Promise<void> {
  await handle.adapter.installStoryBundle({
    storyId,
    version,
    ifid: `IFID-${storyId}`,
    title,
    installedBy,
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
  const identityId = await seedIdentity(handle);
  return {
    handle,
    baseUrl: `http://127.0.0.1:${handle.port}`,
    identityId
  };
}

describe('GET /stories', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('returns 200 with empty list when no stories installed', async () => {
    const res = await fetch(`${ctx.baseUrl}/stories`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stories: unknown[] };
    expect(body).toEqual({ stories: [] });
  });

  it('is unauthenticated — succeeds with no Authorization header', async () => {
    await installStory(ctx.handle, ctx.identityId, 'zork', 'Zork', '1.0.0');
    const res = await fetch(`${ctx.baseUrl}/stories`);
    expect(res.status).toBe(200);
  });

  it('lists one entry per storyId with storyId, title, version', async () => {
    await installStory(ctx.handle, ctx.identityId, 'zork', 'Zork', '1.0.0');
    await installStory(
      ctx.handle,
      ctx.identityId,
      'dungeo',
      'Dungeo',
      '0.5.0'
    );
    const res = await fetch(`${ctx.baseUrl}/stories`);
    const body = (await res.json()) as {
      stories: Array<{ storyId: string; title: string; version: string }>;
    };
    expect(body.stories).toHaveLength(2);
    const ids = body.stories.map((s) => s.storyId);
    expect(ids).toContain('zork');
    expect(ids).toContain('dungeo');
    const zork = body.stories.find((s) => s.storyId === 'zork');
    expect(zork).toEqual({ storyId: 'zork', title: 'Zork', version: '1.0.0' });
  });

  it('collapses multi-version storyIds to the most-recently-installed version', async () => {
    await installStory(ctx.handle, ctx.identityId, 'zork', 'Zork', '1.0.0');
    await new Promise((r) => setTimeout(r, 2));
    await installStory(ctx.handle, ctx.identityId, 'zork', 'Zork', '1.0.1');
    const res = await fetch(`${ctx.baseUrl}/stories`);
    const body = (await res.json()) as {
      stories: Array<{ storyId: string; version: string }>;
    };
    expect(body.stories).toHaveLength(1);
    expect(body.stories[0]).toMatchObject({
      storyId: 'zork',
      version: '1.0.1'
    });
  });

  it('omits stories whose every version is inactive (removed)', async () => {
    await installStory(ctx.handle, ctx.identityId, 'zork', 'Zork', '1.0.0');
    await installStory(
      ctx.handle,
      ctx.identityId,
      'dungeo',
      'Dungeo',
      '0.5.0'
    );
    await ctx.handle.adapter.removeStory('zork');
    const res = await fetch(`${ctx.baseUrl}/stories`);
    const body = (await res.json()) as {
      stories: Array<{ storyId: string }>;
    };
    const ids = body.stories.map((s) => s.storyId);
    expect(ids).toEqual(['dungeo']);
  });

  it('sorts results title-alphabetically for deterministic dropdown order', async () => {
    await installStory(ctx.handle, ctx.identityId, 'zork', 'Zork', '1.0.0');
    await installStory(
      ctx.handle,
      ctx.identityId,
      'aardvark',
      'Aardvark',
      '1.0.0'
    );
    await installStory(
      ctx.handle,
      ctx.identityId,
      'middle',
      'Middle',
      '1.0.0'
    );
    const res = await fetch(`${ctx.baseUrl}/stories`);
    const body = (await res.json()) as {
      stories: Array<{ title: string }>;
    };
    expect(body.stories.map((s) => s.title)).toEqual([
      'Aardvark',
      'Middle',
      'Zork'
    ]);
  });
});
