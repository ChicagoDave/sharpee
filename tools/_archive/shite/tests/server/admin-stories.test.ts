/**
 * @module tests/server/admin-stories.test
 * @purpose Behavior tests for the Phase 5c admin story-library
 *   routes — POST/PUT/DELETE/GET /admin/stories. Covers the full
 *   ADR-175 §AC-12 validation matrix (no library row + no blob on any
 *   422 path) plus AC-5 (existing rooms continue after upgrade /
 *   remove).
 * @owner Zifmia server (tools/zifmia/tests/server).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import {
  buildTinyFixtureBundle,
  clearTinyFixtureCacheForTests,
  tinyFixtureConfig,
} from '../fixtures/build-bundle';
import type { StoryLibraryEntry } from '../../src/storage/types';

interface SessionInfo {
  sessionToken: string;
  identityId: string;
}

async function register(
  handle: ZifmiaServerHandle,
  userHandle: string,
): Promise<SessionInfo> {
  const res = await fetch(`http://127.0.0.1:${handle.port}/identity/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: userHandle, passcode: 'a valid passcode' }),
  });
  const body = (await res.json()) as { id: string; sessionToken: string };
  return { sessionToken: body.sessionToken, identityId: body.id };
}

interface Ctx {
  handle: ZifmiaServerHandle;
  baseUrl: string;
  admin: SessionInfo;
  mortal: SessionInfo;
  validBundle: Uint8Array;
}

async function setup(): Promise<Ctx> {
  clearTinyFixtureCacheForTests();
  const handle = await startServer({
    adapter: new SqliteAdapter({ filename: ':memory:' }),
    port: 0,
    host: '127.0.0.1',
    packageVersion: '0.1.0-test',
  });
  const admin = await register(handle, 'overseer');
  const mortal = await register(handle, 'peasant');
  await handle.adapter.setIdentityAdmin(admin.identityId, true);
  const validBundle = await buildTinyFixtureBundle();
  return {
    handle,
    baseUrl: `http://127.0.0.1:${handle.port}`,
    admin,
    mortal,
    validBundle,
  };
}

async function postBundle(
  ctx: Ctx,
  bytes: Uint8Array | null,
  bearer: string | null = ctx.admin.sessionToken,
): Promise<Response> {
  const headers: Record<string, string> = {
    'content-type': 'application/octet-stream',
  };
  if (bearer !== null) headers.authorization = `Bearer ${bearer}`;
  return fetch(`${ctx.baseUrl}/admin/stories`, {
    method: 'POST',
    headers,
    body: bytes ?? new Uint8Array(0),
  });
}

async function putBundle(
  ctx: Ctx,
  storyId: string,
  bytes: Uint8Array,
  bearer: string | null = ctx.admin.sessionToken,
): Promise<Response> {
  const headers: Record<string, string> = {
    'content-type': 'application/octet-stream',
  };
  if (bearer !== null) headers.authorization = `Bearer ${bearer}`;
  return fetch(`${ctx.baseUrl}/admin/stories/${storyId}`, {
    method: 'PUT',
    headers,
    body: bytes,
  });
}

async function deleteStory(
  ctx: Ctx,
  storyId: string,
  bearer: string | null = ctx.admin.sessionToken,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (bearer !== null) headers.authorization = `Bearer ${bearer}`;
  return fetch(`${ctx.baseUrl}/admin/stories/${storyId}`, {
    method: 'DELETE',
    headers,
  });
}

async function getStories(
  ctx: Ctx,
  bearer: string | null = ctx.admin.sessionToken,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (bearer !== null) headers.authorization = `Bearer ${bearer}`;
  return fetch(`${ctx.baseUrl}/admin/stories`, { headers });
}

/** Build a `.sharpee`-shaped zip with a custom meta.json. story.js is
 * a stub since the validator never executes it. */
function brokenBundle(meta: unknown, opts?: { omitStoryJs?: boolean; omitMeta?: boolean }): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  if (!opts?.omitMeta) {
    entries['meta.json'] = new TextEncoder().encode(
      typeof meta === 'string' ? meta : JSON.stringify(meta),
    );
  }
  if (!opts?.omitStoryJs) {
    entries['story.js'] = new TextEncoder().encode('// stub');
  }
  return zipSync(entries);
}

function bundleWith(metaOverrides: Record<string, unknown>): Uint8Array {
  const meta = {
    format: 'sharpee-story',
    formatVersion: 1,
    id: 'override-story',
    title: 'Override Story',
    author: 'tests',
    version: '1.0.0',
    description: '',
    ifid: 'TEST-OVERRIDE-0001',
    hasAssets: false,
    hasTheme: false,
    ...metaOverrides,
  };
  return brokenBundle(meta);
}

