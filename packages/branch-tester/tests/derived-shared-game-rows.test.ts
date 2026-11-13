/**
 * derived-shared-game-rows.test.ts — the rows a shared derived game is most
 * likely to get wrong: one that saves or restores while it runs, and one
 * that needs a working undo (GH #696; ADR-307 D5 as amended 2026-11-12).
 *
 * Against a REAL game: each story is compiled by `@sharpee/chord`, loaded by
 * `@sharpee/story-loader` and assembled by `@sharpee/bootstrap`; every save,
 * restore and undo is the engine's own.
 *
 * What a derived row can type. A row's command comes from a clause, and the
 * story loader refuses a clause on `saving` or `restoring` (no standard
 * action consults them; seen at load), so no row types the engine's own
 * `save` or `restore`. A row can still type a line that begins with one of
 * those words: a story action whose grammar does. Those rows are here, and
 * the engine's save is driven directly in the middle of every row as well.
 *
 * A host registers its own save and restore hooks on a game. The suite's
 * fork save borrows those two hooks for each capture and restore and must
 * hand them back, so a save asked for while a row runs is answered by the
 * host and not by the fork save. The fixture known to fail is an engine that
 * cannot report the hooks it holds: the hand-back then has nothing to give
 * back, the host is never asked, and the count must say so.
 *
 * A row whose command types `undo` boots a game of its own, with snapshots.
 * The engine takes no snapshot for a turn whose line begins with `undo`, so
 * the row's own turn leaves nothing to undo; the next turn on that game
 * does. The fixture known to fail is a loader that ignores the request and
 * boots that game without snapshots: it cannot undo, and the check says so.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import type { GameLoadRequest } from '../src/game-load-request.js';
import { runDerivedSuite, type DerivedGame, type DerivedOutcome } from '../src/derived-runner.js';

const SEED = 42;

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

/** The game bootstrap assembles, as this file reads it. */
type Loaded = ReturnType<typeof assembleGame>;

/** The hooks an engine holds, as it reports them. */
type EngineHooks = NonNullable<ReturnType<Loaded['engine']['getSaveRestoreHooks']>>;

/** The save data the engine hands a save hook. */
type SaveData = Parameters<NonNullable<EngineHooks['onSaveRequested']>>[0];

/** One boot, and what was asked of the host's hooks on it. */
interface Boot {
  request: GameLoadRequest;
  loaded: Loaded;
  /** The world serialized as booted. */
  bootWorld: string;
  /** Every save the host's own hook was handed, in order. */
  hostSaves: SaveData[];
  /** How many times the host's own restore hook was asked for a save. */
  hostRestoresAsked: number;
  /** The host's hooks, by identity. */
  hostHooks: { onSaveRequested: (data: SaveData) => Promise<void>; onRestoreRequested: () => Promise<SaveData | null> };
  /** The line of each turn the engine ran, and the world serialized just before it. */
  turns: Array<{ input: string; worldBefore: string }>;
  /** Whether the engine accepted the save asked of it in the middle of each row, in turn order. */
  savesMidRow: boolean[];
  /** The world serialized just after each engine restore. */
  afterRestore: string[];
}

/** How a loader's games are made to misbehave, when a case needs one that does. */
type Tamper = 'none' | 'cannot-report-hooks' | 'ignores-undo-request';

interface HostLoaderOptions {
  tamper?: Tamper;
  /** Ask the engine to save just before each turn, as an author's `save` in the middle of a row would. */
  saveMidRow?: boolean;
}

/**
 * A loader that boots the way a host does: it registers its own save and
 * restore hooks on every game, and records each boot. The host's restore
 * hook answers with the save of the game as booted.
 */
