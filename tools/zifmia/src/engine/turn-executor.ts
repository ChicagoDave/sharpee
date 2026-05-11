/**
 * @module @sharpee/zifmia/engine/turn-executor
 * @purpose Stateless per-turn engine driver. Given a room and a command,
 *   build a fresh engine on top of the room's pinned bundle and the
 *   room's latest save_blob, run exactly one turn, append the resulting
 *   snapshot as the next save_blob row, and return the turn's text +
 *   events to the caller.
 * @owner Zifmia server — turn-lifecycle integration (ADR-175 §3c).
 *
 * Invariants this module upholds:
 *  - No `WorldModel`, `GameEngine`, or story instance outlives a single
 *    invocation of `executeTurnStatelessly()` (ADR-164 single-writer
 *    invariant). The cached `Story` from `bundle-loader` is the one
 *    exception — it is logically immutable for a given `(storyId,
 *    version)` and is treated as read-only configuration, not state.
 *  - The room lease is held across the entire load → execute → commit
 *    sequence and is released in both the success and failure paths.
 *  - Save-blob `(roomId, turn)` rows are append-only; on engine throw,
 *    no row is written.
 */

import { gzipSync, gunzipSync, strFromU8 } from 'fflate';

import type { GameEngine, Story } from '@sharpee/engine';
import type { WorldModel } from '@sharpee/world-model';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';
import type { IPerceptionService } from '@sharpee/if-services';
import type { ISaveData, ISemanticEvent } from '@sharpee/core';
import type { ITextBlock } from '@sharpee/text-blocks';

/**
 * Engine-runtime classes are loaded via `createRequire` rather than
 * static `import` to bypass vite-node's ESM-emulation transformer at
 * test time. Several `@sharpee/*` ESM index modules re-export the same
 * symbol under multiple names (e.g. `EnglishLanguageProvider` and the
 * `LanguageProvider` alias), which tripped vite-node's `exportAll` into
 * an infinite-getter loop. Node's native CJS loader handles that
 * pattern correctly, so going through `require` keeps production behavior
 * identical while sidestepping the test-runner-only bug.
 */
import { createRequire } from 'module';
const requireFromHere = createRequire(__filename);

interface EngineCtor {
  new (options: {
    world: WorldModel;
    player: ReturnType<Story['createPlayer']>;
    parser: Parser;
    language: LanguageProvider;
    perceptionService?: IPerceptionService;
  }): GameEngine;
}

const GameEngineRuntime: EngineCtor = requireFromHere('@sharpee/engine')
  .GameEngine;
const WorldModelRuntime: new () => WorldModel =
  requireFromHere('@sharpee/world-model').WorldModel;
const EnglishLanguageProviderRuntime: new () => LanguageProvider =
  requireFromHere('@sharpee/lang-en-us').EnglishLanguageProvider;
const EnglishParserRuntime: new (lang: LanguageProvider) => Parser =
  requireFromHere('@sharpee/parser-en-us').EnglishParser;
const PerceptionServiceRuntime: new () => IPerceptionService =
  requireFromHere('@sharpee/stdlib').PerceptionService;

import type { StorageAdapter } from '../storage/adapter';
import type { Room, SaveBlob } from '../storage/types';
import { loadStoryFromBundle } from './bundle-loader';
import type { TurnEvent, TurnPacket } from './types';

export interface TurnExecutorInput {
  adapter: StorageAdapter;
  roomId: string;
  command: string;
}

/**
 * Forwarding filter for events that should reach clients (mirrors
 * `@sharpee/bridge`'s `shouldForwardEvent`). Engine-internal events
 * never cross the wire boundary.
 */
function shouldForwardEvent(type: string): boolean {
  return type.startsWith('if.event.') || type.startsWith('platform.');
}

/**
 * Wire payload encoded for the `save_blobs` row. The engine's `ISaveData`
 * already gzips the heavy world-snapshot field internally, so the outer
 * envelope is JSON gzipped once more to compress the un-gzipped fields
 * (event source, turn history). Result: a single Uint8Array suitable
 * for the BLOB column.
 */
