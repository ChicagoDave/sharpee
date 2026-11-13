/**
 * save-fork-host-hooks.test.ts — a save fork leaves the engine's save and
 * restore hooks as it found them, for every caller (GH #697; ADR-033;
 * ADR-307 D5 as amended 2026-11-12).
 *
 * Against a REAL game: the claim-bits fixture, compiled by `@sharpee/chord`,
 * loaded by `@sharpee/story-loader`, assembled by `@sharpee/bootstrap`. The
 * fork is `@sharpee/transcript-tester`'s own `captureSave` / `restoreSave`,
 * called directly and through a claims walk, which calls them directly too.
 *
 * A host registers its own save and restore hooks on the game. The fixture
 * known to fail is an engine that cannot report the hooks it holds: the fork
 * then has nothing to hand back, the host's hooks are gone after the first
 * step, and the counts must say so.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { captureSave, restoreSave } from '@sharpee/transcript-tester';
import { normalizeClaimSet } from '../src/claims/claim-set.js';
import { runClaims, type ClaimsRunOptions } from '../src/claims/claims-runner.js';
import type { ClaimsGame } from '../src/claims/claims-game.js';

const SEED = 1209;
const FIXTURES = resolve(__dirname, 'fixtures/claims');
const SOURCE = readFileSync(resolve(FIXTURES, 'claim-bits-fixture.story'), 'utf8');

function compileFixture(): StoryIR {
  const result = compile(SOURCE);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

/** The game bootstrap assembles, as this file reads it. */
type Loaded = ReturnType<typeof assembleGame>;

/** The hooks an engine holds, as it reports them. */
type EngineHooks = NonNullable<ReturnType<Loaded['engine']['getSaveRestoreHooks']>>;

/** The save data the engine hands a save hook. */
type SaveData = Parameters<NonNullable<EngineHooks['onSaveRequested']>>[0];

/** A booted game with a host's hooks on it, and what was asked of them. */
interface Hosted {
  loaded: Loaded;
  /** Reads the engine's hooks even after a case removes the engine's own read. */
  hooksNow: () => ReturnType<Loaded['engine']['getSaveRestoreHooks']>;
  hostHooks: { onSaveRequested: (data: SaveData) => Promise<void>; onRestoreRequested: () => Promise<SaveData | null> };
  hostSaves: SaveData[];
  hostRestoresAsked: number;
  /** Whether the engine accepted the save asked of it before each turn, in turn order. */
  savesBeforeTurn: boolean[];
}

interface HostOptions {
  /** Remove the engine's read of its own hooks, so a fork cannot learn what to hand back. */
  cannotReportHooks?: boolean;
  /** Ask the engine to save before each turn, as a `save` typed in the middle of a run would. */
  saveBeforeTurn?: boolean;
}

/** Boot one real game the way a host does: with the host's own hooks registered. */
function hostGame(options: HostOptions = {}): Hosted {
  const loaded = assembleGame(createStory(compileFixture(), { seed: SEED }), {
    seed: SEED,
    freshStory: () => createStory(compileFixture(), { seed: SEED }),
    undoSnapshots: 0,
  });
  const engine = loaded.engine;
  const hooksNow = engine.getSaveRestoreHooks.bind(engine);
  const hosted: Hosted = {
    loaded,
    hooksNow,
    hostHooks: {
      onSaveRequested: async (data) => {
        hosted.hostSaves.push(data);
      },
      onRestoreRequested: async () => {
        hosted.hostRestoresAsked += 1;
        return null;
      },
    },
    hostSaves: [],
    hostRestoresAsked: 0,
    savesBeforeTurn: [],
  };
  engine.registerSaveRestoreHooks(hosted.hostHooks);
  if (options.saveBeforeTurn) {
    const executeTurn = engine.executeTurn.bind(engine);
    engine.executeTurn = (async (input: string) => {
      hosted.savesBeforeTurn.push(await engine.save());
      return executeTurn(input);
    }) as typeof engine.executeTurn;
  }
  if (options.cannotReportHooks) {
    (engine as { getSaveRestoreHooks?: unknown }).getSaveRestoreHooks = undefined;
  }
  return hosted;
}

