/**
 * derived-one-boot.test.ts — a derived suite boots one game and restores it
 * before each row (engine-test-performance plan, Phase 5; ADR-307 D5 as
 * amended 2026-11-12).
 *
 * Against a REAL game: the test story `test-stories/orchard`, compiled by
 * `@sharpee/chord`, loaded by `@sharpee/story-loader`, assembled by
 * `@sharpee/bootstrap`; every restore is the engine's own. The count is of
 * boots, taken by a loader that records each one; nothing here measures time.
 *
 * The count's fixture known to fail is the same story through a game whose
 * engine refuses to save: with nothing to restore, every row that runs boots,
 * and the count must say so. That run is also what the shared run is held
 * to: the two must report the same outcome for every row.
 *
 * Skipped when the test stories are not configured (a published tarball).
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import type { GameLoadRequest } from '../src/game-load-request.js';
import { runDerivedSuite, type DerivedGame, type DerivedOutcome } from '../src/derived-runner.js';

const SEED = 42;
const testStories = process.env.SHARPEE_TEST_STORIES;
const ORCHARD = testStories ? resolve(testStories, 'orchard/orchard.story') : undefined;

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

/** What a real engine lets this file change about it. */
interface TamperableEngine {
  save(): Promise<boolean>;
  restore(): Promise<boolean>;
  canUndo(): boolean;
}

/** How a loader's games are made to misbehave, when a case needs one that does. */
type Tamper = 'none' | 'refuses-to-save' | 'refuses-to-restore' | 'no-save-surface' | 'restore-does-nothing';

/** One boot a loader made, and the world as each restore on it found it and left it. */
interface Boot {
  request: GameLoadRequest;
  game: DerivedGame;
  canUndo: () => boolean;
  /** The world serialized as booted. */
  bootWorld: string;
  /** The world serialized just before each restore, and just after it. */
  restores: Array<{ before: string; after: string }>;
  /** The save and restore hooks registered on the engine now. */
  hooks: () => { onSaveRequested?: object; onRestoreRequested?: object } | undefined;
}

/** A loader that boots the way `sharpee test` does and records every boot it makes. */
function recordingLoader(source: string, tamper: Tamper = 'none'): {
  boots: Boot[];
  loadGame: (request: GameLoadRequest) => Promise<DerivedGame>;
} {
  const boots: Boot[] = [];
  const loadGame = async (request: GameLoadRequest): Promise<DerivedGame> => {
    const loaded = assembleGame(createStory(compileSource(source), { seed: SEED }), {
      seed: SEED,
      freshStory: () => createStory(compileSource(source), { seed: SEED }),
      ...(request.undo ? {} : { undoSnapshots: 0 }),
    });
    const engine = loaded.engine as TamperableEngine & { save?: () => Promise<boolean> };
    const boot: Boot = {
      request,
      game: loaded as unknown as DerivedGame,
      canUndo: () => engine.canUndo(),
      bootWorld: loaded.world.toJSON(),
      restores: [],
      hooks: () => loaded.engine.getSaveRestoreHooks(),
    };
    if (tamper === 'refuses-to-save') engine.save = async () => false;
    if (tamper === 'refuses-to-restore') engine.restore = async () => false;
    if (tamper === 'no-save-surface') engine.save = undefined;
    const restore = tamper === 'restore-does-nothing' ? async () => true : engine.restore.bind(engine);
    if (tamper !== 'refuses-to-restore') {
      engine.restore = async () => {
        const before = loaded.world.toJSON();
        const accepted = await restore();
        boot.restores.push({ before, after: loaded.world.toJSON() });
        return accepted;
      };
    }
    boots.push(boot);
    return boot.game;
  };
  return { boots, loadGame };
}

/** A row's outcome as the report shows it, without the branch record it came from. */
function reported(outcome: DerivedOutcome): Omit<DerivedOutcome, 'branch'> {
  const { branch: _branch, ...rest } = outcome;
  return rest;
}

const describeWithStories = ORCHARD && existsSync(ORCHARD) ? describe : describe.skip;

