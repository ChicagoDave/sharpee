/**
 * claims-walk-refusals.test.ts — a claims walk stops when the engine refuses
 * a save or a restore, and names the node (GH #698; ADR-365 D3).
 *
 * Against a REAL game: the claim-bits fixture, compiled by `@sharpee/chord`,
 * loaded by `@sharpee/story-loader`, assembled by `@sharpee/bootstrap`. The
 * engine's own save and restore are made to refuse at a chosen call; every
 * other call is the engine's.
 *
 * The fixture known to fail is the same walk on an engine that refuses
 * nothing: it must settle its claims, and every restore it counts must be
 * one the engine accepted.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { normalizeClaimSet } from '../src/claims/claim-set.js';
import { runClaims, type ClaimsRunOptions } from '../src/claims/claims-runner.js';
import type { ClaimsGame } from '../src/claims/claims-game.js';

const SEED = 1209;
const FIXTURES = resolve(__dirname, 'fixtures/claims');
const SOURCE = readFileSync(resolve(FIXTURES, 'claim-bits-fixture.story'), 'utf8');
const OPTIONS: ClaimsRunOptions = { seed: SEED, maxStates: 5000, maxSeconds: 30, maxDepth: 40 };

function compileFixture(): StoryIR {
  const result = compile(SOURCE);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

const claimSet = () => normalizeClaimSet(JSON.parse(readFileSync(resolve(FIXTURES, 'claims.json'), 'utf8')), 'claims.json');

/** What one booted game was asked, and what it answered. */
interface Recorded {
  /** Whether the engine accepted each restore asked of it, in order. */
  restores: boolean[];
  /** Whether the engine accepted each save asked of it, in order. */
  saves: boolean[];
  /** Every line the engine ran a turn for, in order. */
  turns: string[];
  /** Restores and turns in the one order they happened: `restore:<accepted>` and `turn:<line>`. */
  log: string[];
}

/**
 * A loader for one real game whose engine refuses its Nth save or its Nth
 * restore (counted from 1); with neither named it refuses nothing.
 */
function refusingLoader(refuse: { save?: number; restore?: number } = {}): { recorded: Recorded; loadGame: () => Promise<ClaimsGame> } {
  const recorded: Recorded = { restores: [], saves: [], turns: [], log: [] };
  const loadGame = async (): Promise<ClaimsGame> => {
    const loaded = assembleGame(createStory(compileFixture(), { seed: SEED }), {
      seed: SEED,
      freshStory: () => createStory(compileFixture(), { seed: SEED }),
      undoSnapshots: 0,
    });
    const engine = loaded.engine;
    const save = engine.save.bind(engine);
    engine.save = async () => {
      const accepted = recorded.saves.length + 1 === refuse.save ? false : await save();
      recorded.saves.push(accepted);
      return accepted;
    };
    const restore = engine.restore.bind(engine);
    engine.restore = async () => {
      const accepted = recorded.restores.length + 1 === refuse.restore ? false : await restore();
      recorded.restores.push(accepted);
      recorded.log.push(`restore:${accepted}`);
      return accepted;
    };
    const executeTurn = engine.executeTurn.bind(engine);
    engine.executeTurn = (async (input: string) => {
      recorded.turns.push(input);
      recorded.log.push(`turn:${input}`);
      return executeTurn(input);
    }) as typeof engine.executeTurn;
    return loaded as unknown as ClaimsGame;
  };
  return { recorded, loadGame };
}

describe('REAL-PATH — a claims walk and an engine that refuses', () => {
  it('the fixture known to fail: with nothing refused the walk settles its claims and counts only accepted restores', async () => {
    const { recorded, loadGame } = refusingLoader();
    const run = await runClaims(compileFixture(), claimSet(), loadGame, OPTIONS);

    expect([run.declared, run.held, run.violated, run.unproven]).toEqual([2, 2, 0, 0]);
    expect(recorded.restores.length).toBeGreaterThan(2);
    expect(recorded.restores.every((accepted) => accepted)).toBe(true);
    expect(run.walks[0].restores).toBe(recorded.restores.length);
    expect(run.walks[0].saves).toBe(recorded.saves.length);
  }, 30_000);

  it('a refused first restore stops the walk at its start, before any walked command runs', async () => {
    const { recorded, loadGame } = refusingLoader({ restore: 1 });

    await expect(runClaims(compileFixture(), claimSet(), loadGame, OPTIONS)).rejects.toThrow(
      'claims walk: the engine refused to restore the state at the walk\'s start, so the walk stopped before reading its commands',
    );
    // Only the opening look ran: no command was tried on a world that was not restored.
    expect(recorded.turns).toEqual(['look']);
    expect(recorded.restores).toEqual([false]);
  }, 30_000);

  it('a refused restore before a command stops the walk naming the node and the command, and the command never runs', async () => {
    const { recorded, loadGame } = refusingLoader({ restore: 2 });

    const failure = await runClaims(compileFixture(), claimSet(), loadGame, OPTIONS).then(
      () => undefined,
      (error: Error) => error,
    );
    expect(failure).toBeInstanceOf(Error);
    expect(failure!.message).toMatch(/^claims walk: the engine refused to restore the state at the walk's start, so the walk stopped before trying ".+"$/);
    expect(recorded.turns).toEqual(['look']);
    expect(recorded.restores).toEqual([true, false]);
  }, 30_000);

  it('a refused restore deeper in the walk names the path that reached the node', async () => {
    const quiet = refusingLoader();
    await runClaims(compileFixture(), claimSet(), quiet.loadGame, OPTIONS);
    // The last restore of an honest walk is of a node some command reached.
    const last = quiet.recorded.restores.length;

    const { recorded, loadGame } = refusingLoader({ restore: last });
    const failure = await runClaims(compileFixture(), claimSet(), loadGame, OPTIONS).then(
      () => undefined,
      (error: Error) => error,
    );
    expect(failure).toBeInstanceOf(Error);
    expect(failure!.message).toMatch(/^claims walk: the engine refused to restore the state at "[^"]+", so the walk stopped before /);
    // Restores and turns, in order, are the honest walk's up to that restore,
    // which was refused, and nothing happened after it — though the honest
    // walk went on to run a turn there.
    const refusedAt = quiet.recorded.log.map((entry, at) => (entry.startsWith('restore:') ? at : -1)).filter((at) => at >= 0)[last - 1];
    expect(quiet.recorded.log[refusedAt + 1]).toMatch(/^turn:/);
    expect(recorded.log).toEqual([...quiet.recorded.log.slice(0, refusedAt), 'restore:false']);
  }, 30_000);

  it('a refused save at the walk\'s start stops the walk before anything is walked', async () => {
    const { recorded, loadGame } = refusingLoader({ save: 1 });

    await expect(runClaims(compileFixture(), claimSet(), loadGame, OPTIONS)).rejects.toThrow(
      'claims walk: the engine refused to save the state at the walk\'s start, so the walk could not continue from it',
    );
    expect(recorded.turns).toEqual(['look']);
    expect(recorded.restores).toEqual([]);
  }, 30_000);

  it('a refused save of a newly reached state stops the walk naming the path to it', async () => {
    const { recorded, loadGame } = refusingLoader({ save: 2 });

    const failure = await runClaims(compileFixture(), claimSet(), loadGame, OPTIONS).then(
      () => undefined,
      (error: Error) => error,
    );
    expect(failure).toBeInstanceOf(Error);
    const reached = recorded.turns.at(-1)!;
    expect(reached).not.toBe('look');
    expect(failure!.message).toBe(`claims walk: the engine refused to save the state at "${reached}", so the walk could not continue from it`);
  }, 30_000);
});
