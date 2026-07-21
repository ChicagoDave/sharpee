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
import { flattenContent } from '@sharpee/channel-service';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
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
 * @throws if the module can't be resolved/required or exports no createStory()
 */
export async function loadStory(location: string, opts?: { entry?: string }): Promise<LoadedGame> {
  const modulePath = resolveStoryModulePath(location, opts?.entry);
  // ADR-248: the same provider serves the initial load and every
  // in-process restart reboot — purge, re-require, call the factory.
  const freshStory = moduleFreshStory(location, modulePath);
  return assembleGame(freshStory(), { freshStory });
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
export function assembleGame(story: any, opts?: { freshStory?: () => any }): LoadedGame {
  let engine!: GameEngine;
  let world!: WorldModel;
  let outputBuffer: string[] = [];
  let eventBuffer: ISemanticEvent[] = [];
  let pendingReboot = false;

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

    engine = new GameEngine({ world, player, parser, language, perceptionService });
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
    engine.start({ capabilities: CLI_CAPABILITIES } as any);

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
      const mainEntries = packet?.payload?.main;
      if (!Array.isArray(mainEntries) || mainEntries.length === 0) return;
      let out = '';
      for (const raw of mainEntries) {
        let content: any;
        let tight = false;
        if (Array.isArray(raw)) {
          content = raw;
        } else if (raw && typeof raw === 'object' && Array.isArray(raw.content)) {
          content = raw.content;
          tight = Boolean(raw.tight);
        } else {
          continue;
        }
        const text = flattenContent(content);
        if (!text.trim()) continue;
        if (out) out += tight ? '\n' : '\n\n';
        out += text;
      }
      if (out) outputBuffer.push(out);
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
      return game.lastOutput;
    },
  };

  return game;
}