describe('REAL-PATH — a save fork hands the engine\'s hooks back', () => {
  it('a capture and a restore leave the host\'s own hooks on the engine, and never ask the host', async () => {
    const hosted = hostGame();
    const { engine } = hosted.loaded;

    const save = await captureSave(engine);
    expect(save).not.toBeNull();
    expect(hosted.hooksNow()?.onSaveRequested).toBe(hosted.hostHooks.onSaveRequested);
    expect(hosted.hooksNow()?.onRestoreRequested).toBe(hosted.hostHooks.onRestoreRequested);

    const atCapture = hosted.loaded.world.toJSON();
    await hosted.loaded.executeCommand('north');
    expect(hosted.loaded.world.toJSON()).not.toBe(atCapture);
    expect(await restoreSave(engine, save)).toBe(true);
    expect(hosted.loaded.world.toJSON()).toBe(atCapture);
    expect(hosted.hooksNow()?.onSaveRequested).toBe(hosted.hostHooks.onSaveRequested);
    expect(hosted.hooksNow()?.onRestoreRequested).toBe(hosted.hostHooks.onRestoreRequested);

    expect(hosted.hostSaves).toHaveLength(0);
    expect(hosted.hostRestoresAsked).toBe(0);
    // The host's hooks still work: the engine's own save reaches the host.
    expect(await engine.save()).toBe(true);
    expect(hosted.hostSaves).toHaveLength(1);
  }, 30_000);

  it('a restore the engine refuses still hands the hooks back', async () => {
    const hosted = hostGame();
    const { engine } = hosted.loaded;

    expect(await restoreSave(engine, null)).toBe(false);
    expect(hosted.hooksNow()?.onSaveRequested).toBe(hosted.hostHooks.onSaveRequested);
    expect(hosted.hooksNow()?.onRestoreRequested).toBe(hosted.hostHooks.onRestoreRequested);
    expect(hosted.hostRestoresAsked).toBe(0);
  }, 30_000);

  it('a capture the engine refuses still hands the hooks back', async () => {
    const hosted = hostGame();
    const { engine } = hosted.loaded;
    engine.save = async () => false;

    expect(await captureSave(engine)).toBeNull();
    expect(hosted.hooksNow()?.onSaveRequested).toBe(hosted.hostHooks.onSaveRequested);
    expect(hosted.hooksNow()?.onRestoreRequested).toBe(hosted.hostHooks.onRestoreRequested);
    expect(hosted.hostSaves).toHaveLength(0);
  }, 30_000);

  it('a save or a restore that throws still hands the hooks back, and the throw reaches the caller', async () => {
    const hosted = hostGame();
    const { engine } = hosted.loaded;
    const save = await captureSave(engine);
    engine.save = async () => {
      throw new Error('the save blew up');
    };
    engine.restore = async () => {
      throw new Error('the restore blew up');
    };

    await expect(captureSave(engine)).rejects.toThrow('the save blew up');
    expect(hosted.hooksNow()?.onSaveRequested).toBe(hosted.hostHooks.onSaveRequested);
    expect(hosted.hooksNow()?.onRestoreRequested).toBe(hosted.hostHooks.onRestoreRequested);

    await expect(restoreSave(engine, save)).rejects.toThrow('the restore blew up');
    expect(hosted.hooksNow()?.onSaveRequested).toBe(hosted.hostHooks.onSaveRequested);
    expect(hosted.hooksNow()?.onRestoreRequested).toBe(hosted.hostHooks.onRestoreRequested);
  }, 30_000);

  it('a fork on an engine with no save or restore hook leaves it with none', async () => {
    const loaded = assembleGame(createStory(compileFixture(), { seed: SEED }), { seed: SEED, undoSnapshots: 0 });
    const { engine } = loaded;
    expect(engine.getSaveRestoreHooks()?.onSaveRequested).toBeUndefined();

    const save = await captureSave(engine);
    expect(save).not.toBeNull();
    expect(await restoreSave(engine, save)).toBe(true);

    expect(engine.getSaveRestoreHooks()?.onSaveRequested).toBeUndefined();
    expect(engine.getSaveRestoreHooks()?.onRestoreRequested).toBeUndefined();
    // With no hook, the engine has no save capability, as before the fork.
    expect(await engine.save()).toBe(false);
    expect(await engine.restore()).toBe(false);
  }, 30_000);

  it('the fixture known to fail: on an engine that cannot report its hooks, one capture removes the host\'s', async () => {
    const hosted = hostGame({ cannotReportHooks: true });
    const { engine } = hosted.loaded;

    expect(await captureSave(engine)).not.toBeNull();
    expect(hosted.hooksNow()?.onSaveRequested).toBeUndefined();
    expect(await engine.save()).toBe(false);
    expect(hosted.hostSaves).toHaveLength(0);
  }, 30_000);
});

