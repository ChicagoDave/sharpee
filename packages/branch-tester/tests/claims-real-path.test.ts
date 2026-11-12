/**
 * claims-real-path.test.ts — the REAL-PATH test of the claims runner
 * (ADR-365 AC-1, AC-4, AC-9): the lodge's ten claims through the real engine
 * at seed 1209.
 *
 * The story is the test story `test-stories/lodge`, compiled by
 * `@sharpee/chord`, loaded by `@sharpee/story-loader`, assembled by
 * `@sharpee/bootstrap`; every command runs through the real parser and
 * engine, and every fork is the engine's own save/restore. No stub of any
 * owned dependency.
 *
 * Ten claims, nine distinct sets, nine walks: every predicate kind is
 * exercised (ending, placement in, event, state, placement notIn, room,
 * never-room, flag, fired, and a flag claim locked from a tree line) and
 * every verdict (held by witness, held by exhaustion, violated). What the
 * story must let this file prove is listed in
 * `test-stories/lodge/lodge.test-set.md` (OB-1 to OB-16).
 *
 * Skipped when the test stories are not configured (a published tarball).
 * Nothing here measures the walk on a real-sized story: ADR-365 AC-2's
 * bound on Fernhill was let go with the move to test stories.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { claimCone, compile, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { normalizeClaimSet } from '../src/claims/claim-set.js';
import { runClaims } from '../src/claims/claims-runner.js';
import type { ClaimsRunResult } from '../src/claims/claim-results.js';
import type { ClaimsGame } from '../src/claims/claims-game.js';

const SEED = 1209;
const testStories = process.env.SHARPEE_TEST_STORIES;
const STORY = testStories ? resolve(testStories, 'lodge/lodge.story') : undefined;
const CLAIMS = testStories ? resolve(testStories, 'lodge/lodge.claims.json') : undefined;

/** Compile the story. */
function compileStory(storyFile: string): StoryIR {
  const result = compile(readFileSync(storyFile, 'utf8'));
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

/** Boots one fresh real game at the pinned seed, the way `sharpee test` does. */
function loaderFor(storyFile: string): () => Promise<ClaimsGame> {
  return async () => {
    const story = createStory(compileStory(storyFile), { seed: SEED });
    return assembleGame(story, { seed: SEED, freshStory: () => createStory(compileStory(storyFile), { seed: SEED }) });
  };
}

const describeWithStories = STORY && existsSync(STORY) ? describe : describe.skip;

describeWithStories('REAL-PATH — the lodge\'s claims through the real engine (ADR-365 AC-1)', () => {
  let run: ClaimsRunResult | undefined;
  const lodge = async (): Promise<ClaimsRunResult> => {
    if (!run) {
      const claimSet = normalizeClaimSet(JSON.parse(readFileSync(CLAIMS!, 'utf8')), 'lodge.claims.json');
      // The budget `sharpee test` walks under.
      run = await runClaims(compileStory(STORY!), claimSet, loaderFor(STORY!), { seed: SEED, maxStates: 500_000, maxSeconds: 120, maxDepth: 80 });
    }
    return run;
  };

  it('settles all ten claims with the measured verdicts and witness depths', async () => {
    const result = await lodge();
    const verdicts = result.claims.map((claim) => [claim.name, claim.verdict, claim.depth ?? null]);
    expect(verdicts).toEqual([
      ['the story can be won', 'held', 8], // an ending
      ['the deed is in hand', 'held', 7], // a placement in the player
      ['the warden has been asked about the vault', 'held', 2], // an event
      ['the ledger has been studied', 'held', 7], // a declared state
      ['the strongbox leaves the Vault', 'violated', 7], // a `never` placement not in a room
      ['the Study is reached', 'held', 6], // a room
      ['the Study is reached without the brandy', 'held', null], // a `never` room, by exhaustion
      ['the notice has been read', 'held', 1], // a readable flag
      ['the valve has been turned', 'held', 3], // a fired clause
      // Locked from the tree's main line by `sharpee claim`; walked here, held by line under `sharpee test`.
      ['the strongbox is open', 'held', 6], // an openable flag
    ]);
    expect([result.declared, result.held, result.violated, result.unproven]).toEqual([10, 9, 1, 0]);
  });

  it('runs one walk per distinct set; every walk is settled by its claims or by exhaustion, never by a budget', async () => {
    const result = await lodge();
    expect(result.walks.map((walk) => [walk.set, walk.stopReason])).toEqual([
      // Two claims share the declared set, so ten claims are nine walks.
      ['the declared set', 'all-claims-settled'],
      ['the set of "the warden has been asked about the vault"', 'all-claims-settled'],
      ['the set of "the ledger has been studied"', 'all-claims-settled'],
      ['the set of "the strongbox leaves the Vault"', 'all-claims-settled'],
      ['the set of "the Study is reached"', 'all-claims-settled'],
      ['the set of "the Study is reached without the brandy"', 'frontier-exhausted'],
      ['the set of "the notice has been read"', 'all-claims-settled'],
      ['the set of "the valve has been turned"', 'all-claims-settled'],
      ['the set of "the strongbox is open"', 'all-claims-settled'],
    ]);
    // The negative claim held by exhaustion: nine states, every one tried.
    expect(result.walks[5].statesDiscovered).toBe(9);
  });

  it('the whole run finishes inside a 10-second bound', async () => {
    // Measured at 0.2 s (2026-11-11). The bound is fifty times that: it
    // fails on a walk that has stopped settling, not on a slow machine.
    const result = await lodge();
    expect(result.totalWalkMs).toBeLessThan(10_000);
  });

  it('the witnesses are the measured paths: the eight commands that win, and the seven that carry the strongbox out of the Vault', async () => {
    const result = await lodge();
    const won = result.claims.find((claim) => claim.name === 'the story can be won')!;
    // The shortest win carries the strongbox out with the deed still in it.
    expect(won.witness).toEqual(['north', 'east', 'turn valve', 'west', 'north', 'take strongbox', 'south', 'south']);
    const strongbox = result.claims.find((claim) => claim.name === 'the strongbox leaves the Vault')!;
    expect(strongbox.witness).toEqual(['north', 'east', 'turn valve', 'west', 'north', 'take strongbox', 'south']);
  });

  it('AC-9 (ADR-365 D12): nothing a witness touches is reported inert, each verdict carries its cone\'s count, and the inert things are the ones the story says are off the path', async () => {
    const result = await lodge();
    const ir = compileStory(STORY!);
    const sidecar = JSON.parse(readFileSync(CLAIMS!, 'utf8'));
    const spellings = new Map(ir.entities.map((entity) => [entity.id, [entity.name, ...entity.aka].map((s) => s.toLowerCase())]));
    const inertByClaim: Record<string, string[]> = {};
    for (const claim of sidecar.claims) {
      const set = { rooms: claim.needs?.rooms ?? sidecar.rooms, things: claim.needs?.things ?? sidecar.things, verbs: claim.needs?.verbs ?? sidecar.verbs };
      const cone = claimCone(ir, claim, set);
      inertByClaim[claim.name] = cone.inert;
      const verdict = result.claims.find((v) => v.name === claim.name)!;
      expect(verdict.inertInSet).toBe(cone.inert.length);
      for (const command of verdict.witness ?? []) {
        for (const id of cone.inert) for (const spelling of spellings.get(id) ?? []) expect(command.toLowerCase(), `${claim.name}: "${command}" touches inert ${id}`).not.toContain(spelling);
      }
    }
    expect(inertByClaim).toEqual({
      // The hand bell is in the declared set and bears on nothing.
      'the story can be won': ['hand-bell'],
      'the deed is in hand': ['hand-bell'],
      'the warden has been asked about the vault': [],
      'the ledger has been studied': [],
      'the strongbox leaves the Vault': [],
      'the Study is reached': [],
      // Giving the warden the bell does not move him; only the brandy does.
      'the Study is reached without the brandy': ['hand-bell'],
      'the notice has been read': [],
      'the valve has been turned': [],
      // The lock proposed this set from the line, already trimmed.
      'the strongbox is open': [],
    });
  });
});
