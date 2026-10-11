/**
 * claims-cone-acceptance.test.ts — ADR-365 AC-9 on the measured case: the
 * Secret Letter market claim as AC-8 wrote it.
 *
 * AC-8 ran a negative claim over fifteen market rooms, twenty-six wares, and
 * take/drop, and did not finish in 600 seconds. The cone says why: under
 * that set nothing the claim depends on reads any of the wares, so the
 * finding names all twenty-six and proposes dropping the line. The trimmed
 * set, which is AC-8's rooms-only row, then holds by exhaustion in about a
 * second on the real engine at the seed the ADR measured under. The story
 * is read from the corpus and never edited; the fragment is a fixture here.
 * Skipped, like the corpus sweeps, when the repository's corpus is not
 * configured.
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
const corpus = process.env.SHARPEE_TRANSCRIPT_CORPUS;
const STORY = corpus ? resolve(corpus, 'secret-letter/secret-letter.story') : undefined;
const FRAGMENT = resolve(__dirname, 'fixtures/claims/secret-letter-market.claims.chord');

const WARES = [
  'banana', 'pear', 'kello fruit', 'cluster of brambleberries', 'orange', 'lime', 'loaf', 'cheese', 'strip of beef jerky',
  'riding reins', 'harness', 'stirrup', 'plain scabbard', 'belt', 'knife', 'herb jar', 'length of rope',
  'tallow candle', 'red wax candle', 'blue wax candle', 'green wax candle', 'white wax candle', 'clay pot', 'clay urn', 'clay jar', 'clay bowl',
];
const MARKET_ROOMS = [
  'northwest-junction', 'grocery-stall', 'fruit-stall', 'eastern-junction', 'hat-stall', 'leather-stall', "weaponsmith's-stall",
  'exotic-gems-stall', 'herb-stall', 'rope-stall', "candlemaker's-stall", 'pottery-stall', 'outside-the-silk-tent', 'inside-the-silk-tent', 'commerce-street',
];

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

describeWithCorpus("AC-9 — Secret Letter's market claim as AC-8 wrote it", () => {
  it('the finding names all twenty-six wares inert, on the needs things line, and proposes dropping the line', () => {
    const fragment = readFileSync(FRAGMENT, 'utf8');
    const result = compileClaims(readFileSync(STORY!, 'utf8'), fragment, { importResolver: fsResolver(dirname(STORY!)), claimsFile: 'secret-letter-market.claims.chord' });
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => `${d.code}: ${d.message}`)).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.claims?.things).toHaveLength(26);

    const findings = result.diagnostics.filter((d) => d.code === 'analysis.claim-inert-needs');
    expect(findings).toHaveLength(1);
    const [finding] = findings;
    expect(finding.severity).toBe('warning');
    expect(finding.span.file).toBe('secret-letter-market.claims.chord');
    expect(finding.span.line).toBe(fragment.split('\n').findIndex((line) => line.includes('needs things:')) + 1);
    const named = /nothing it depends on reads (.*)\. The walk still runs/.exec(finding.message)?.[1].split(', ');
    expect(named).toEqual(WARES);
    expect(finding.message).toContain('`Jack reaches Commerce Street while the market is calm` depends on none of the 26 things in its set');
    expect(finding.message).toMatch(/the line can go\.$/);
  });

  it('the trimmed set — the rooms alone — holds the claim by exhaustion in about a second on the real engine', async () => {
    const claimSet = normalizeClaimSet(
      {
        story: 'secret-letter',
        source: "AC-8's first claim after the cone's trimming: the fifteen rooms, no things, take and drop",
        rooms: MARKET_ROOMS,
        things: [],
        verbs: ['take', 'drop'],
        claims: [{ name: 'Jack reaches Commerce Street while the market is calm', never: true, room: 'commerce-street' }],
      },
      'secret-letter-market (trimmed)',
    );
    const result = await runClaims(compileStory(STORY!), claimSet, loaderFor(STORY!), { seed: SEED, maxStates: 300_000, maxSeconds: 60, maxDepth: 60 });
    const [claim] = result.claims;
    expect([claim.verdict, claim.settledBy, claim.thingsInSet, claim.inertInSet]).toEqual(['held', 'exhaustion', 0, 0]);
    expect(result.walks[0].stopReason).toBe('frontier-exhausted');
    // AC-8 measured 0.7 s for this row; the bound is loose so a slow machine does not fail it.
    expect(result.totalWalkMs).toBeLessThan(10_000);
  }, 120_000);
});
