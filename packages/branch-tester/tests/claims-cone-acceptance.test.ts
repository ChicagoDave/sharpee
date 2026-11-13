/**
 * claims-cone-acceptance.test.ts — ADR-365 AC-9: a negative claim whose set
 * is padded with things that cannot bear on it.
 *
 * ADR-365 AC-8 measured the case on a real story: a claim over a market's
 * rooms and twenty-six wares did not finish in 600 seconds, because every
 * independent takeable thing multiplies the walk. The cone says why: under
 * that set nothing the claim depends on reads any of the wares, so the
 * finding names them all and proposes dropping the line. This test pins the
 * same finding on the test story `test-stories/bazaar` (three rooms, eight
 * wares; its test set: OB-20, OB-21), and then walks the trimmed set, the
 * rooms alone, which holds by exhaustion on the real engine. The padded set
 * is never walked. Skipped when the test stories are not configured.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, compileClaims, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { normalizeClaimSet } from '../src/claims/claim-set.js';
import { runClaims } from '../src/claims/claims-runner.js';
import type { ClaimsGame } from '../src/claims/claims-game.js';

const SEED = 1209;
const testStories = process.env.SHARPEE_TEST_STORIES;
const STORY = testStories ? resolve(testStories, 'bazaar/bazaar.story') : undefined;
const FRAGMENT = testStories ? resolve(testStories, 'bazaar/bazaar.claims.chord') : '';

const WARES = ['fig', 'plum', 'ribbon', 'thimble', 'comb', 'wick', 'flint', 'snuffer'];
const ROOMS = ['arcade', 'lamp-stall', 'back-lane'];

function fsResolver(storyDir: string): (fragment: string) => string | null {
  return (fragment) => {
    const full = resolve(storyDir, fragment);
    return existsSync(full) ? readFileSync(full, 'utf8') : null;
  };
}

function compileStory(storyFile: string): StoryIR {
  const result = compile(readFileSync(storyFile, 'utf8'), { importResolver: fsResolver(dirname(storyFile)) });
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

const describeWithCorpus = STORY && existsSync(STORY) ? describe : describe.skip;

describeWithCorpus("AC-9 — the bazaar's claim, its set padded with wares that cannot matter", () => {
  it('the finding names all eight wares inert, in set order, on the needs things line, and proposes dropping the line', () => {
    const fragment = readFileSync(FRAGMENT, 'utf8');
    const result = compileClaims(readFileSync(STORY!, 'utf8'), fragment, { importResolver: fsResolver(dirname(STORY!)), claimsFile: 'bazaar.claims.chord' });
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => `${d.code}: ${d.message}`)).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.claims?.things).toHaveLength(8);

    const findings = result.diagnostics.filter((d) => d.code === 'analysis.claim-inert-needs');
    expect(findings).toHaveLength(1);
    const [finding] = findings;
    expect(finding.severity).toBe('warning');
    expect(finding.span.file).toBe('bazaar.claims.chord');
    expect(finding.span.line).toBe(fragment.split('\n').findIndex((line) => line.includes('needs things:')) + 1);
    const named = /nothing it depends on reads (.*)\. The walk still runs/.exec(finding.message)?.[1].split(', ');
    expect(named).toEqual(WARES);
    expect(finding.message).toContain('`the shopper reaches the Back Lane` depends on none of the 8 things in its set');
    expect(finding.message).toMatch(/the line can go\.$/);
  });

  it('the trimmed set — the rooms alone — holds the claim by exhaustion on the real engine', async () => {
    const claimSet = normalizeClaimSet(
      {
        story: 'bazaar',
        source: "the bazaar's claim after the cone's trimming: the three rooms, no things, take and drop",
        rooms: ROOMS,
        things: [],
        verbs: ['take', 'drop'],
        claims: [{ name: 'the shopper reaches the Back Lane', never: true, room: 'back-lane' }],
      },
      'bazaar (trimmed)',
    );
    const result = await runClaims(compileStory(STORY!), claimSet, loaderFor(STORY!), { seed: SEED, maxStates: 300_000, maxSeconds: 60, maxDepth: 60 });
    const [claim] = result.claims;
    expect([claim.verdict, claim.settledBy, claim.thingsInSet, claim.inertInSet]).toEqual(['held', 'exhaustion', 0, 0]);
    expect(result.walks[0].stopReason).toBe('frontier-exhausted');
    // Two rooms are reachable and the chained gate is tried from one of them. The walk sees four states,
    // not two: arriving in a room for the first time is state the identity counts (2 before 2026-11-12,
    // when the identity was an include list that left the visited marks out).
    expect(result.walks[0].statesDiscovered).toBe(4);
    expect(result.totalWalkMs).toBeLessThan(10_000);
  });
});
