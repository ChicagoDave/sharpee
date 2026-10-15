/**
 * derived-counterpart.test.ts — the derived runner on ADR-372's two-noun and
 * readable-topic clauses, against a REAL game (chord → story-loader →
 * bootstrap, real parser and engine; no stub of an owned dependency).
 *
 *   a counterpart tail types the two-slot pattern naming both nouns; a fixed
 *     subject takes the later slot and its counterpart is put in hand;
 *   a portable subject leads, and the counterpart is only reached;
 *   a person's request names the thing asked for, and its refusal arm
 *     holds the other arm's effect still;
 *   a readable thing's topic is typed as consulting, not asking;
 *   a vocabulary with no two-slot pattern SKIPS the branch as command-shape.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { collectClauseBranches } from '@sharpee/world-index';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { derivedBranchLabel, planBranch, runDerivedSuite, type DerivedGame, type DerivedOutcome } from '../src/derived-runner.js';

const SEED = 7;
const source = readFileSync(resolve(__dirname, 'fixtures/derived/counterpart.story'), 'utf8');

function compileSource(): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

const loader = async (): Promise<DerivedGame> => {
  const story = createStory(compileSource(), { seed: SEED });
  return assembleGame(story, { seed: SEED, freshStory: () => createStory(compileSource(), { seed: SEED }) }) as unknown as DerivedGame;
};

describe('derived runner — counterpart tails and readable topics (ADR-372)', async () => {
  const ir = compileSource();
  const run = await runDerivedSuite(ir, loader);
  const outcome = (labelPart: string): DerivedOutcome => {
    const hits = run.outcomes.filter((candidate) => candidate.label.includes(labelPart));
    if (hits.length !== 1) throw new Error(`${hits.length} outcomes match "${labelPart}": ${run.outcomes.map((o) => o.label).join(' | ')}`);
    return hits[0];
  };

  it('a fixed subject: the counterpart is put in hand and thrown at the subject, and the move holds', () => {
    const bin = outcome('returns bin · on throwing');
    expect(bin.status).toBe('passed');
    expect(bin.command).toBe('throw dead letter at returns bin');
    expect(bin.arranged).toContain('player.inventory contains dead-letter');
    expect(bin.claims.map((claim) => [claim.claim, claim.passed])).toEqual(
      expect.arrayContaining([[expect.stringContaining('dead-letter.location = returns-bin'), true]]),
    );
  });

  it('a portable subject leads: it is held and thrown at its counterpart, and the state change holds', () => {
    const ball = outcome('dust ball · on throwing');
    expect(ball.status).toBe('passed');
    expect(ball.command).toBe('throw dust ball at brass gong');
    expect(ball.arranged).toContain('player.inventory contains dust-ball');
    expect(ball.arranged).not.toContain('player.inventory contains brass-gong');
    expect(ball.claims.some((claim) => claim.claim.includes('brass-gong is ringing') && claim.passed)).toBe(true);
  });

  it('a request names the thing asked for: the grant moves it to the player, the refusal leaves it with the grocer', () => {
    const granted = run.outcomes.find((o) => o.label === 'grocer · on asking_for');
    const refused = outcome('grocer · on asking_for · refused grocer-sulks');
    expect(granted?.status).toBe('passed');
    expect(granted?.command).toBe('ask grocer for ration bar');
    expect(granted?.claims.some((claim) => claim.claim.includes('player.inventory contains ration-bar') && claim.passed)).toBe(true);
    expect(refused.status).toBe('passed');
    expect(refused.command).toBe('ask grocer for ration bar');
    expect(refused.arranged).toContain('grocer is sulking');
  });

  it('a readable thing\'s topic is consulted, and its change holds', () => {
    const topic = outcome('station directory · topic vance');
    expect(topic.status).toBe('passed');
    expect(topic.command).toBe('consult station directory about vance');
    expect(topic.claims.some((claim) => claim.claim.includes('station-directory is consulted') && claim.passed)).toBe(true);
  });

  it('nothing fails: every branch passes or is named', () => {
    expect(run.failed).toBe(0);
    expect(run.errored).toBe(0);
  });

  it('a vocabulary with no two-slot pattern SKIPS the counterpart branch as command-shape', () => {
    const branches = collectClauseBranches(ir);
    const bin = branches.find((candidate) => derivedBranchLabel(candidate, ir) === 'returns bin · on throwing');
    expect(bin).toBeDefined();
    const plan = planBranch(bin!, ir, branches, (actionId) => (actionId === 'if.action.throwing' ? ['throw [something]'] : undefined));
    expect(plan).toEqual({
      kind: 'skip',
      shape: 'command-shape',
      detail: 'no pattern of if.action.throwing has slots for its subject and dead-letter',
    });
  });
});
