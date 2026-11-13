/**
 * claims-outside-set.test.ts — a claims walk whose start lies outside its
 * set, against a REAL game: compiled by `@sharpee/chord`, loaded by
 * `@sharpee/story-loader`, assembled by `@sharpee/bootstrap`, forked through
 * the real engine's save/restore hooks (ADR-365 D3).
 *
 * The fixture is three rooms in a row, the player in the Lane and a crate
 * in the Shed. Under a set that names only the Shed the walk can go
 * nowhere: one state, no command. That walk tried nothing, so it must not
 * hold "the crate never leaves the Shed" — the story breaks that claim in
 * four commands. Under a set that names the Yard too, the walk starts
 * outside its set, enters it, and finds the violation.
 *
 * The report these walks print carries no wall-clock time, so two runs at
 * one seed print the same bytes.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { normalizeClaimSet, type ClaimSet } from '../src/claims/claim-set.js';
import { claimResultRowOf, claimSentence } from '../src/claims/claim-report.js';
import { runClaims, formatClaimsRun, type ClaimsRunOptions } from '../src/claims/claims-runner.js';
import type { ClaimsGame } from '../src/claims/claims-game.js';
import type { GameLoadRequest } from '../src/game-load-request.js';

const SEED = 1209;
const SOURCE = readFileSync(resolve(__dirname, 'fixtures/claims/outside-set-fixture.story'), 'utf8');

function compileFixture(): StoryIR {
  const result = compile(SOURCE);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}
const IR = compileFixture();

/** Boots one fresh real game at the pinned seed, the way `sharpee test` does. */
const requests: GameLoadRequest[] = [];
async function loadGame(request: GameLoadRequest): Promise<ClaimsGame> {
  requests.push(request);
  const story = createStory(compileFixture(), { seed: SEED });
  return assembleGame(story, { seed: SEED, freshStory: () => createStory(compileFixture(), { seed: SEED }) });
}

const CRATE_NEVER_LEAVES = { name: 'the crate leaves the Shed', never: true, placement: { thing: 'crate', notIn: 'shed' } };

/** The set that names only the Shed: the Lane's one exit leads to the Yard, which it does not name. */
function shedOnly(claims: ReadonlyArray<Record<string, unknown>>): ClaimSet {
  return normalizeClaimSet({ rooms: ['shed'], things: ['crate'], verbs: ['take'], claims }, 'the shed alone');
}

/** A budget the fixture never reaches. */
const OPTIONS: ClaimsRunOptions = { seed: SEED, maxStates: 5000, maxSeconds: 30, maxDepth: 40 };

describe('a walk that never enters its set', () => {
  it('tries nothing, and says so as its stop reason', async () => {
    const run = await runClaims(IR, shedOnly([CRATE_NEVER_LEAVES]), loadGame, OPTIONS);
    expect(run.walks).toHaveLength(1);
    expect(run.walks[0].statesDiscovered).toBe(1);
    expect(run.walks[0].commandsExecuted).toBe(0);
    expect(run.walks[0].roomsReached).toEqual(['lane']);
    expect(run.walks[0].stopReason).toBe('start-outside-set');
  }, 30_000);

  it('does not hold a negative claim the story breaks', async () => {
    const run = await runClaims(IR, shedOnly([CRATE_NEVER_LEAVES]), loadGame, OPTIONS);
    const never = run.claims[0];
    expect(never.never).toBe(true);
    expect(never.verdict).toBe('unproven');
    expect(never.settledBy).toBe('budget');
    expect([run.declared, run.held, run.violated, run.unproven]).toEqual([1, 0, 0, 1]);
    expect(formatClaimsRun(run).split('\n')).toEqual([
      'claims: 0 of 1 held, 1 unproven (seed 1209)',
      '1 walk',
      '  under the declared set: 1 rooms, 1 things, 1 verbs — 1 states, 0 commands, stopped: start-outside-set',
      'UNPROVEN  the crate leaves the Shed (never) — the walk never entered its set: the player starts in a room the set does not name, and no command the set allows leads into one it does (the declared set)',
    ]);
  }, 30_000);

  it('leaves a positive claim unproven by the walk that never started, not by an exhausted set', async () => {
    const run = await runClaims(IR, shedOnly([{ name: 'the Shed is reached', room: 'shed' }]), loadGame, OPTIONS);
    expect(run.claims[0].verdict).toBe('unproven');
    expect(run.claims[0].settledBy).toBe('budget');
    const row = claimResultRowOf(run.claims[0], { ...run, floored: true });
    expect(row.stopped).toEqual({ reason: 'start-outside-set', states: 1 });
    expect(claimSentence(row)).toBe('not reached by any line; the walk never entered its set: the player starts in a room the set does not name, and no command the set allows leads into one it does (the declared set)');
  }, 30_000);

  it('still reports a claim the starting state itself satisfies', async () => {
    const run = await runClaims(IR, shedOnly([{ name: 'the player stands in the Lane', never: true, room: 'lane' }]), loadGame, OPTIONS);
    expect(run.walks[0].stopReason).toBe('all-claims-settled');
    expect(run.claims[0].verdict).toBe('violated');
    expect(run.claims[0].settledBy).toBe('witness');
    expect(run.claims[0].witness).toEqual([]);
  }, 30_000);
});

describe('a walk that starts outside its set and enters it', () => {
  const yardAndShed = (): ClaimSet => normalizeClaimSet({ rooms: ['yard', 'shed'], things: ['crate'], verbs: ['take'], claims: [CRATE_NEVER_LEAVES] }, 'the yard and the shed');

  it('walks as any other, and finds the violation', async () => {
    const run = await runClaims(IR, yardAndShed(), loadGame, OPTIONS);
    expect(run.walks[0].stopReason).toBe('all-claims-settled');
    expect(run.walks[0].roomsReached).toEqual(['lane', 'shed', 'yard']);
    // A walk never types undo, so every game it boots is asked for without undo snapshots.
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((request) => request.undo === false)).toBe(true);
    expect(run.claims[0].verdict).toBe('violated');
    expect(run.claims[0].witness).toEqual(['north', 'north', 'take crate', 'south']);
  }, 30_000);

  it('prints the same report on a second run: no line carries wall-clock time', async () => {
    const first = formatClaimsRun(await runClaims(IR, yardAndShed(), loadGame, OPTIONS));
    const second = formatClaimsRun(await runClaims(IR, yardAndShed(), loadGame, OPTIONS));
    expect(second).toBe(first);
    expect(first).not.toMatch(/\d+\.\d+s/);
    expect(first.split('\n')[1]).toBe('1 walk');
  }, 30_000);
});