function encodeSaveData(saveData: ISaveData): Uint8Array {
  return gzipSync(new TextEncoder().encode(JSON.stringify(saveData)));
}

/**
 * Inverse of {@link encodeSaveData}. Throws if the blob is not a valid
 * gzipped JSON-encoded `ISaveData`.
 */
function decodeSaveData(blob: Uint8Array): ISaveData {
  return JSON.parse(strFromU8(gunzipSync(blob))) as ISaveData;
}

/**
 * Typed precondition failures. The route layer distinguishes these
 * from engine-throw errors so HTTP status mapping is unambiguous:
 *  - {@link RoomNotFoundError}      → 404 room_not_found
 *  - {@link RoomClosedError}        → 410 room_closed
 *  - {@link BundleNotInstalledError} → 500 bundle_not_installed
 *  - any other escape (engine throw, adapter error, etc.) → 500
 *    turn_failed (ADR-175 §AC-13).
 */
export class RoomNotFoundError extends Error {
  readonly code = 'room_not_found';
  constructor(public readonly roomId: string) {
    super(`turn-executor: room ${roomId} not found`);
    this.name = 'RoomNotFoundError';
  }
}

export class RoomClosedError extends Error {
  readonly code = 'room_closed';
  constructor(public readonly roomId: string) {
    super(`turn-executor: room ${roomId} is closed`);
    this.name = 'RoomClosedError';
  }
}

export class BundleNotInstalledError extends Error {
  readonly code = 'bundle_not_installed';
  constructor(
    public readonly storyId: string,
    public readonly version: string,
  ) {
    super(
      `turn-executor: bundle ${storyId}@${version} not installed`,
    );
    this.name = 'BundleNotInstalledError';
  }
}

async function resolveRoomAndStory(
  adapter: StorageAdapter,
  roomId: string,
): Promise<{ room: Room; story: Story }> {
  const room = await adapter.getRoom(roomId);
  if (!room) {
    throw new RoomNotFoundError(roomId);
  }
  if (room.closedAt) {
    throw new RoomClosedError(roomId);
  }
  const bundle = await adapter.getStoryBundle(room.storyId, room.bundleVersion);
  if (!bundle) {
    throw new BundleNotInstalledError(room.storyId, room.bundleVersion);
  }
  const story = await loadStoryFromBundle({
    storyId: room.storyId,
    version: room.bundleVersion,
    bundle,
  });
  return { room, story };
}

interface BuiltEngine {
  engine: GameEngine;
  capturedBlocks: ITextBlock[];
  capturedEvents: TurnEvent[];
  /** Called by the executor to begin accumulating blocks/events from the
   * very next emission. Used to drop everything emitted during restore
   * and start (which are not part of the user's turn). */
  startCapture(): void;
}

function buildEngine(story: Story): BuiltEngine {
  const world = new WorldModelRuntime();
  const player = story.createPlayer(world);
  world.setPlayer(player.id);

  const language = new EnglishLanguageProviderRuntime();
  const parser = new EnglishParserRuntime(language);
  const perceptionService = new PerceptionServiceRuntime();

  const engine = new GameEngineRuntime({
    world,
    player,
    parser,
    language,
    perceptionService,
  });

  let capturing = false;
  const capturedBlocks: ITextBlock[] = [];
  const capturedEvents: TurnEvent[] = [];

  engine.on('text:output', (blocks: ITextBlock[]) => {
    if (capturing) capturedBlocks.push(...blocks);
  });
  engine.on('event', (event: ISemanticEvent) => {
    if (!capturing) return;
    if (!shouldForwardEvent(event.type)) return;
    capturedEvents.push({
      type: event.type,
      data: (event.data as Record<string, unknown>) ?? {},
    });
  });

  engine.setStory(story);
  if (story.extendParser) story.extendParser(parser);
  if (story.extendLanguage) story.extendLanguage(language);

  return {
    engine,
    capturedBlocks,
    capturedEvents,
    startCapture: () => {
      capturing = true;
    },
  };
}

