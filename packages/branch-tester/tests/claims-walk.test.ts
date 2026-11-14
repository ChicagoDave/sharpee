/**
 * claims-walk.test.ts — the claims walk on the claim-bits fixture, against
 * a REAL game: compiled by `@sharpee/chord`, loaded by `@sharpee/story-loader`,
 * assembled by `@sharpee/bootstrap`, forked through the real engine's
 * save/restore hooks (ADR-365 D3, D4, D5; AC-3, AC-5).
 *
 * Examining the fixture's note changes nothing in the world, so nothing in
 * the identity moves. Without claims the walk under `examine` sees four
 * states (the two rooms, before and after each is first arrived in). With an
 * event claim on examining the note, "examine note" earns its own state and
 * so does "examine note / north" — the claim bit is the only thing keeping
 * those paths apart (AC-5). Reading the note is no longer that vehicle: the
 * identity counts the readable trait's flag since 2026-11-12. A claim no
 * state satisfies is unproven: by exhaustion when the frontier ran out, by
 * budget when a budget stopped the walk first. A claim whose set omits the
 * note is unproven under that set, and held once the note is added (AC-3).
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
import { normalizeClaimSet, type ClaimSet } from '../src/claims/claim-set.js';
import { runClaims, formatClaimsRun, type ClaimsRunOptions } from '../src/claims/claims-runner.js';
import { irIdOf, type ClaimsGame } from '../src/claims/claims-game.js';

const SEED = 1209;
const FIXTURES = resolve(__dirname, 'fixtures/claims');
const SOURCE = readFileSync(resolve(FIXTURES, 'claim-bits-fixture.story'), 'utf8');

function compileFixture(): StoryIR {
  const result = compile(SOURCE);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}
const IR = compileFixture();

/** Boots one fresh real game at the pinned seed, the way `sharpee test` does. */
async function loadGame(): Promise<ClaimsGame> {
  const story = createStory(compileFixture(), { seed: SEED });
  return assembleGame(story, { seed: SEED, freshStory: () => createStory(compileFixture(), { seed: SEED }) });
}

function claimsFrom(file: string): ClaimSet {
  return normalizeClaimSet(JSON.parse(readFileSync(resolve(FIXTURES, file), 'utf8')), file);
}

/** A budget the fixture never reaches. */
const OPTIONS: ClaimsRunOptions = { seed: SEED, maxStates: 5000, maxSeconds: 30, maxDepth: 40 };

describe('the fork the walk is built on — the engine\'s own save/restore', () => {
  it('a restore puts the world back where the save was taken, and the player is read through the world again', async () => {
    const game = await loadGame();
    await game.executeCommand('look');
    const roomOf = () => irIdOf(game.world.getContainingRoom(game.world.playerCharacter.id));
    expect(roomOf()).toBe('hall');
    const save = await captureSave(game.engine);
    expect(save).not.toBeNull();
    await game.executeCommand('north');
    expect(roomOf()).toBe('landing');
    expect(await restoreSave(game.engine, save)).toBe(true);
    expect(roomOf()).toBe('hall');
  }, 30_000);
});