function hostLoader(source: string, options: HostLoaderOptions = {}): {
  boots: Boot[];
  loadGame: (request: GameLoadRequest) => Promise<DerivedGame>;
} {
  const tamper = options.tamper ?? 'none';
  const boots: Boot[] = [];
  const loadGame = async (request: GameLoadRequest): Promise<DerivedGame> => {
    const keepsSnapshots = request.undo && tamper !== 'ignores-undo-request';
    const loaded = assembleGame(createStory(compileSource(source), { seed: SEED }), {
      seed: SEED,
      freshStory: () => createStory(compileSource(source), { seed: SEED }),
      ...(keepsSnapshots ? {} : { undoSnapshots: 0 }),
    });
    const engine = loaded.engine;
    let asBooted: SaveData | null = null;
    const boot: Boot = {
      request,
      loaded,
      bootWorld: loaded.world.toJSON(),
      hostSaves: [],
      hostRestoresAsked: 0,
      hostHooks: {
        onSaveRequested: async (data) => {
          boot.hostSaves.push(data);
        },
        onRestoreRequested: async () => {
          boot.hostRestoresAsked += 1;
          return asBooted;
        },
      },
      turns: [],
      savesMidRow: [],
      afterRestore: [],
    };
    engine.registerSaveRestoreHooks(boot.hostHooks);
    // The host's own save of the game as booted, taken through the engine.
    if (!(await engine.save())) throw new Error('fixture: the engine refused the host\'s boot save');
    asBooted = boot.hostSaves.pop() ?? null;
    if (asBooted === null) throw new Error('fixture: the host\'s save hook was not handed the boot save');

    const executeTurn = engine.executeTurn.bind(engine);
    engine.executeTurn = (async (input: string) => {
      if (options.saveMidRow) boot.savesMidRow.push(await engine.save());
      boot.turns.push({ input, worldBefore: loaded.world.toJSON() });
      return executeTurn(input);
    }) as typeof engine.executeTurn;
    const restore = engine.restore.bind(engine);
    engine.restore = async () => {
      const accepted = await restore();
      boot.afterRestore.push(loaded.world.toJSON());
      return accepted;
    };
    if (tamper === 'cannot-report-hooks') {
      (engine as { getSaveRestoreHooks?: unknown }).getSaveRestoreHooks = undefined;
    }
    boots.push(boot);
    return loaded as unknown as DerivedGame;
  };
  return { boots, loadGame };
}

/** The one row whose typed command is this line. */
function rowTyping(outcomes: DerivedOutcome[], command: string): DerivedOutcome {
  const rows = outcomes.filter((outcome) => outcome.command === command);
  expect(rows).toHaveLength(1);
  return rows[0];
}

// Two story actions whose lines begin with `save` and `restore`, each
// writing the crate's state, and a taking that writes it too, so every row
// leaves something for the next row's restore to put back.
const SAVE_ROWS = `story
  title: Derived Save Rows
  authors:
    Sharpee
  id: derived-save-rows
  story-version: 0.0.1

create the Cellar
  a room

  A cellar.

create the crate
  a thing, stowable
  states: sealed, stowed, fetched, opened
  in the Cellar

  A crate.

  after the player taking
    change the crate to opened
    phrase crate-taken
  end after

create Alex
  a person, proper
  playable
  starts in the Cellar

define trait stowable
  on the player stowing
    change it to stowed
    phrase crate-stowed
  end on
  on the player fetching
    change it to fetched
    phrase crate-fetched
  end on
end trait

define action stowing
  grammar
    save the target
  the target must be reachable
  otherwise refuse cannot-stow

  phrases en-US
    cannot-stow:
      Nothing to stow.

define action fetching
  grammar
    restore the target
  the target must be reachable
  otherwise refuse cannot-fetch

  phrases en-US
    cannot-fetch:
      Nothing to fetch.

define phrase crate-stowed
  Stowed.
end phrase
define phrase crate-fetched
  Fetched.
end phrase
define phrase crate-taken
  The lid comes off.
end phrase

before the game starts
  change the player to Alex
end before
`;