async function restoreFromBlob(
  engine: GameEngine,
  blob: SaveBlob,
): Promise<void> {
  const saveData = decodeSaveData(blob.payload);
  // The engine's public restore() path pulls save data from a hook and
  // calls the private loadSaveData() with it. Registering a one-shot
  // hook is the official re-hydration entry point — see
  // `@sharpee/bridge`'s `handleRestore` for the same idiom.
  engine.registerSaveRestoreHooks({
    onSaveRequested: async () => {
      /* no-op; replaced below */
    },
    onRestoreRequested: async () => saveData,
  });
  const ok = await engine.restore();
  if (!ok) {
    throw new Error(
      `turn-executor: engine.restore() returned false for room blob`,
    );
  }
}

async function captureSaveData(engine: GameEngine): Promise<ISaveData> {
  let captured: ISaveData | undefined;
  engine.registerSaveRestoreHooks({
    onSaveRequested: async (saveData: ISaveData) => {
      captured = saveData;
    },
    onRestoreRequested: async () => null,
  });
  const ok = await engine.save();
  if (!ok || !captured) {
    throw new Error(
      `turn-executor: engine.save() did not yield save data`,
    );
  }
  return captured;
}

/**
 * Execute exactly one turn for the given room.
 *
 * DOES: appends a new `save_blobs` row for `(roomId, currentTurn)`
 * carrying the gzipped, JSON-encoded `ISaveData` snapshot of the world
 * after the command ran. Returns the text blocks and forwarded events
 * emitted during that one turn.
 *
 * WHEN: caller has a valid `(adapter, roomId, command)` triple; the
 * room exists, is not closed, and its pinned bundle is installed in
 * the story library; no other turn is currently in flight for the
 * room (enforced by the per-room lease).
 *
 * BECAUSE: ADR-175 §3c — every turn lifecycle is a self-contained
 * load → execute → commit cycle so that no WorldModel ever outlives a
 * request. This is the foundation for the multi-worker pool (Phase
 * 3e) and the Postgres adapter (Phase 7), both of which require
 * per-request engine state.
 *
 * REJECTS WHEN:
 *  - The room does not exist or is closed.
 *  - The room's pinned story bundle is not installed (404-shaped
 *    failure for the route layer).
 *  - The stored save_blob payload is malformed.
 *  - The engine throws during `executeTurn()` — the executor lets the
 *    exception propagate; the route layer translates it into the AC-13
 *    500 response and the WS lock:state release. No `save_blobs` row
 *    is written on this path.
 */
export async function executeTurnStatelessly(
  input: TurnExecutorInput,
): Promise<TurnPacket> {
  const { adapter, roomId, command } = input;
  const { room, story } = await resolveRoomAndStory(adapter, roomId);

  const lease = await adapter.acquireRoomLease(roomId);
  try {
    const priorBlob = await adapter.getLatestSaveBlob(roomId);

    const built = buildEngine(story);
    built.engine.start();

    if (priorBlob) {
      await restoreFromBlob(built.engine, priorBlob);
    }

    // Begin capturing only the user-command turn. Everything emitted
    // during start() and restore() is discarded — the wire packet
    // reflects exactly the turn the caller requested.
    built.startCapture();

    await built.engine.executeTurn(command);

    const saveData = await captureSaveData(built.engine);
    const turn = saveData.metadata.turnCount;

    await adapter.appendSaveBlob({
      roomId,
      turn,
      formatVersion: parseSemverMajor(saveData.version),
      bundleVersion: room.bundleVersion,
      payload: encodeSaveData(saveData),
    });

    return {
      turn,
      blocks: built.capturedBlocks,
      events: built.capturedEvents,
    };
  } finally {
    await lease.release();
  }
}

/**
 * Engine save format is reported as a `x.y.z` semver string; the
 * `save_blobs.format_version` column is an integer (ADR-175 §Decision
 * 3). We persist only the major version so a future minor-format bump
 * remains additively compatible at the storage layer.
 */
function parseSemverMajor(version: string): number {
  const major = parseInt(version.split('.')[0], 10);
  if (!Number.isFinite(major) || major < 1) {
    throw new Error(`turn-executor: unrecognized save version '${version}'`);
  }
  return major;
}
