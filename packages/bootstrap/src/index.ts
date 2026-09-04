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
import { GameEngine, type TurnResult } from '@sharpee/engine';
import { type ISemanticEvent } from '@sharpee/core';
import { packetProseText } from '@sharpee/channel-service';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { PerceptionService, channelRegistry } from '@sharpee/stdlib';
// @ts-ignore — lang-en-us ships without bundled .d.ts in some build modes
import { LanguageProvider } from '@sharpee/lang-en-us';
import { TestingExtension } from '@sharpee/ext-testing';

/**
 * CLI / test capability profile (ADR-165 §8). Only the prose channels
 * produce visible output in test mode; status/prompt/info/etc. are
 * available to interactive mode but ignored here.
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
  authorChannels: false,
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
   * Per-command capture of declared channels (ADR-294 D15): flattened
   * lines per channel id, in emission order. Empty unless the game was
   * assembled with an explicit `channels` list. Separate from
   * `lastOutput`, which is the turn's composed prose (ADR-300 D9) — a
   * declared prose channel appears in both, answering two different
   * questions.
   */
  lastChannels: Record<string, string[]>;
  /**
   * Per-command capture of declared channels as their STRUCTURED values, in
   * emission order (ADR-300 D13).
   *
   * `lastChannels` flattens everything to lines, which is what a golden
   * recording wants — deterministic, diffable text. But an assertion that
   * addresses into a record (`banner.title`) or checks a number needs the
   * value, not a rendering of it, and a flattened line cannot be un-flattened.
   * So both are captured: the same emissions, kept two ways for two questions.
   *
   * Additive. `lastChannels` is unchanged, so a harness reading only it sees
   * exactly what it saw before (ADR-302 D15's freeze).
   */
  lastChannelValues: Record<string, unknown[]>;
  /**
   * Structured channel values captured during BOOT — everything the story
   * said before the first command (the banner and the prologue travel on
   * their own channels). `executeCommand` resets the per-command buffers,
   * which silently discarded the opening's captures; this snapshot is taken
   * once, just before the first reset, so a transcript's opening claims can
   * read what the player actually saw (David, 2026-08-09). Additive —
   * empty until the first command executes.
   */
  bootChannelValues: Record<string, unknown[]>;
  /**
   * The story's transcript auto-assertion policy (Phase 6e, #253), read off
   * `story.config.autoAssertion` at assembly. The test runner consults it at
   * the ADR-294 D2 tier boundary: under a policy, a bare (assertion-less)
   * command's first run auto-writes the policy's assertion instead of
   * failing. Absent = "let me decide" — the boundary failure stands.
   */
  autoAssertionPolicy?: 'all-emitted-text' | 'room-description' | 'room-name-and-description';
  /** Proxy for runner save/restore plugin state. */
  getPluginRegistry(): {
    getStates(): Record<string, unknown>;
    setStates(states: Record<string, unknown>): void;
  };
  /** Execute one command; returns the turn's composed prose as text. */
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
 *   `assembleGame`; absent → `[]` (prose still rides `lastOutput`)
 * @param opts.presence presence presentation (ADR-328 D3), forwarded to
 *   `assembleGame`; absent → the platform default (hide `absent`)
 * @throws if the module can't be resolved/required or exports no createStory()
 */