describe('REAL-PATH — a claims walk leaves the host\'s hooks alone', () => {
  const OPTIONS: ClaimsRunOptions = { seed: SEED, maxStates: 5000, maxSeconds: 30, maxDepth: 40 };
  const claimSet = () => normalizeClaimSet(JSON.parse(readFileSync(resolve(FIXTURES, 'claims.json'), 'utf8')), 'claims.json');

  /** Run the fixture's claims on hosted games, returning the run and every game it booted. */
  async function walkHosted(options: HostOptions) {
    const games: Hosted[] = [];
    const run = await runClaims(compileFixture(), claimSet(), async () => {
      const hosted = hostGame(options);
      games.push(hosted);
      return hosted.loaded as unknown as ClaimsGame;
    }, OPTIONS);
    return { run, games };
  }

  it('a save asked of the engine before every walked turn is answered by the host, and the verdicts do not move', async () => {
    const { run, games } = await walkHosted({ saveBeforeTurn: true });
    const quiet = await walkHosted({});

    expect(games).toHaveLength(1);
    const [hosted] = games;
    // The opening look and every command the walk tried.
    expect(hosted.savesBeforeTurn).toHaveLength(run.walks[0].commandsExecuted + 1);
    expect(hosted.savesBeforeTurn.every((accepted) => accepted)).toBe(true);
    expect(hosted.hostSaves).toHaveLength(hosted.savesBeforeTurn.length);
    // The walk's own restores never asked the host.
    expect(run.walks[0].restores).toBeGreaterThan(0);
    expect(hosted.hostRestoresAsked).toBe(0);

    const verdicts = (claims: typeof run.claims) => claims.map(({ name, verdict, settledBy, witness }) => ({ name, verdict, settledBy, witness }));
    expect(verdicts(run.claims)).toEqual(verdicts(quiet.run.claims));
    expect(run.walks[0].statesDiscovered).toBe(quiet.run.walks[0].statesDiscovered);
  }, 60_000);

  it('the host\'s hooks are the ones on the game when the walk ends', async () => {
    const { run, games } = await walkHosted({});

    expect(run.walks[0].saves).toBeGreaterThan(1);
    expect(games[0].hooksNow()?.onSaveRequested).toBe(games[0].hostHooks.onSaveRequested);
    expect(games[0].hooksNow()?.onRestoreRequested).toBe(games[0].hostHooks.onRestoreRequested);
  }, 60_000);

  it('the fixture known to fail: on an engine that cannot report its hooks, the host is not asked after the walk\'s first save', async () => {
    const { run, games } = await walkHosted({ saveBeforeTurn: true, cannotReportHooks: true });

    const [hosted] = games;
    expect(run.walks[0].commandsExecuted).toBeGreaterThan(0);
    // Only the opening look came before the walk's first capture.
    expect(hosted.savesBeforeTurn[0]).toBe(true);
    expect(hosted.savesBeforeTurn.slice(1).every((accepted) => !accepted)).toBe(true);
    expect(hosted.hostSaves).toHaveLength(1);
    expect(hosted.hooksNow()?.onSaveRequested).toBeUndefined();
  }, 60_000);
});