describe('POST /admin/stories — auth + admin gating', () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('401 unauthenticated without a bearer token', async () => {
    const res = await postBundle(ctx, ctx.validBundle, null);
    expect(res.status).toBe(401);
  });

  it('403 forbidden for an authenticated non-admin', async () => {
    const res = await postBundle(ctx, ctx.validBundle, ctx.mortal.sessionToken);
    expect(res.status).toBe(403);
  });

  it('400 invalid_body when no bytes are sent', async () => {
    const res = await postBundle(ctx, null);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; detail: string };
    expect(body.error).toBe('invalid_body');
    expect(body.detail).toBe('missing_bundle_bytes');
  });
});

describe('POST /admin/stories — AC-12 validation pipeline (no partial writes)', () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  async function expectFail(bytes: Uint8Array, detail: string): Promise<void> {
    const before = await ctx.handle.adapter.listStories();
    const res = await postBundle(ctx, bytes);
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string; detail: string };
    expect(body.error).toBe('invalid_bundle');
    expect(body.detail).toBe(detail);

    // AC-12 — no library row, no blob added on any failure path.
    const after = await ctx.handle.adapter.listStories();
    expect(after.length).toBe(before.length);
  }

  it('bad_structure: bytes do not unzip', async () => {
    await expectFail(new Uint8Array([1, 2, 3, 4, 5]), 'bad_structure');
  });

  it('bad_structure: zip is missing meta.json', async () => {
    await expectFail(brokenBundle({}, { omitMeta: true }), 'bad_structure');
  });

  it('bad_structure: zip is missing story.js', async () => {
    await expectFail(brokenBundle({ format: 'sharpee-story', id: 'x', version: '1', title: 't', ifid: 'i', formatVersion: 1 }, { omitStoryJs: true }), 'bad_structure');
  });

  it('bad_structure: meta.json is not valid JSON', async () => {
    await expectFail(brokenBundle('{not json'), 'bad_structure');
  });

  it('bad_structure: meta.format is wrong', async () => {
    await expectFail(bundleWith({ format: 'something-else' }), 'bad_structure');
  });

  it('bad_structure: meta.id is missing', async () => {
    await expectFail(bundleWith({ id: undefined }), 'bad_structure');
  });

  it('bad_structure: meta.version is missing', async () => {
    await expectFail(bundleWith({ version: '' }), 'bad_structure');
  });

  it('bad_structure: meta.title is missing', async () => {
    await expectFail(bundleWith({ title: '' }), 'bad_structure');
  });

  it('missing_ifid: meta.ifid is empty string', async () => {
    await expectFail(bundleWith({ ifid: '' }), 'missing_ifid');
  });

  it('missing_ifid: meta.ifid is absent', async () => {
    await expectFail(bundleWith({ ifid: undefined }), 'missing_ifid');
  });

  it('unsupported_format: formatVersion is 2', async () => {
    await expectFail(bundleWith({ formatVersion: 2 }), 'unsupported_format');
  });

  it('unsupported_format: formatVersion is missing', async () => {
    await expectFail(bundleWith({ formatVersion: undefined }), 'unsupported_format');
  });
});

