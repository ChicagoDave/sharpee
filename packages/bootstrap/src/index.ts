/**
 * @sharpee/bootstrap — load and assemble a Sharpee story into a runnable game.
 *
 * The single story-loading implementation for the platform: transcript-tester,
 * the CLI bundle, and devkit all call this instead of hand-copying it (ADR-180).
 * Resolves a story module (entry-aware) and assembles GameEngine + world +
 * player + parser + language + perception, wired to the ADR-163 channel-packet
 * output path (the canonical CLI/test output capture).
 *
 * Owner context: build/test devkit layer (ADR-180).
 * Public interface: `resolveStoryModulePath`, `purgeStoryModuleCache`, `loadStory`, `assembleGame`, `moduleFreshStory`, `LoadedGame`.
 */

import { resolveStoryModulePath } from './resolve.js';
import { purgeStoryModuleCache } from './purge.js';
import { GameEngine, TurnResult } from '@sharpee/engine';
import { ISemanticEvent } from '@sharpee/core';
import { joinMainEntries } from '@sharpee/channel-service';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { PerceptionService, channelRegistry } from '@sharpee/stdlib';
// @ts-ignore — lang-en-us ships without bundled .d.ts in some build modes
import { LanguageProvider } from '@sharpee/lang-en-us';
import { TestingExtension } from '@sharpee/ext-testing';

/**
 * CLI / test capability profile (ADR-165 §8). Only the `main` channel produces
 * visible output in test mode; status/prompt/info/etc. are available to
 * interactive mode but ignored here.
 */
export const CLI_CAPABILITIES = {
  text: true,
  images: false,
  animations: false,
  video: false,
  sound: false,
  music: false,
  speech: false,
  splitPane: false,
  statusBar: false,
  sidebar: false,
  clickableText: false,
  clickableImage: false,
  dragDrop: false,
  transitions: false,
  layers: false,
  customFonts: false,
} as const;

/** A loaded, started, runnable game with text-output capture. */
export interface LoadedGame {
  engine: GameEngine;
  world: WorldModel;
  testingExtension: TestingExtension | null;
  lastOutput: string;
  lastEvents: ISemanticEvent[];
  lastTurnResult: TurnResult | null;
  /**
   * Per-command capture of declared non-`main` channels (ADR-294 D15):
   * flattened lines per channel id, in emission order. Empty unless the game
   * was assembled with `channels` beyond `main`. `main` stays in
   * `lastOutput` — it is never duplicated here.
   */
  lastChannels: Record<string, string[]>;
  /** Proxy for runner save/restore plugin state. */
  getPluginRegistry(): {
    getStates(): Record<string, unknown>;
    setStates(states: Record<string, unknown>): void;
  };
  /** Execute one command; returns the captured `main`-channel text. */
  executeCommand(input: string): Promise<string>;
  /**
   * Resume the engine if a game-over stopped it (player death, victory).
   * Called by the runner's RETRY restore path after `world.loadJSON()` so a
   * restored live-player snapshot can keep executing turns.
   */
  reviveEngine(): void;
}

export { resolveStoryModulePath } from './resolve.js';
export { purgeStoryModuleCache } from './purge.js';
export { buildManifest } from './introspect.js';

/**
 * Load a story by location (entry-aware) and assemble a runnable game.
 *
 * @param location  path to the story directory
 * @param opts.entry optional story sub-entry to pin (transcript `entry:` header)
 * @param opts.seed  master seed for the session (ADR-293 D1), forwarded to
 *   `assembleGame`; absent → the engine reads the clock once
 * @param opts.channels declared capture channels (ADR-294 D15), forwarded to
 *   `assembleGame`; absent → `['main']` (today's behavior)
 * @throws if the module can't be resolved/required or exports no createStory()
 */
export async function loadStory(
  location: string,
  opts?: { entry?: string; seed?: number; channels?: string[] },
): Promise<LoadedGame> {
  const modulePath = resolveStoryModulePath(location, opts?.entry);
  // ADR-248: the same provider serves the initial load and every
  // in-process restart reboot — purge, re-require, call the factory.
  const freshStory = moduleFreshStory(location, modulePath);
  return assembleGame(freshStory(), {
    freshStory,
    ...(opts?.seed !== undefined ? { seed: opts.seed } : {}),
    ...(opts?.channels !== undefined ? { channels: opts.channels } : {}),
  });
}

