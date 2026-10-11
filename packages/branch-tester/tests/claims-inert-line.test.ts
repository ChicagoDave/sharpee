/**
 * claims-inert-line.test.ts — the runner's unproven line carries how many of
 * the set's things the claim can never depend on (ADR-365 D12; AC-9's
 * runner clause), against a REAL game at the pinned seed.
 *
 * The fixture's set lists the note and a pebble; the claim is about where
 * the note is, and nothing in the story reads the pebble. A budget of one
 * state leaves the negative claim unproven, and its line says one of the two
 * things is never reached. A budget the fixture never meets holds the claim
 * by exhaustion, and the walk still visits four states — the pebble in hand
 * or on the floor doubles them — because the set runs as written: the count
 * is report data and never trims the walk (D2, D3).
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
import { runClaims, formatClaimsRun } from '../src/claims/claims-runner.js';
import type { ClaimsGame } from '../src/claims/claims-game.js';

const SEED = 1209;
const FIXTURES = resolve(__dirname, 'fixtures/claims');
const SOURCE = readFileSync(resolve(FIXTURES, 'inert-line-fixture.story'), 'utf8');

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

const CLAIMS: ClaimSet = normalizeClaimSet(JSON.parse(readFileSync(resolve(FIXTURES, 'inert-line.json'), 'utf8')), 'inert-line.json');

describe('the unproven line and the inert count', () => {
  it('a budget stop reports how many of the set\'s things the claim\'s rules never reach', async () => {
    const result = await runClaims(IR, CLAIMS, loadGame, { seed: SEED, maxStates: 1, maxSeconds: 30, maxDepth: 40 });
    const claim = result.claims[0];
    expect([claim.verdict, claim.settledBy, claim.thingsInSet, claim.inertInSet]).toEqual(['unproven', 'budget', 2, 1]);
    const walk = result.walks[0];
    expect(formatClaimsRun(result).split('\n').at(-1)).toBe(
      `UNPROVEN  the note leaves the Hall (never) — the walk stopped at ${walk.stopReason} after ${walk.statesDiscovered} states; its set carries 2 things, 1 of which the claim's rules never reach; each independent thing doubles the states to exhaust`,
    );
  }, 60_000);

  it('the count never trims the walk: the set runs as written, the pebble doubles the states, and a held line carries no count', async () => {
    const result = await runClaims(IR, CLAIMS, loadGame, { seed: SEED, maxStates: 5000, maxSeconds: 30, maxDepth: 40 });
    const claim = result.claims[0];
    expect([claim.verdict, claim.settledBy, claim.inertInSet]).toEqual(['held', 'exhaustion', 1]);
    // hall / landing, each with the pebble on the floor or in hand.
    expect(result.walks[0].statesDiscovered).toBe(4);
    expect(formatClaimsRun(result).split('\n').at(-1)).toBe('HELD  the note leaves the Hall (never) — every reachable state under its set was tried (the declared set)');
  }, 60_000);
});