describe('the claims walk on the claim-bits fixture', () => {
  it('the two claims share the declared set, so there is one walk', async () => {
    const run = await runClaims(IR, claimsFrom('claims.json'), loadGame, OPTIONS);
    expect(run.walks.map((walk) => walk.set)).toEqual(['the declared set']);
    expect(run.claims.map((claim) => claim.name)).toEqual(['the note has been read', 'the note leaves the Hall']);
    expect([run.declared, run.held, run.unproven]).toEqual([2, 1, 1]);
    expect(run).not.toHaveProperty('violated');
  }, 30_000);

  it('AC-5: a satisfied claim keeps its path apart — six states where the baseline has four', async () => {
    const underExamine = { rooms: ['hall', 'landing'], things: ['note'], verbs: ['examine'] };
    const baseline = await runClaims(IR, normalizeClaimSet({ ...underExamine, claims: [] }, 'examine, no claims'), loadGame, OPTIONS);
    expect(baseline.walks[0].statesDiscovered).toBe(4);
    expect(baseline.walks[0].frontierByDepth).toEqual({ 0: 1, 1: 1, 2: 1, 3: 1 });
    expect(baseline.walks[0].roomsReached).toEqual(['hall', 'landing']);

    const examined = normalizeClaimSet({
      ...underExamine,
      claims: [
        { name: 'the note has been examined', event: { type: 'if.event.examined', target: 'note' } },
        { name: 'the note leaves the Hall', placement: { thing: 'note', notIn: 'hall' } },
      ],
    }, 'examine, with an event claim');
    const withClaims = await runClaims(IR, examined, loadGame, OPTIONS);
    expect(withClaims.walks[0].statesDiscovered).toBe(6);
    expect(withClaims.walks[0].frontierByDepth).toEqual({ 0: 1, 1: 2, 2: 2, 3: 1 });
    expect(withClaims.claims[0].witness).toEqual(['examine note']);
  }, 30_000);

  it('AC-5: the first path to a claim is its witness', async () => {
    const run = await runClaims(IR, claimsFrom('claims.json'), loadGame, OPTIONS);
    const read = run.claims.find((claim) => claim.name === 'the note has been read')!;
    expect(read.verdict).toBe('held');
    expect(read.settledBy).toBe('witness');
    expect(read.witness).toEqual(['read note']);
    expect(read.depth).toBe(1);
  }, 30_000);

  it('a claim no state satisfies is unproven by exhaustion, and no verdict carries a never flag', async () => {
    const run = await runClaims(IR, claimsFrom('claims.json'), loadGame, OPTIONS);
    expect(run.walks[0].stopReason).toBe('frontier-exhausted');
    const leaves = run.claims.find((claim) => claim.name === 'the note leaves the Hall')!;
    expect(leaves.verdict).toBe('unproven');
    expect(leaves.settledBy).toBe('exhaustion');
    expect(leaves.witness).toBeUndefined();
    for (const claim of run.claims) expect(claim).not.toHaveProperty('never');
    const report = formatClaimsRun(run);
    expect(report).toContain('claims: 1 of 2 held, 1 unproven (seed 1209)');
    expect(report).toContain('HELD  the note has been read — at depth 1: read note');
    expect(report).toContain('UNPROVEN  the note leaves the Hall — no reachable state under its set satisfies it (the declared set)');
  }, 30_000);

  it('a budget stop leaves the same claim unproven by budget, and the report names the cost', async () => {
    const run = await runClaims(IR, claimsFrom('claims.json'), loadGame, { ...OPTIONS, maxStates: 1 });
    expect(run.walks[0].stopReason).toBe('max-states');
    const leaves = run.claims.find((claim) => claim.name === 'the note leaves the Hall')!;
    expect(leaves.verdict).toBe('unproven');
    expect(leaves.settledBy).toBe('budget');
    expect(leaves.thingsInSet).toBe(1);
    expect(formatClaimsRun(run)).toContain('UNPROVEN  the note leaves the Hall — the walk stopped at max-states after 1 states; its set carries 1 things, and each independent thing doubles the states to exhaust');
  }, 30_000);

  it('AC-3: a claim whose set omits the note is unproven under that set; adding the note holds it', async () => {
    const without = normalizeClaimSet({
      rooms: ['hall', 'landing'], things: [], verbs: ['read'],
      claims: [{ name: 'the note has been read', flag: { thing: 'note', trait: 'readable', field: 'hasBeenRead' } }],
    }, 'omits the note');
    const run = await runClaims(IR, without, loadGame, OPTIONS);
    expect(run.walks[0].stopReason).toBe('frontier-exhausted');
    expect(run.claims[0].verdict).toBe('unproven');
    expect(run.claims[0].settledBy).toBe('exhaustion');
    expect(formatClaimsRun(run)).toContain('UNPROVEN  the note has been read — no reachable state under its set satisfies it (the declared set)');

    const withNote = normalizeClaimSet({ ...without.set, things: ['note'], claims: [{ name: 'the note has been read', flag: { thing: 'note', trait: 'readable', field: 'hasBeenRead' } }] }, 'with the note');
    const held = await runClaims(IR, withNote, loadGame, OPTIONS);
    expect(held.claims[0].verdict).toBe('held');
  }, 30_000);
});