export async function loadStory(
  location: string,
  opts?: { entry?: string; seed?: number; channels?: string[]; presence?: 'default' | 'omniscient' },
): Promise<LoadedGame> {
  const modulePath = resolveStoryModulePath(location, opts?.entry);
  // ADR-248: the same provider serves the initial load and every
  // in-process restart reboot — purge, re-require, call the factory.
  const freshStory = moduleFreshStory(location, modulePath);
  return assembleGame(freshStory(), {
    freshStory,
    ...(opts?.seed !== undefined ? { seed: opts.seed } : {}),
    ...(opts?.channels !== undefined ? { channels: opts.channels } : {}),
    ...(opts?.presence !== undefined ? { presence: opts.presence } : {}),
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
     * Declared capture channels (ADR-294 D15). The turn's composed prose
     * rides `lastOutput` regardless; each id named here is additionally
     * captured per command into `lastChannels`, and its `gatedBy`
     * capability (if any) is enabled on top of CLI_CAPABILITIES so the
     * story emits it in test mode. Absent → no per-channel capture.
     */
    channels?: string[];
    /**
     * How presence-tagged prose is presented in `lastOutput` (ADR-328 D3).
     * Absent = the platform default (an `absent` entry is hidden — what a
     * player sees, what goldens mean). `'omniscient'` shows every actor
     * emission labelled by location, for testing NPC behaviour off-stage.
     */
    presence?: 'default' | 'omniscient';
  }
): LoadedGame {
  let engine!: GameEngine;
  let world!: WorldModel;
  let outputBuffer: string[] = [];
  let eventBuffer: ISemanticEvent[] = [];
  let channelBuffers: Record<string, string[]> = {};
  let channelValueBuffers: Record<string, unknown[]> = {};
  /** True once the boot's channel captures were snapshotted (first command). */
  let bootCapturesSaved = false;
  let pendingReboot = false;

  // ADR-294 D15: the story's channels must be registered BEFORE capability
  // derivation — a story-registered gated channel declared in `channels`
  // needs its `gatedBy` looked up now. Registration is last-wins, so the
  // engine's own registration during start() is a harmless re-register.
  story?.registerChannels?.(channelRegistry);
  // ADR-300 D8: there is no `main` to exclude any more. A transcript that
  // declares a prose channel by name (`channels: room-name`) gets it
  // captured here as well as composed into `lastOutput` — the two are
  // different questions ("what did this channel say" vs "what did the turn
  // read like"), so neither shadows the other.
  // Phase 6e (#253): a room-scoped auto-assertion policy needs the turn's
  // room-name/room-description EMISSIONS (the honest source of "what it
  // said" — the world snapshot has no rendered description), so those two
  // standard channels join the capture set. Unioned, not replacing: a
  // transcript's own declared channels are untouched, and the extra capture
  // is invisible to golden recordings (they read only the ids they name).
  const policy = (story?.config as { autoAssertion?: LoadedGame['autoAssertionPolicy'] } | undefined)
    ?.autoAssertion;
  const policyChannels =
    policy === 'room-description' || policy === 'room-name-and-description'
      ? ['room-name', 'room-description']
      : [];
  // The OPENING's channels are always captured (David, 2026-08-09): the
  // banner and the prologue flush at boot, and a transcript's opening
  // claims read them via the boot snapshot (`bootChannelValues`) — which
  // stays empty unless someone subscribes. Standard-registry channels, so
  // the lookup below always resolves; invisible to golden recordings, same
  // as the policy channels above.
  // `info` joins these because synthesizeOpeningAssertions reads its `title` and
  // `description` (ADR-300 D13 dotted-path claims) — it was reading a channel
  // nothing captured, so that whole branch was unreachable and every story's
  // opening card recorded empty (GH #280). `banner` stays: it is the RENDERED
  // banner (sparse, from game.started) and is claimable by hand in the IDE
  // picker, deliberately not auto-synthesized (David 2026-08-10).
  const openingChannels = ['banner', 'prologue', 'info'];
  const capturedChannels = [
    ...new Set([...(opts?.channels ?? []), ...policyChannels, ...openingChannels]),
  ];
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
    // Registration merges (#229), so this survives a runner registering its
    // own save/restore hooks later — which is exactly what used to destroy it.
    engine.registerSaveRestoreHooks({
      onRestartRequested: async (): Promise<boolean> => {
        pendingReboot = true;
        return true;
      },
    });

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

    // channel:packet fires per turn. Compose the turn's prose channels in
    // `preferred-layout` order (ADR-300 D8/D9) and flatten to plain text.
    // Composing before flattening is what makes `tight` mean the right
    // thing — it refers to the entry's predecessor in the turn's reading
    // order, which routinely sits on a different channel now.
    // ADR-328 D3: the presence presentation is fixed at assembly, and the
    // location label resolves against the live world (a restart reboot
    // rebinds `world`, and this closure reads the binding, not a copy).
    const presentation = {
      ...(opts?.presence !== undefined ? { presence: opts.presence } : {}),
      locationLabel: (id: string) => world.getEntity(id)?.name ?? id,
    };
    engine.on('channel:packet', (packet: any) => {
      const out = packetProseText(packet?.payload, presentation);
      if (out) outputBuffer.push(out);
      // ADR-294 D15: capture each declared channel's payload as
      // deterministic lines. Absent payload = the channel emitted nothing
      // this turn (sparse) — meaningful, recorded as absence.
      for (const id of capturedChannels) {
        const value = packet?.payload?.[id];
        if (value === undefined) continue;
        (channelBuffers[id] ??= []).push(...flattenChannelValue(value));
        (channelValueBuffers[id] ??= []).push(value);
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
    ...(policy !== undefined ? { autoAssertionPolicy: policy } : {}),
    lastOutput: '',
    lastEvents: [],
    lastTurnResult: null,
    lastChannels: {},
    lastChannelValues: {},
    bootChannelValues: {},

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
      // The boot's captures (banner, prologue — flushed by engine start,
      // before any command) are snapshotted once, just before the first
      // per-command reset would silently discard them. Flag-guarded: an
      // empty boot must not make a later command's buffers pass as boot's.
      if (!bootCapturesSaved) {
        bootCapturesSaved = true;
        game.bootChannelValues = channelValueBuffers;
      }
      outputBuffer = [];
      eventBuffer = [];
      channelBuffers = {};
      channelValueBuffers = {};
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
      game.lastChannelValues = channelValueBuffers;
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
