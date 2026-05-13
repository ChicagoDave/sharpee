/**
 * Stateless per-turn engine driver per ADR-177 §1 + ADR-164.
 *
 * Public interface: {@link executeTurnAgainstStory},
 * {@link captureManifest}, {@link ENGINE_RUNTIME}.
 * Owner: zifmia server, engine domain.
 *
 * Invariants:
 *  - No `WorldModel`, `GameEngine`, or `Story` outlives a single
 *    invocation of `executeTurnAgainstStory()`. The cached `Story`
 *    from `bundle-loader` is immutable per (id, version) and is the
 *    one exception (read-only config, not state).
 *  - Engine packages are loaded via `createRequire` rather than ESM
 *    `import` to bypass vite-node's `exportAll` infinite-getter bug
 *    (several `@sharpee/*` index modules re-export the same symbol
 *    under multiple names). Production behavior is identical; the
 *    test runner just doesn't trip the bug this way.
 */

import { createRequire } from 'node:module';
import type {
  GameEngine,
  Story
} from '@sharpee/engine';
import type { WorldModel } from '@sharpee/world-model';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';
import type { IPerceptionService } from '@sharpee/if-services';
import type { ISaveData } from '@sharpee/core';
import type { CmgtPacket as EngineCmgtPacket, TurnPacket as EngineTurnPacket } from '@sharpee/if-domain';
import type { TurnPacket } from '../ws/types.js';

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

const GameEngineCtor: EngineCtor = requireFromHere('@sharpee/engine').GameEngine;
const WorldModelCtor: new () => WorldModel = requireFromHere('@sharpee/world-model').WorldModel;
const EnglishLanguageProviderCtor: new () => LanguageProvider =
  requireFromHere('@sharpee/lang-en-us').EnglishLanguageProvider;
const EnglishParserCtor: new (lang: LanguageProvider) => Parser =
  requireFromHere('@sharpee/parser-en-us').EnglishParser;
const PerceptionServiceCtor: new () => IPerceptionService =
  requireFromHere('@sharpee/stdlib').PerceptionService;

/** Names exposed for diagnostic / capability reporting. */
export const ENGINE_RUNTIME = {
  GameEngine: GameEngineCtor,
  WorldModel: WorldModelCtor,
  EnglishLanguageProvider: EnglishLanguageProviderCtor,
  EnglishParser: EnglishParserCtor,
  PerceptionService: PerceptionServiceCtor
} as const;

interface BuiltEngine {
  engine: GameEngine;
  startCapture(): void;
  capturedManifest: EngineCmgtPacket | null;
  capturedChannelPackets: EngineTurnPacket[];
}

function buildEngine(story: Story): BuiltEngine {
  const world = new WorldModelCtor();
  const player = story.createPlayer(world);
  const language = new EnglishLanguageProviderCtor();
  const parser = new EnglishParserCtor(language);
  const perceptionService = new PerceptionServiceCtor();

  const engine = new GameEngineCtor({ world, player, parser, language, perceptionService });

  let capturing = false;
  let manifest: EngineCmgtPacket | null = null;
  const packets: EngineTurnPacket[] = [];

  engine.on('channel:manifest', (cmgt) => {
    manifest = cmgt;
  });
  engine.on('channel:packet', (packet) => {
    if (capturing) packets.push(packet);
  });

  engine.setStory(story);
  if (story.extendParser) story.extendParser(parser);
  if (story.extendLanguage) story.extendLanguage(language);

  return {
    engine,
    startCapture: () => { capturing = true; },
    get capturedManifest() { return manifest; },
    capturedChannelPackets: packets
  };
}

async function restoreFromSaveData(engine: GameEngine, saveData: ISaveData): Promise<void> {
  engine.registerSaveRestoreHooks({
    onSaveRequested: async () => { /* unused on this path */ },
    onRestoreRequested: async () => saveData
  });
  const ok = await engine.restore();
  if (!ok) throw new Error('turn-executor: engine.restore() returned false');
}

async function captureSaveData(engine: GameEngine): Promise<ISaveData> {
  let captured: ISaveData | undefined;
  engine.registerSaveRestoreHooks({
    onSaveRequested: async (saveData: ISaveData) => { captured = saveData; },
    onRestoreRequested: async () => null
  });
  const ok = await engine.save();
  if (!ok || !captured) throw new Error('turn-executor: engine.save() did not yield save data');
  return captured;
}

export interface TurnExecutionInput {
  story: Story;
  /** Prior turn's saved `ISaveData` (null/undefined on first turn). */
  priorSaveData: ISaveData | null;
  /** Player command text. */
  command: string;
}

export interface TurnExecutionResult {
  /** Engine-issued turn id (string form of the engine's turn counter). */
  turnId: string;
  /** Channel-io TurnPacket (kind='turn'); ready to broadcast over WS. */
  turnPacket: TurnPacket;
  /** Channel manifest captured during the engine's `setStory` → `start` boot. */
  manifest: EngineCmgtPacket | null;
  /** The post-turn `ISaveData` snapshot for persistence. */
  newSaveData: ISaveData;
}

/**
 * Run one engine turn against a story + prior save. Returns the new
 * TurnPacket, the post-turn `ISaveData`, and the channel manifest.
 */
export async function executeTurnAgainstStory(
  input: TurnExecutionInput
): Promise<TurnExecutionResult> {
  const built = buildEngine(input.story);
  built.engine.start();

  if (input.priorSaveData) {
    await restoreFromSaveData(built.engine, input.priorSaveData);
  }

  built.startCapture();
  await built.engine.executeTurn(input.command);

  const newSaveData = await captureSaveData(built.engine);
  const turn = newSaveData.metadata.turnCount;
  const turnIdStr = String(turn);

  // Convert engine's TurnPacket to our wire TurnPacket shape. The
  // engine's `payload` is a Record<string, unknown>; our wire shape
  // expects Record<string, unknown[]> (channel id → blocks array).
  // The engine populates one entry per channel as an array per ADR-163.
  const last = built.capturedChannelPackets[built.capturedChannelPackets.length - 1];
  const channels: Record<string, unknown[]> = {};
  if (last) {
    for (const [chanId, value] of Object.entries(last.payload)) {
      channels[chanId] = Array.isArray(value) ? value : [value];
    }
  }
  const turnPacket: TurnPacket = { turnId: turnIdStr, channels };

  return {
    turnId: turnIdStr,
    turnPacket,
    manifest: built.capturedManifest,
    newSaveData
  };
}

/**
 * Boot the engine for a story just long enough to capture the
 * `channel:manifest` it emits inside `setStory()` / `start()`, then
 * discard everything. Used by `GET /state` to surface the cmgt on
 * room hydration before any turn has run, and by `StoryHealth` to
 * smoke-test a freshly-scanned bundle.
 */
export async function captureManifest(story: Story): Promise<EngineCmgtPacket | null> {
  const built = buildEngine(story);
  built.engine.start();
  return built.capturedManifest;
}
