/**
 * derived-physical-state.test.ts — the derived runner on ADR-373's breaking
 * and tying clauses, against a REAL game (chord → story-loader → bootstrap,
 * real parser and engine; no stub of an owned dependency).
 *
 *   an `after the player breaking` branch has no grammar of its own, so it
 *     is typed as attacking the thing, and the body's change holds;
 *   an `on the player tying to <anchor>` branch types the two-slot pattern
 *     naming both nouns, and the body's change holds.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { runDerivedSuite, type DerivedGame, type DerivedOutcome } from '../src/derived-runner.js';

const SEED = 7;
const source = readFileSync(resolve(__dirname, 'fixtures/derived/physical-state.story'), 'utf8');

function compileSource(): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

const loader = async (): Promise<DerivedGame> => {
  const story = createStory(compileSource(), { seed: SEED });
  return assembleGame(story, { seed: SEED, freshStory: () => createStory(compileSource(), { seed: SEED }) }) as unknown as DerivedGame;
};

describe('derived runner — breaking and tying (ADR-373)', async () => {
  const run = await runDerivedSuite(compileSource(), loader);
  const outcome = (labelPart: string): DerivedOutcome => {
    const hits = run.outcomes.filter((candidate) => candidate.label.includes(labelPart));
    if (hits.length !== 1) throw new Error(`${hits.length} outcomes match "${labelPart}": ${run.outcomes.map((o) => o.label).join(' | ')}`);
    return hits[0];
  };

  it('reaches an after-breaking branch by attacking the thing, and the body\'s change holds', () => {
    const jar = outcome('specimen jar · after breaking');
    expect(jar.status).toBe('passed');
    expect(jar.command).toBe('attack specimen jar');
    expect(jar.claims.map((claim) => [claim.claim, claim.passed])).toEqual(
      expect.arrayContaining([['specimen-jar is swept', true]]),
    );
  });

  it('types a counterpart-tailed tying branch with both nouns, and the body\'s change holds', () => {
    const line = outcome('mooring line · on tying');
    expect(line.status).toBe('passed');
    expect(line.command).toBe('tie mooring line to sorting machine');
    expect(line.claims.map((claim) => [claim.claim, claim.passed])).toEqual(
      expect.arrayContaining([['mooring-line is fast', true]]),
    );
  });
});