describeWithStories('REAL-PATH — orchard\'s derived suite on one boot', () => {
  const source = (): string => readFileSync(ORCHARD!, 'utf8');

  it('boots once for the whole suite, with no undo snapshots, and runs rows on it', async () => {
    const { boots, loadGame } = recordingLoader(source());
    const run = await runDerivedSuite(compileSource(source()), loadGame);

    expect(boots).toHaveLength(1);
    expect(boots[0].request).toEqual({ undo: false });
    expect(boots[0].canUndo()).toBe(false);
    // The one game did real work: more than one row ran a command on it.
    expect(run.outcomes.filter((outcome) => outcome.command !== undefined).length).toBeGreaterThan(1);
    expect(run.errored).toBe(0);
  }, 60_000);

  it('the fixture known to fail: an engine that refuses to save boots once per row, and the count shows it', async () => {
    const { boots, loadGame } = recordingLoader(source(), 'refuses-to-save');
    const run = await runDerivedSuite(compileSource(source()), loadGame);

    // The vocabulary boot, then one for every row that reached a game.
    const rowsThatBooted = run.outcomes.filter((outcome) => outcome.rooms !== undefined || outcome.arranged.length > 0).length;
    expect(rowsThatBooted).toBeGreaterThan(1);
    expect(boots.length).toBeGreaterThan(rowsThatBooted);
    expect(new Set(boots.map((boot) => boot.game)).size).toBe(boots.length);
  }, 60_000);

  it('every row reports what it reports on a game booted for it alone', async () => {
    const ir = compileSource(source());
    const shared = await runDerivedSuite(ir, recordingLoader(source()).loadGame);
    const bootedPerRow = await runDerivedSuite(ir, recordingLoader(source(), 'refuses-to-save').loadGame);

    expect(shared.outcomes.map(reported)).toEqual(bootedPerRow.outcomes.map(reported));
    expect(shared.roomsEntered).toEqual(bootedPerRow.roomsEntered);
  }, 60_000);

  it('every restore puts the world back exactly as booted, whatever the row before it wrote', async () => {
    const { boots, loadGame } = recordingLoader(source());
    await runDerivedSuite(compileSource(source()), loadGame);

    const [boot] = boots;
    expect(boot.restores.length).toBeGreaterThan(1);
    // Rows did write: more than one restore found a world that was not the boot's.
    expect(boot.restores.filter((restore) => restore.before !== boot.bootWorld).length).toBeGreaterThan(1);
    for (const restore of boot.restores) expect(restore.after).toBe(boot.bootWorld);
  }, 60_000);

  it('the fixture known to fail: a restore that does nothing leaves a row\'s writes in the world, and the check sees them', async () => {
    const { boots, loadGame } = recordingLoader(source(), 'restore-does-nothing');
    await runDerivedSuite(compileSource(source()), loadGame);

    const [boot] = boots;
    expect(boot.restores.some((restore) => restore.after !== boot.bootWorld)).toBe(true);
  }, 60_000);

  it('leaves no save or restore hook of its own on the shared game', async () => {
    const { boots, loadGame } = recordingLoader(source());
    await runDerivedSuite(compileSource(source()), loadGame);

    expect(boots[0].restores.length).toBeGreaterThan(1);
    expect(boots[0].hooks()?.onSaveRequested).toBeUndefined();
    expect(boots[0].hooks()?.onRestoreRequested).toBeUndefined();
  }, 60_000);

  it('a game with no save surface boots once per row', async () => {
    const { boots, loadGame } = recordingLoader(source(), 'no-save-surface');
    const run = await runDerivedSuite(compileSource(source()), loadGame);

    expect(run.errored).toBe(0);
    expect(boots.length).toBeGreaterThan(2);
    expect(new Set(boots.map((boot) => boot.game)).size).toBe(boots.length);
    for (const boot of boots) expect(boot.restores).toHaveLength(0);
  }, 60_000);

  it('a refused restore is an error on the row, naming the boot save', async () => {
    const { boots, loadGame } = recordingLoader(source(), 'refuses-to-restore');
    const ir = compileSource(source());
    // The vocabulary is given, so the first restore asked for is a row's.
    const run = await runDerivedSuite(ir, loadGame, { actionPatterns: await vocabularyOf(source()) });

    expect(boots).toHaveLength(1);
    const reachedAGame = run.outcomes.filter((outcome) => outcome.status !== 'skipped' && !String(outcome.detail ?? '').startsWith('parse failure: no'));
    expect(reachedAGame.length).toBeGreaterThan(0);
    for (const outcome of reachedAGame) {
      expect(outcome.status).toBe('error');
      expect(outcome.detail).toBe('boot failed: the engine refused the save taken at boot, so the row could not start (ADR-307 D5)');
    }
  }, 60_000);
});

/** The vocabulary of an honest boot of the story, for the case that must not spend its one restore on reading it. */
async function vocabularyOf(source: string): Promise<(actionId: string) => string[] | undefined> {
  const game = await recordingLoader(source).loadGame({ undo: false });
  const provider = game.engine!.getLanguageProvider();
  return (actionId) => provider.getActionPatterns(actionId);
}

describe('REAL-PATH — a row that types undo boots a game of its own', () => {
  // The vine fixture with its story action's first word made `undo`, so the
  // rows of that action type a command that can ask for undo.
  const source = readFileSync(resolve(__dirname, 'fixtures/derived/vine.story'), 'utf8').replace('    prune the target', '    undo the target');

  it('keeps the shared game for the other rows and boots with snapshots for each undo row', async () => {
    expect(source).toContain('    undo the target');
    const { boots, loadGame } = recordingLoader(source);
    const run = await runDerivedSuite(compileSource(source), loadGame);

    const sharedBoots = boots.filter((boot) => !boot.request.undo);
    const undoBoots = boots.filter((boot) => boot.request.undo);
    expect(sharedBoots).toHaveLength(1);
    expect(undoBoots.length).toBeGreaterThan(0);
    // One boot for each row whose command is the undo-worded action, no more.
    const undoRows = run.outcomes.filter((outcome) => outcome.branch.command.kind === 'action' && outcome.branch.command.action === 'pruning' && outcome.status !== 'skipped');
    expect(undoBoots.length).toBeLessThanOrEqual(run.outcomes.filter((outcome) => outcome.branch.command.kind === 'action' && outcome.branch.command.action === 'pruning').length);
    expect(undoBoots.length).toBeGreaterThanOrEqual(undoRows.length);
    for (const boot of undoBoots) expect(boot.game).not.toBe(sharedBoots[0].game);
  }, 60_000);
});