describe('REAL-PATH — rows that save or restore on the shared derived game', () => {
  it('a row whose line begins with save or restore runs the story\'s action on the shared game, and never reaches the host', async () => {
    const { boots, loadGame } = hostLoader(SAVE_ROWS);
    const run = await runDerivedSuite(compileSource(SAVE_ROWS), loadGame);

    expect(boots).toHaveLength(1);
    expect(rowTyping(run.outcomes, 'save crate').status).toBe('passed');
    expect(rowTyping(run.outcomes, 'restore crate').status).toBe('passed');
    expect(rowTyping(run.outcomes, 'take crate').status).toBe('passed');
    expect(run.errored).toBe(0);
    // Neither the fork save's captures and restores nor those two rows asked the host.
    expect(boots[0].hostSaves).toHaveLength(0);
    expect(boots[0].hostRestoresAsked).toBe(0);
  }, 60_000);

  it('a save asked of the engine in the middle of every row is answered by the host\'s own hook', async () => {
    const { boots, loadGame } = hostLoader(SAVE_ROWS, { saveMidRow: true });
    const run = await runDerivedSuite(compileSource(SAVE_ROWS), loadGame);

    const [boot] = boots;
    expect(boot.turns.length).toBeGreaterThan(2);
    expect(boot.savesMidRow).toEqual(boot.turns.map(() => true));
    expect(boot.hostSaves).toHaveLength(boot.turns.length);
    // Saving in the middle of a row changes nothing the row reports.
    const quiet = await runDerivedSuite(compileSource(SAVE_ROWS), hostLoader(SAVE_ROWS).loadGame);
    const reported = ({ branch: _branch, ...rest }: DerivedOutcome): Omit<DerivedOutcome, 'branch'> => rest;
    expect(run.outcomes.map(reported)).toEqual(quiet.outcomes.map(reported));
  }, 60_000);

  it('the fixture known to fail: an engine that cannot report its hooks loses the host\'s, and the count shows it', async () => {
    const { boots, loadGame } = hostLoader(SAVE_ROWS, { saveMidRow: true, tamper: 'cannot-report-hooks' });
    await runDerivedSuite(compileSource(SAVE_ROWS), loadGame);

    const [boot] = boots;
    expect(boot.turns.length).toBeGreaterThan(2);
    expect(boot.savesMidRow).toEqual(boot.turns.map(() => false));
    expect(boot.hostSaves).toHaveLength(0);
  }, 60_000);

  it('every row after a save or restore row still starts from the boot world, and the host\'s hooks are on the game at the end', async () => {
    const { boots, loadGame } = hostLoader(SAVE_ROWS, { saveMidRow: true });
    await runDerivedSuite(compileSource(SAVE_ROWS), loadGame);

    const [boot] = boots;
    // One restore for the vocabulary read and one for each row that ran a turn, at least.
    expect(boot.afterRestore.length).toBeGreaterThan(boot.turns.length);
    for (const world of boot.afterRestore) expect(world).toBe(boot.bootWorld);
    const hooks = boot.loaded.engine.getSaveRestoreHooks();
    expect(hooks?.onSaveRequested).toBe(boot.hostHooks.onSaveRequested);
    expect(hooks?.onRestoreRequested).toBe(boot.hostHooks.onRestoreRequested);
    // The host's restore, asked after the suite on a world a turn has
    // written, is the host's own and lands on its boot save.
    await boot.loaded.executeCommand('take crate');
    expect(boot.loaded.world.toJSON()).not.toBe(boot.bootWorld);
    expect(await boot.loaded.engine.restore()).toBe(true);
    expect(boot.hostRestoresAsked).toBe(1);
    expect(boot.loaded.world.toJSON()).toBe(boot.bootWorld);
  }, 60_000);
});

describe('REAL-PATH — the game booted for an undo row can undo', () => {
  // The vine fixture with its story action's first word made `undo`, so the
  // rows of that action type a command that can ask for undo.
  const source = readFileSync(resolve(__dirname, 'fixtures/derived/vine.story'), 'utf8').replace('    prune the target', '    undo the target');

  /** The boots made for rows whose line begins with `undo`. */
  function undoBoots(boots: Boot[]): Boot[] {
    return boots.filter((boot) => boot.request.undo && boot.turns.length === 1 && boot.turns[0].input.startsWith('undo '));
  }

  it('the row\'s own turn leaves nothing to undo, and the next turn on that game is undone to the world before it', async () => {
    const { boots, loadGame } = hostLoader(source);
    const run = await runDerivedSuite(compileSource(source), loadGame);
    expect(run.errored).toBe(0);

    const booted = undoBoots(boots);
    expect(booted.length).toBeGreaterThan(0);
    for (const boot of booted) {
      const { engine, world } = boot.loaded;
      // No snapshot for a line that begins with `undo`.
      expect(engine.canUndo()).toBe(false);
      const beforeWait = world.toJSON();
      await boot.loaded.executeCommand('wait');
      expect(engine.canUndo()).toBe(true);
      expect(world.toJSON()).not.toBe(beforeWait);
      expect(engine.undo()).toBe(true);
      expect(world.toJSON()).toBe(beforeWait);
    }
    // The game the other rows share keeps no snapshots, whatever it is asked.
    const shared = boots.filter((boot) => !boot.request.undo);
    expect(shared).toHaveLength(1);
    await shared[0].loaded.executeCommand('wait');
    expect(shared[0].loaded.engine.canUndo()).toBe(false);
  }, 60_000);

  it('the fixture known to fail: a loader that ignores the undo request boots a game that cannot undo', async () => {
    const { boots, loadGame } = hostLoader(source, { tamper: 'ignores-undo-request' });
    await runDerivedSuite(compileSource(source), loadGame);

    const booted = undoBoots(boots);
    expect(booted.length).toBeGreaterThan(0);
    for (const boot of booted) {
      await boot.loaded.executeCommand('wait');
      expect(boot.loaded.engine.canUndo()).toBe(false);
      expect(boot.loaded.engine.undo()).toBe(false);
    }
  }, 60_000);
});
