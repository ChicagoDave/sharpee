/**
 * claims-walk-serializations.test.ts — a claims walk reads the world once
 * for each state it reaches (engine-test-performance plan, Phase 5).
 *
 * Against a REAL game: the test story `test-stories/lodge` and its claims,
 * compiled by `@sharpee/chord`, loaded by `@sharpee/story-loader`, assembled
 * by `@sharpee/bootstrap`; every fork is the engine's own save and restore.
 * The count is of world serializations, taken on each booted world; nothing
 * here measures time.
 *
 * What a walk is allowed: one read of the world it starts in, one read for
 * each command it walks, and the engine's own serialization inside each save
 * (the walk's `saves` count includes the save of the start).
 *
 * The count's fixture known to fail is the same run through a loader that
 * ignores what the walk asks and keeps undo snapshots: the engine then
 * serializes the world once more for every turn, and the count must exceed
 * the allowance by at least the commands walked.
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
import { normalizeClaimSet } from '../src/claims/claim-set.js';
import { runClaims } from '../src/claims/claims-runner.js';
import type { ClaimsRunResult } from '../src/claims/claim-results.js';
import type { ClaimsGame } from '../src/claims/claims-game.js';

const SEED = 1209;
const testStories = process.env.SHARPEE_TEST_STORIES;
const STORY = testStories ? resolve(testStories, 'lodge/lodge.story') : undefined;
const CLAIMS = testStories ? resolve(testStories, 'lodge/lodge.claims.json') : undefined;

function compileStory(storyFile: string): StoryIR {
  const result = compile(readFileSync(storyFile, 'utf8'));
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

/** A loader that counts every serialization of every world it boots. */
function countingLoader(storyFile: string, undoSnapshots: 'as-asked' | 'always-kept'): {
  count: { serializations: number; boots: number };
  loadGame: (request: GameLoadRequest) => Promise<ClaimsGame>;
} {
  const count = { serializations: 0, boots: 0 };
  const loadGame = async (request: GameLoadRequest): Promise<ClaimsGame> => {
    const keepsSnapshots = undoSnapshots === 'always-kept' || request.undo;
    const game = assembleGame(createStory(compileStory(storyFile), { seed: SEED }), {
      seed: SEED,
      freshStory: () => createStory(compileStory(storyFile), { seed: SEED }),
      ...(keepsSnapshots ? {} : { undoSnapshots: 0 }),
    });
    count.boots++;
    const serialize = game.world.toJSON.bind(game.world);
    game.world.toJSON = () => { count.serializations++; return serialize(); };
    return game;
  };
  return { count, loadGame };
}

/** The serializations the walks of a run are allowed. */
function allowance(run: ClaimsRunResult): number {
  return run.walks.reduce((total, walk) => total + 1 + walk.commandsExecuted + walk.saves, 0);
}

const describeWithStories = STORY && existsSync(STORY) ? describe : describe.skip;

describeWithStories('REAL-PATH — the lodge\'s walks and their world serializations', () => {
  const walkLodge = async (undoSnapshots: 'as-asked' | 'always-kept') => {
    const claimSet = normalizeClaimSet(JSON.parse(readFileSync(CLAIMS!, 'utf8')), 'lodge.claims.json');
    const { count, loadGame } = countingLoader(STORY!, undoSnapshots);
    const run = await runClaims(compileStory(STORY!), claimSet, loadGame, { seed: SEED, maxStates: 500_000, maxSeconds: 120, maxDepth: 80 });
    return { count, run };
  };

  it('serializes the world once at each start, once per command walked, and once inside each save', async () => {
    const { count, run } = await walkLodge('as-asked');
    const commands = run.walks.reduce((total, walk) => total + walk.commandsExecuted, 0);

    expect(run.walks.length).toBeGreaterThan(0);
    expect(count.boots).toBe(run.walks.length);
    expect(commands).toBeGreaterThan(0);
    expect(count.serializations).toBe(allowance(run));
  }, 180_000);

  it('the fixture known to fail: a loader that keeps undo snapshots serializes once more per turn, and the count shows it', async () => {
    const { count, run } = await walkLodge('always-kept');
    const commands = run.walks.reduce((total, walk) => total + walk.commandsExecuted, 0);

    expect(commands).toBeGreaterThan(0);
    expect(count.serializations).toBeGreaterThanOrEqual(allowance(run) + commands);
  }, 180_000);
});
