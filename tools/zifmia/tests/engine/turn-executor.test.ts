/**
 * @module tests/engine/turn-executor.test
 * @purpose Behavior tests for `executeTurnStatelessly`. Verifies that
 *   each invocation runs a real engine against the room's bundle and
 *   appends the resulting world snapshot as the next save_blob row,
 *   that the second invocation actually restores the prior turn, and
 *   that the executor's rejection paths fire in the documented
 *   conditions.
 *
 * @owner Zifmia server tests.
 *
 * Behavior Statement (rule 12) covered:
 *  - DOES 1 — appends save_blobs row at `(roomId, currentTurn)` carrying
 *    the gzipped JSON `ISaveData` snapshot.
 *  - DOES 2 — returns `{turn, blocks, events}` reflecting the executed
 *    command only (start/restore output is dropped).
 *  - DOES 3 — second invocation restores prior state: turnCount in the
 *    decoded payload advances by 1 each invocation.
 *  - REJECTS — room_not_found / room_closed / bundle_not_installed each
 *    surface as throws from the executor.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { gunzipSync, strFromU8, strToU8 } from 'fflate';
import type { ISaveData } from '@sharpee/core';

import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import { executeTurnStatelessly } from '../../src/engine/turn-executor';
import {
  buildTinyFixtureBundle,
  tinyFixtureConfig,
} from '../fixtures/build-bundle';
import { clearStoryCacheForTests } from '../../src/engine/bundle-loader';

interface TestCtx {
  adapter: SqliteAdapter;
  roomId: string;
  identityId: string;
}

async function setup(): Promise<TestCtx> {
  const adapter = new SqliteAdapter({ filename: ':memory:' });
  await adapter.migrate();

  const identity = await adapter.createIdentity({
    handle: 'tester',
    passcodeHash: 'scrypt$32768$8$1$abc$def',
  });

  const bundle = await buildTinyFixtureBundle();
  await adapter.installStoryBundle({
    storyId: tinyFixtureConfig.id,
    version: tinyFixtureConfig.version,
    ifid: 'TEST-FIXTURE-0001',
    title: tinyFixtureConfig.title,
    installedBy: identity.id,
    bundle,
  });

  const room = await adapter.createRoom({
    storyId: tinyFixtureConfig.id,
    bundleVersion: tinyFixtureConfig.version,
    title: 'Turn-Executor Test Room',
    public: true,
    createdBy: identity.id,
  });

  return { adapter, roomId: room.id, identityId: identity.id };
}

function decodePayload(payload: Uint8Array): ISaveData {
  return JSON.parse(strFromU8(gunzipSync(payload))) as ISaveData;
}

/**
 * The engine's `worldSnapshot` is base64(gzip(JSON of world.toJSON())).
 * Decode it so tests can assert on actual spatial-index state — the
 * only way to prove restore really loaded the prior world and not just
 * advanced a turn counter on a fresh engine.
 */
function decodeWorldSnapshot(saveData: ISaveData): {
  entities: Array<{ id: string; entity: { traits: Array<Record<string, unknown>> } }>;
  spatialIndex: { childToParent: Array<[string, string]> };
  playerId: string;
} {
  const b64 = saveData.engineState.worldSnapshot;
  const bin = Buffer.from(b64, 'base64');
  const json = strFromU8(gunzipSync(new Uint8Array(bin)));
  // strToU8 import keeps fflate happy on the round-trip side; it isn't
  // used here but the same helper is what the engine writes with.
  void strToU8;
  return JSON.parse(json);
}

function findEntityIdByIdentityName(
  snapshot: ReturnType<typeof decodeWorldSnapshot>,
  name: string,
): string | undefined {
  for (const row of snapshot.entities) {
    const identity = row.entity.traits.find(
      (t) => (t as { type?: string }).type === 'identity',
    ) as { name?: string } | undefined;
    if (identity?.name === name) return row.id;
  }
  return undefined;
}

function findParentOf(
  snapshot: ReturnType<typeof decodeWorldSnapshot>,
  childId: string,
): string | undefined {
  const pair = snapshot.spatialIndex.childToParent.find(
    ([child]) => child === childId,
  );
  return pair?.[1];
}