describe('POST /admin/stories — happy path + audit', () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('201 with library entry; persists row + blob; audits story.install', async () => {
    const res = await postBundle(ctx, ctx.validBundle);
    expect(res.status).toBe(201);
    const entry = (await res.json()) as StoryLibraryEntry;
    expect(entry.storyId).toBe(tinyFixtureConfig.id);
    expect(entry.version).toBe(tinyFixtureConfig.version);
    expect(entry.title).toBe(tinyFixtureConfig.title);
    expect(entry.installedBy).toBe(ctx.admin.identityId);
    expect(entry.active).toBe(true);

    const stored = await ctx.handle.adapter.getStoryLibraryEntry(
      tinyFixtureConfig.id,
      tinyFixtureConfig.version,
    );
    expect(stored).not.toBeNull();
    const blob = await ctx.handle.adapter.getStoryBundle(
      tinyFixtureConfig.id,
      tinyFixtureConfig.version,
    );
    expect(blob).not.toBeNull();
    expect(blob!.byteLength).toBe(ctx.validBundle.byteLength);

    const audit = await ctx.handle.adapter.listAuditEntries({ limit: 10 });
    const installs = audit.filter((e) => e.action === 'story.install');
    expect(installs).toHaveLength(1);
    const detail = JSON.parse(installs[0]!.detail) as Record<string, unknown>;
    expect(detail.storyId).toBe(tinyFixtureConfig.id);
    expect(detail.version).toBe(tinyFixtureConfig.version);
    expect(installs[0]!.actorId).toBe(ctx.admin.identityId);
    expect(installs[0]!.targetKind).toBe('story');
    expect(installs[0]!.targetId).toBe(tinyFixtureConfig.id);
  });

  it('409 when the same (storyId, version) is already installed', async () => {
    const first = await postBundle(ctx, ctx.validBundle);
    expect(first.status).toBe(201);

    const second = await postBundle(ctx, ctx.validBundle);
    expect(second.status).toBe(409);
    const body = (await second.json()) as { error: string; detail: string };
    expect(body.error).toBe('invalid_bundle');
    expect(body.detail).toBe('version_already_installed');

    // Still exactly one row + one audit row (the conflict produces no audit).
    const stored = await ctx.handle.adapter.listStories();
    expect(stored.filter((s) => s.storyId === tinyFixtureConfig.id)).toHaveLength(1);
    const audit = await ctx.handle.adapter.listAuditEntries({ limit: 10 });
    expect(audit.filter((e) => e.action === 'story.install')).toHaveLength(1);
  });
});

describe('PUT /admin/stories/:id — upgrade', () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('200 + new version row + audit story.upgrade; old version remains loadable', async () => {
    // Install v1
    expect((await postBundle(ctx, ctx.validBundle)).status).toBe(201);

    // Upload v2 (rebuilt with bumped version)
    const v2 = bundleWith({
      id: tinyFixtureConfig.id,
      version: '2.0.0',
      title: tinyFixtureConfig.title,
      ifid: 'TEST-FIXTURE-V2-0001',
    });
    const res = await putBundle(ctx, tinyFixtureConfig.id, v2);
    expect(res.status).toBe(200);
    const entry = (await res.json()) as StoryLibraryEntry;
    expect(entry.version).toBe('2.0.0');

    // Both versions now in library
    const all = await ctx.handle.adapter.listStories();
    const versions = all
      .filter((s) => s.storyId === tinyFixtureConfig.id)
      .map((s) => s.version)
      .sort();
    expect(versions).toEqual([tinyFixtureConfig.version, '2.0.0'].sort());

    // Old blob still readable (AC-5 — pinned rooms keep working)
    const oldBlob = await ctx.handle.adapter.getStoryBundle(
      tinyFixtureConfig.id,
      tinyFixtureConfig.version,
    );
    expect(oldBlob).not.toBeNull();

    // Audit
    const audit = await ctx.handle.adapter.listAuditEntries({ limit: 10 });
    const upgrades = audit.filter((e) => e.action === 'story.upgrade');
    expect(upgrades).toHaveLength(1);
    const detail = JSON.parse(upgrades[0]!.detail) as { previousVersions: string[]; version: string };
    expect(detail.version).toBe('2.0.0');
    expect(detail.previousVersions).toContain(tinyFixtureConfig.version);
  });

  it('422 story_id_mismatch when bundle.id != :id', async () => {
    expect((await postBundle(ctx, ctx.validBundle)).status).toBe(201);

    const mismatched = bundleWith({
      id: 'a-different-id',
      version: '2.0.0',
      title: 'm',
      ifid: 'TEST-MISMATCH-0001',
    });
    const res = await putBundle(ctx, tinyFixtureConfig.id, mismatched);
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string; detail: string };
    expect(body.error).toBe('invalid_bundle');
    expect(body.detail).toBe('story_id_mismatch');

    // No new row
    const stored = await ctx.handle.adapter.listStories();
    expect(stored.filter((s) => s.storyId === 'a-different-id')).toHaveLength(0);
  });

  it('404 when the storyId has no existing rows', async () => {
    const v2 = bundleWith({
      id: 'never-installed',
      version: '2.0.0',
      title: 'NW',
      ifid: 'TEST-NW-0001',
    });
    const res = await putBundle(ctx, 'never-installed', v2);
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toBe('story_not_found');
  });

  it('409 when (id, version) already exists', async () => {
    expect((await postBundle(ctx, ctx.validBundle)).status).toBe(201);

    const sameVersion = bundleWith({
      id: tinyFixtureConfig.id,
      version: tinyFixtureConfig.version,
      title: 'whatever',
      ifid: 'TEST-DUP-0001',
    });
    const res = await putBundle(ctx, tinyFixtureConfig.id, sameVersion);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toBe('version_already_installed');
  });

  it('403 forbidden for non-admin', async () => {
    const res = await putBundle(ctx, tinyFixtureConfig.id, ctx.validBundle, ctx.mortal.sessionToken);
    expect(res.status).toBe(403);
  });
});