/**
 * Build an ADR-248 `freshStory` provider for a module story: purge the
 * story's module cache, re-require the module, and call its `createStory()`
 * factory. The single implementation behind every module-story boot and
 * reboot path (loadStory here, and the CLI bundle's loader).
 *
 * @param location   story directory (cache-purge scope)
 * @param modulePath resolved module file to require
 * @throws (when invoked) if the module does not export `createStory()`
 */
export function moduleFreshStory(location: string, modulePath: string): () => any {
  return () => {
    purgeStoryModuleCache(location);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const freshModule = require(modulePath);
    // ADR-248 factory-only contract: no fallback to a `story`/default singleton.
    if (typeof freshModule.createStory !== 'function') {
      throw new Error(`Story module at ${modulePath} does not export createStory() (ADR-248 factory contract)`);
    }
    return freshModule.createStory();
  };
}

/**
 * Assemble a runnable game from an already-loaded story instance, wired to the
 * ADR-163 channel-packet output path.
 *
 * RESTART semantics (ADR-248): the harness auto-confirms restart (matching the
 * historical no-hook behavior) and, after the restart turn's output has been
 * captured, reboots in place — a fresh story from `opts.freshStory`, fresh
 * world/parser/engine — while keeping the same LoadedGame reference alive for
 * runners. Without a `freshStory` provider, a confirmed restart surfaces an
 * honest error in the command output instead of rebooting.
 */
