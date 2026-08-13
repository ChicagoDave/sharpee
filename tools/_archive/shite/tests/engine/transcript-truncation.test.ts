/**
 * @module tests/engine/transcript-truncation.test
 * @purpose AC-7 — verifies that the per-room transcript window inside
 *   each save_blob caps at the configured size and that mid-session
 *   rejoin via `GET /rooms/:id/state` sees exactly that window.
 *
 * @owner Zifmia engine tests.
 *
 * Behavior Statement (rule 12):
 *  - DOES — running N turns with `transcriptWindow=W` produces a save
 *    blob whose embedded transcript is `min(N, W)` entries long.
 *  - DOES — once over the window, the oldest entries drop and the
 *    newest are retained; turn numbers in the window are contiguous.
 *  - DOES — each entry carries the submitter, command, turn,
 *    captured blocks, and forwarded events the executor saw.
 *  - DOES — `GET /rooms/:id/state` returns the latest blob's
 *    transcript window verbatim; empty rooms return the stub body.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import {
  buildTinyFixtureBundle,
  tinyFixtureConfig,
} from '../fixtures/build-bundle';
import { clearStoryCacheForTests } from '../../src/engine/bundle-loader';
import { executeTurnStatelessly } from '../../src/engine/turn-executor';
import { decodeEnvelope } from '../../src/engine/save-envelope';
import { startServer, type ZifmiaServerHandle } from '../../src/server';

interface TestCtx {
  adapter: SqliteAdapter;
  roomId: string;
  identityId: string;
  handle: string;
}

async function setup(): Promise<TestCtx> {
  clearStoryCacheForTests();
  const adapter = new SqliteAdapter({ filename: ':memory:' });
  await adapter.migrate();

  const identity = await adapter.createIdentity({
    handle: 'transcript-tester',
    passcodeHash: 'scrypt$32768$8$1$abc$def',
  });

  await adapter.installStoryBundle({
    storyId: tinyFixtureConfig.id,
    version: tinyFixtureConfig.version,
    ifid: 'TEST-FIXTURE-0001',
    title: tinyFixtureConfig.title,
    installedBy: identity.id,
    bundle: await buildTinyFixtureBundle(),
  });

  const room = await adapter.createRoom({
    storyId: tinyFixtureConfig.id,
    bundleVersion: tinyFixtureConfig.version,
    title: 'Transcript truncation room',
    public: true,
    createdBy: identity.id,
  });

  return {
    adapter,
    roomId: room.id,
    identityId: identity.id,
    handle: identity.handle,
  };
}

describe('executor — per-room transcript window', () => {
  let ctx: TestCtx;

  beforeAll(async () => {
    await buildTinyFixtureBundle();
  });

  beforeEach(async () => {
    ctx = await setup();
  });

  afterAll(() => {
    clearStoryCacheForTests();
  });

  it('appends a TranscriptEntry per turn with submitter, command, turn, blocks, events', async () => {
    await executeTurnStatelessly({
      adapter: ctx.adapter,
      roomId: ctx.roomId,
      command: 'look',
      submitter: { identityId: ctx.identityId, handle: ctx.handle },
    });

    const blob = await ctx.adapter.getLatestSaveBlob(ctx.roomId);
    expect(blob).not.toBeNull();
    const envelope = decodeEnvelope(blob!.payload);
    expect(envelope.envelopeVersion).toBe(1);
    expect(envelope.transcript).toHaveLength(1);

    const [entry] = envelope.transcript;
    expect(entry.turn).toBe(1);
    expect(entry.command).toBe('look');
    expect(entry.submitter).toEqual({
      identityId: ctx.identityId,
      handle: ctx.handle,
    });
    expect(entry.blocks.length).toBeGreaterThan(0);
    expect(Array.isArray(entry.events)).toBe(true);
  });

  it('grows the transcript turn-by-turn up to the window', async () => {
    const window = 5;
    for (let i = 0; i < window; i++) {
      await executeTurnStatelessly({
        adapter: ctx.adapter,
        roomId: ctx.roomId,
        command: 'look',
        submitter: { identityId: ctx.identityId, handle: ctx.handle },
        transcriptWindow: window,
      });
    }
    const blob = await ctx.adapter.getLatestSaveBlob(ctx.roomId);
    const envelope = decodeEnvelope(blob!.payload);
    expect(envelope.transcript).toHaveLength(window);
    expect(envelope.transcript.map((e) => e.turn)).toEqual([1, 2, 3, 4, 5]);
  });

  it('drops the oldest entries once over the window — AC-7', async () => {
    // 12 turns × window=5 → final transcript should be turns 8..12 only.
    const window = 5;
    const turnsToRun = 12;
    for (let i = 0; i < turnsToRun; i++) {
      await executeTurnStatelessly({
        adapter: ctx.adapter,
        roomId: ctx.roomId,
        command: 'look',
        submitter: { identityId: ctx.identityId, handle: ctx.handle },
        transcriptWindow: window,
      });
    }
    const blob = await ctx.adapter.getLatestSaveBlob(ctx.roomId);
    const envelope = decodeEnvelope(blob!.payload);
    expect(envelope.transcript).toHaveLength(window);
    expect(envelope.transcript.map((e) => e.turn)).toEqual([8, 9, 10, 11, 12]);

    // World turn counter still reflects total absolute turns — the
    // transcript window does not cap engine-side turn counting.
    expect(envelope.saveData.metadata.turnCount).toBe(turnsToRun);
  });
});

describe('GET /rooms/:id/state — transcript hydration', () => {
  let serverHandle: ZifmiaServerHandle;
  let baseUrl: string;
  let token: string;
  let identityId: string;
  let identityHandle: string;
  let roomId: string;
  let roomNoTurnsId: string;

  beforeAll(async () => {
    await buildTinyFixtureBundle();
  });

  beforeEach(async () => {
    clearStoryCacheForTests();
    const adapter = new SqliteAdapter({ filename: ':memory:' });
    serverHandle = await startServer({
      adapter,
      port: 0,
      host: '127.0.0.1',
      packageVersion: '0.1.0-test',
    });
    baseUrl = `http://127.0.0.1:${serverHandle.port}`;

    const reg = await fetch(`${baseUrl}/identity/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        handle: 'state-tester',
        passcode: 'a valid passcode',
      }),
    });
    const regBody = (await reg.json()) as {
      id: string;
      handle: string;
      sessionToken: string;
    };
    token = regBody.sessionToken;
    identityId = regBody.id;
    identityHandle = regBody.handle;

    await serverHandle.adapter.installStoryBundle({
      storyId: tinyFixtureConfig.id,
      version: tinyFixtureConfig.version,
      ifid: 'TEST-FIXTURE-0001',
      title: tinyFixtureConfig.title,
      installedBy: identityId,
      bundle: await buildTinyFixtureBundle(),
    });

    const room = await serverHandle.adapter.createRoom({
      storyId: tinyFixtureConfig.id,
      bundleVersion: tinyFixtureConfig.version,
      title: 'state-route room',
      public: true,
      createdBy: identityId,
    });
    roomId = room.id;

    const roomEmpty = await serverHandle.adapter.createRoom({
      storyId: tinyFixtureConfig.id,
      bundleVersion: tinyFixtureConfig.version,
      title: 'no-turns room',
      public: true,
      createdBy: identityId,
    });
    roomNoTurnsId = roomEmpty.id;
  });

  afterAll(async () => {
    if (serverHandle) await serverHandle.close();
  });

  it('returns the empty transcript with a populated CMGT manifest when no save_blob exists yet', async () => {
    const res = await fetch(`${baseUrl}/rooms/${roomNoTurnsId}/state`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      cmgt: { kind: string; protocol_version: number; channels: unknown[] };
      transcript: unknown[];
      currentValues: Record<string, unknown>;
    };
    // Phase 6c-server: GET /rooms/:id/state now ships the channel-typed
    // CMGT manifest captured from the engine's `channel:manifest` emit.
    expect(body.cmgt).not.toBeNull();
    expect(body.cmgt.kind).toBe('cmgt');
    expect(body.cmgt.protocol_version).toBe(1);
    expect(Array.isArray(body.cmgt.channels)).toBe(true);
    // A populated manifest distinguishes a real capture from a stub.
    expect(body.cmgt.channels.length).toBeGreaterThan(0);
    expect(body.transcript).toEqual([]);
    expect(body.currentValues).toEqual({});
  });

  it('returns the in-blob transcript window with channelPacket on each entry after turns', async () => {
    // Drive 4 turns through the HTTP route so the executor writes envelopes.
    for (let i = 0; i < 4; i++) {
      const res = await fetch(`${baseUrl}/rooms/${roomId}/command`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ command: 'look' }),
      });
      expect(res.status).toBe(200);
      await res.json();
    }

    const res = await fetch(`${baseUrl}/rooms/${roomId}/state`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      cmgt: { kind: string; channels: unknown[] };
      transcript: Array<{
        turn: number;
        command: string;
        submitter: { identityId: string; handle: string };
        channelPacket?: { kind: string; turn_id: string };
      }>;
      currentValues: Record<string, unknown>;
    };
    expect(body.cmgt.kind).toBe('cmgt');
    expect(body.transcript).toHaveLength(4);
    expect(body.transcript.map((e) => e.turn)).toEqual([1, 2, 3, 4]);
    // Phase 6c-server: every freshly-written transcript entry now carries
    // its channel-typed turn packet.
    for (const entry of body.transcript) {
      expect(entry.channelPacket).toBeDefined();
      expect(entry.channelPacket?.kind).toBe('turn');
    }
    for (const entry of body.transcript) {
      expect(entry.command).toBe('look');
      expect(entry.submitter.identityId).toBe(identityId);
      expect(entry.submitter.handle).toBe(identityHandle);
    }
  });

  it('returns 404 for unknown rooms', async () => {
    const res = await fetch(`${baseUrl}/rooms/no-such-room/state`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});