describe('executeTurnStatelessly — happy path', () => {
  let ctx: TestCtx;

  beforeAll(async () => {
    // Pre-build the fixture once for the suite to avoid repeated esbuild
    // overhead — the bundle is deterministic for a given fixture source.
    await buildTinyFixtureBundle();
  });

  beforeEach(async () => {
    clearStoryCacheForTests();
    ctx = await setup();
  });

  afterAll(() => {
    clearStoryCacheForTests();
  });

  it('appends a save_blobs row at turn 1 with non-empty payload', async () => {
    const packet = await executeTurnStatelessly({
      adapter: ctx.adapter,
      roomId: ctx.roomId,
      command: 'look',
    });

    expect(packet.turn).toBe(1);

    const blob = await ctx.adapter.getSaveBlobAt(ctx.roomId, 1);
    expect(blob).not.toBeNull();
    expect(blob!.payload.byteLength).toBeGreaterThan(0);
    expect(blob!.bundleVersion).toBe(tinyFixtureConfig.version);

    const decoded = decodePayload(blob!.payload);
    expect(decoded.metadata.turnCount).toBe(1);
    expect(decoded.storyConfig.id).toBe(tinyFixtureConfig.id);
  });

  it('returns text blocks emitted only during the executed command', async () => {
    const packet = await executeTurnStatelessly({
      adapter: ctx.adapter,
      roomId: ctx.roomId,
      command: 'look',
    });
    // The fixture's "Testing Cell" should be visible in some block content.
    expect(packet.blocks.length).toBeGreaterThan(0);
    const joined = JSON.stringify(packet.blocks);
    expect(joined.toLowerCase()).toContain('testing cell');
  });

  it('restores prior turn state on the next invocation — observable mutation carries over', async () => {
    // Turn 1 mutates the world: the marker stone moves from the room to
    // the player. If the executor restored prior state on turn 2, the
    // marker stays with the player; if it cold-started from `setStory`
    // alone, the marker would be back in the room and this test fails.
    await executeTurnStatelessly({
      adapter: ctx.adapter,
      roomId: ctx.roomId,
      command: 'take marker stone',
    });

    const turn1Blob = await ctx.adapter.getSaveBlobAt(ctx.roomId, 1);
    expect(turn1Blob).not.toBeNull();
    const turn1Save = decodePayload(turn1Blob!.payload);
    const turn1Snapshot = decodeWorldSnapshot(turn1Save);
    const markerId = findEntityIdByIdentityName(turn1Snapshot, 'marker stone');
    expect(markerId).toBeDefined();
    expect(findParentOf(turn1Snapshot, markerId!)).toBe(turn1Snapshot.playerId);

    const second = await executeTurnStatelessly({
      adapter: ctx.adapter,
      roomId: ctx.roomId,
      command: 'look',
    });
    expect(second.turn).toBe(2);

    const turn2Blob = await ctx.adapter.getSaveBlobAt(ctx.roomId, 2);
    expect(turn2Blob).not.toBeNull();
    const turn2Save = decodePayload(turn2Blob!.payload);
    expect(turn2Save.metadata.turnCount).toBe(2);

    const turn2Snapshot = decodeWorldSnapshot(turn2Save);
    const markerOnTurn2 = findEntityIdByIdentityName(turn2Snapshot, 'marker stone');
    expect(markerOnTurn2).toBeDefined();
    // The carry-over assertion: marker stays with the player on turn 2.
    expect(findParentOf(turn2Snapshot, markerOnTurn2!)).toBe(
      turn2Snapshot.playerId,
    );
  });

  it('releases the room lease so a subsequent invocation can acquire it', async () => {
    // Two sequential invocations succeed only if the lease was released
    // between them. If the executor leaked the lease in the success path,
    // the second `acquireRoomLease` would hang on the in-process FIFO.
    await executeTurnStatelessly({
      adapter: ctx.adapter,
      roomId: ctx.roomId,
      command: 'look',
    });
    const next = await executeTurnStatelessly({
      adapter: ctx.adapter,
      roomId: ctx.roomId,
      command: 'look',
    });
    expect(next.turn).toBe(2);
  });
});

describe('executeTurnStatelessly — rejections', () => {
  let ctx: TestCtx;

  beforeEach(async () => {
    clearStoryCacheForTests();
    ctx = await setup();
  });

  it('throws when the room id is unknown', async () => {
    await expect(
      executeTurnStatelessly({
        adapter: ctx.adapter,
        roomId: 'no-such-room',
        command: 'look',
      }),
    ).rejects.toThrow(/room no-such-room not found/);
  });

  it('throws when the room is closed', async () => {
    await ctx.adapter.closeRoom(ctx.roomId);
    await expect(
      executeTurnStatelessly({
        adapter: ctx.adapter,
        roomId: ctx.roomId,
        command: 'look',
      }),
    ).rejects.toThrow(/is closed/);
  });

  it('throws when the room references a bundle that is not installed', async () => {
    // Create a second room pinned to a version that was never installed.
    const ghost = await ctx.adapter.createRoom({
      storyId: tinyFixtureConfig.id,
      bundleVersion: '99.99.99-missing',
      title: 'Phantom bundle room',
      public: true,
      createdBy: ctx.identityId,
    });
    await expect(
      executeTurnStatelessly({
        adapter: ctx.adapter,
        roomId: ghost.id,
        command: 'look',
      }),
    ).rejects.toThrow(/not installed/);
  });
});
