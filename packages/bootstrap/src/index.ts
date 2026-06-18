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
 * Public interface: `resolveStoryModulePath`, `loadStory`, `assembleGame`, `LoadedGame`.
 */

import * as path from 'path';
import * as fs from 'fs';
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
}

/**
 * Resolve the story module file to `require`, entry-aware.
 *
 * With no `entry`, returns `<location>/dist/index.js` (then `src/index.ts`).
 * With `entry`, tries `dist/<entry>.js`, `dist/<entry>/index.js`, then the
 * `src` equivalents. `entry` must be a bare name — path separators, `..`, and
 * absolute paths are rejected (a transcript header cannot escape the dir).
 *
 * @throws if `entry` is unsafe, or no candidate module exists.
 */
export function resolveStoryModulePath(location: string, entry?: string): string {
  const base = path.isAbsolute(location) ? location : path.resolve(process.cwd(), location);

  if (entry !== undefined && entry !== '') {
    if (path.isAbsolute(entry) || /[\\/]/.test(entry) || entry.split(path.sep).includes('..') || entry.includes('..')) {
      throw new Error(
        `Invalid story entry "${entry}": must be a bare name with no path separators or "..".`
      );
    }
    const candidates = [
      path.join(base, 'dist', `${entry}.js`),
      path.join(base, 'dist', entry, 'index.js'),
      path.join(base, 'src', `${entry}.ts`),
      path.join(base, 'src', entry, 'index.ts'),
    ];
    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) {
      throw new Error(
        `Could not resolve story entry "${entry}" under ${base}. Tried:\n  ${candidates.join('\n  ')}`
      );
    }
    return found;
  }

  const distIndex = path.join(base, 'dist', 'index.js');
  if (fs.existsSync(distIndex)) return distIndex;
  const srcIndex = path.join(base, 'src', 'index.ts');
  if (fs.existsSync(srcIndex)) return srcIndex;
  throw new Error(`Could not load story from ${location}: no dist/index.js or src/index.ts`);
}

/**
 * Load a story by location (entry-aware) and assemble a runnable game.
 *
 * @param location  path to the story directory
 * @param opts.entry optional story sub-entry to pin (transcript `entry:` header)
 * @throws if the module can't be resolved/required or exports no story
 */
export async function loadStory(location: string, opts?: { entry?: string }): Promise<LoadedGame> {
  const modulePath = resolveStoryModulePath(location, opts?.entry);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const storyModule = require(modulePath);
  const story = storyModule.story || storyModule.default;
  if (!story) {
    throw new Error(`Story module at ${modulePath} does not export 'story' or 'default'`);
  }
  return assembleGame(story);
}

/**
 * Assemble a runnable game from an already-loaded story instance, wired to the
 * ADR-163 channel-packet output path.
 */
export function assembleGame(story: any): LoadedGame {
  const world = new WorldModel();
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  const language = new LanguageProvider();
  const parser = new Parser(language);

  if (story.extendParser) story.extendParser(parser);
  if (story.extendLanguage) story.extendLanguage(language);

  const perceptionService = new PerceptionService();

  const engine = new GameEngine({ world, player, parser, language, perceptionService });
  engine.setStory(story);

  const testingExtension = TestingExtension ? new TestingExtension() : null;

  let outputBuffer: string[] = [];
  let eventBuffer: ISemanticEvent[] = [];

  // Start the channel-I/O pipeline (ADR-163). The engine builds its
  // ChannelService internally from these capabilities during start().
  engine.start({ capabilities: CLI_CAPABILITIES } as any);

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

  const game: LoadedGame = {
    engine,
    world,
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

      game.lastOutput = outputBuffer.join('\n');
      game.lastEvents = eventBuffer;
      game.lastTurnResult = lastTurnResult;
      return game.lastOutput;
    },
  };

  return game;
}