describe('DELETE /admin/stories/:id — soft-remove', () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('204 + sets every version inactive; audit story.remove', async () => {
    expect((await postBundle(ctx, ctx.validBundle)).status).toBe(201);
    const v2 = bundleWith({
      id: tinyFixtureConfig.id,
      version: '2.0.0',
      title: 'T2',
      ifid: 'TEST-V2-DEL-0001',
    });
    expect((await putBundle(ctx, tinyFixtureConfig.id, v2)).status).toBe(200);

    const res = await deleteStory(ctx, tinyFixtureConfig.id);
    expect(res.status).toBe(204);

    const all = await ctx.handle.adapter.listStories();
    const ours = all.filter((s) => s.storyId === tinyFixtureConfig.id);
    expect(ours).toHaveLength(2);
    expect(ours.every((s) => s.active === false)).toBe(true);

    // The blobs are still present (existing rooms keep loading them)
    const blobV1 = await ctx.handle.adapter.getStoryBundle(
      tinyFixtureConfig.id,
      tinyFixtureConfig.version,
    );
    expect(blobV1).not.toBeNull();

    const audit = await ctx.handle.adapter.listAuditEntries({ limit: 10 });
    const removals = audit.filter((e) => e.action === 'story.remove');
    expect(removals).toHaveLength(1);
    const detail = JSON.parse(removals[0]!.detail) as { versionsAffected: string[] };
    expect(detail.versionsAffected.sort()).toEqual([tinyFixtureConfig.version, '2.0.0'].sort());
  });

  it('404 when the storyId is unknown', async () => {
    const res = await deleteStory(ctx, 'never-installed');
    expect(res.status).toBe(404);
  });

  it('AC-5: after removal, POST /rooms blocks new rooms; existing rooms keep their pinned version', async () => {
    expect((await postBundle(ctx, ctx.validBundle)).status).toBe(201);

    // Create a room BEFORE removing — pins to v1.
    const roomRes = await fetch(`${ctx.baseUrl}/rooms`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ctx.admin.sessionToken}`,
      },
      body: JSON.stringify({ storyId: tinyFixtureConfig.id, title: 'Pinned', public: true }),
    });
    expect(roomRes.status).toBe(201);
    const room = (await roomRes.json()) as { id: string; bundleVersion: string };
    expect(room.bundleVersion).toBe(tinyFixtureConfig.version);

    // Remove the story
    expect((await deleteStory(ctx, tinyFixtureConfig.id)).status).toBe(204);

    // Existing room row is unchanged
    const stored = await ctx.handle.adapter.getRoom(room.id);
    expect(stored?.bundleVersion).toBe(tinyFixtureConfig.version);

    // New room creation against the removed story → 404 story_not_found
    // (rooms.ts uses listStories({activeOnly:true}) — removed = excluded)
    const blocked = await fetch(`${ctx.baseUrl}/rooms`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ctx.admin.sessionToken}`,
      },
      body: JSON.stringify({ storyId: tinyFixtureConfig.id, title: 'Doomed', public: true }),
    });
    expect(blocked.status).toBe(404);
  });
});

describe('GET /admin/stories — admin list view', () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('returns an empty list when nothing is installed', async () => {
    const res = await getStories(ctx);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stories: StoryLibraryEntry[] };
    expect(body.stories).toEqual([]);
  });

  it('lists all versions including soft-removed (active=false)', async () => {
    expect((await postBundle(ctx, ctx.validBundle)).status).toBe(201);
    expect((await deleteStory(ctx, tinyFixtureConfig.id)).status).toBe(204);

    const res = await getStories(ctx);
    const body = (await res.json()) as { stories: StoryLibraryEntry[] };
    expect(body.stories).toHaveLength(1);
    expect(body.stories[0]!.active).toBe(false);
  });

  it('403 forbidden for non-admin', async () => {
    const res = await getStories(ctx, ctx.mortal.sessionToken);
    expect(res.status).toBe(403);
  });

  it('401 unauthenticated without a bearer', async () => {
    const res = await getStories(ctx, null);
    expect(res.status).toBe(401);
  });
});