export function assembleGame(
  story: any,
  opts?: {
    freshStory?: () => any;
    /**
     * Master seed for the session (ADR-293 D1), forwarded to
     * `EngineConfig.seed`. A restart reboot reuses it, so a pinned run
     * is deterministic across in-transcript RESTART. Absent → the engine
     * reads the clock once.
     */
    seed?: number;
    /**
     * Declared capture channels (ADR-294 D15). `main` rides `lastOutput`
     * as always; each additional id is captured per command into
     * `lastChannels`, and its `gatedBy` capability (if any) is enabled on
     * top of CLI_CAPABILITIES so the story emits it in test mode.
     * Absent / `['main']` → byte-identical to today's behavior.
     */
    channels?: string[];
  }
): LoadedGame {
  let engine!: GameEngine;
  let world!: WorldModel;
  let outputBuffer: string[] = [];
  let eventBuffer: ISemanticEvent[] = [];
  let channelBuffers: Record<string, string[]> = {};
  let pendingReboot = false;

  // ADR-294 D15: the story's channels must be registered BEFORE capability
  // derivation — a story-registered gated channel declared in `channels`
  // needs its `gatedBy` looked up now. Registration is last-wins, so the
  // engine's own registration during start() is a harmless re-register.
  story?.registerChannels?.(channelRegistry);
  const capturedChannels = (opts?.channels ?? ['main']).filter((id) => id !== 'main');
  const capabilities: Record<string, boolean> = { ...CLI_CAPABILITIES };
  for (const id of capturedChannels) {
    const channel = channelRegistry.get(id);
    if (!channel) {
      throw new Error(
        `unknown channel '${id}' declared (channels:) — not in the channel registry after story registration (ADR-294 D15)`
      );
    }
    if (channel.gatedBy !== undefined) capabilities[channel.gatedBy] = true;
  }

  const testingExtension = TestingExtension ? new TestingExtension() : null;

  /** Build world/parser/engine for one boot and wire output capture. */
  function boot(s: any): void {
    world = new WorldModel();
    const player = world.createEntity('player', EntityType.ACTOR);
    world.setPlayer(player.id);

    const language = new LanguageProvider();
    const parser = new Parser(language);

    if (s.extendParser) s.extendParser(parser);
    if (s.extendLanguage) s.extendLanguage(language);

    const perceptionService = new PerceptionService();

    engine = new GameEngine({
      world,
      player,
      parser,
      language,
      perceptionService,
      ...(opts?.seed !== undefined ? { config: { seed: opts.seed } } : {})
    });
    engine.setStory(s);

    // ADR-248: auto-confirm restart (the harness has no player to ask) and
    // defer the reboot until the restart turn's output has been captured.
    engine.registerSaveRestoreHooks({
      onRestartRequested: async (): Promise<boolean> => {
        pendingReboot = true;
        return true;
      },
    } as any);

    // Start the channel-I/O pipeline (ADR-163). The engine builds its
    // ChannelService internally from these capabilities during start().
    // The profile is CLI_CAPABILITIES plus any gatedBy flags the declared
    // capture channels require (ADR-294 D15) — identical to
    // CLI_CAPABILITIES when no extra channels were declared.
    engine.start({ capabilities } as any);

    // engine.start() created the real player via story.createPlayer() and re-pointed
    // world.setPlayer() at it; the placeholder above (needed only for the GameEngine
    // constructor) is now orphaned. Remove it so it doesn't leak into world
    // enumeration — e.g. project introspection showing a stray 'player' (ADR-184/185).
    const activePlayer = world.getPlayer();
    if (activePlayer && activePlayer.id !== player.id) {
      world.removeEntity(player.id);
    }

    engine.on('channel:manifest', () => {
      // No-op in test mode.
    });

    // channel:packet fires per turn. Flatten the `main` channel's entries to
    // plain text. Two entry shapes: legacy TextContent[] and MainEntry
    // { content, tight? }; tight entries continue the prior line.
    engine.on('channel:packet', (packet: any) => {
      const out = joinMainEntries(packet?.payload?.main);
      if (out) outputBuffer.push(out);
      // ADR-294 D15: capture each declared non-main channel's payload as
      // deterministic lines. Absent payload = the channel emitted nothing
      // this turn (sparse) — meaningful, recorded as absence.
      for (const id of capturedChannels) {
        const value = packet?.payload?.[id];
        if (value === undefined) continue;
        (channelBuffers[id] ??= []).push(...flattenChannelValue(value));
      }
    });

    engine.on('event', (event: ISemanticEvent) => {
      eventBuffer.push(event);
    });
  }

  boot(story);

  const game: LoadedGame = {
    // Live accessors: a restart reboot replaces the engine/world, and
    // runners hold this LoadedGame reference across the swap.
    get engine() {
      return engine;
    },
    get world() {
      return world;
    },
    testingExtension,
    lastOutput: '',
    lastEvents: [],
    lastTurnResult: null,
    lastChannels: {},

    getPluginRegistry() {
      return (engine as any).getPluginRegistry() as {
        getStates(): Record<string, unknown>;
        setStates(states: Record<string, unknown>): void;
      };
    },

    reviveEngine() {
      engine.resume();
    },

    async executeCommand(input: string): Promise<string> {
      outputBuffer = [];
      eventBuffer = [];
      channelBuffers = {};
      let lastTurnResult: TurnResult | null = null;

      try {
        const result = await engine.executeTurn(input);
        lastTurnResult = result ?? null;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        outputBuffer.push(`Error: ${message}`);
      }

      // ADR-248: confirmed restart — reboot in place. The new boot's
      // engine.start() emits the fresh opening banner into this same
      // command's output, so the transcript sees ack + banner together.
      if (pendingReboot) {
        pendingReboot = false;
        try {
          if (!opts?.freshStory) {
            throw new Error('restart is not supported here: no freshStory provider (ADR-248)');
          }
          boot(opts.freshStory());
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          outputBuffer.push(`Restart failed: ${message}`);
        }
      }

      game.lastOutput = outputBuffer.join('\n');
      game.lastEvents = eventBuffer;
      game.lastTurnResult = lastTurnResult;
      game.lastChannels = channelBuffers;
      return game.lastOutput;
    },
  };

  return game;
}

/**
 * Flatten one channel payload value into deterministic golden lines
 * (ADR-294 D15): strings split on newline; arrays flatten entry-by-entry;
 * everything else (objects, numbers, booleans, null) serializes as
 * key-sorted single-line JSON so recordings are byte-stable regardless of
 * property insertion order.
 */
export function flattenChannelValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenChannelValue(entry));
  }
  if (typeof value === 'string') {
    return value.split('\n');
  }
  return [stableJson(value)];
}

/** JSON.stringify with recursively sorted object keys — one line, byte-stable. */
function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableJson(v)).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const body = keys
    .map((k) => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`)
    .join(',');
  return `{${body}}`;
}
