/**
 * derived-platform-words.test.ts — the derived runner on three constructs
 * that play correctly and used to test wrongly (GH #772, GH #735):
 *
 *   a trait clause that writes a platform state word (`change it to lit`),
 *     whose claim read "declares no states";
 *   a story action gated by `while`, whose verb the parser does not know
 *     until the condition holds;
 *   a standard action whose bare pattern the story removed and gave to an
 *     action of its own, so the bare command no longer reaches it.
 *
 * The plan half is asserted pure; the run half is a REAL game (chord →
 * story-loader → bootstrap, real parser and engine; no stub of an owned
 * dependency).
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { collectClauseBranches, type ClauseBranch } from '@sharpee/world-index';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import {
  derivedBranchLabel,
  planBranch,
  runDerivedSuite,
  type ActionPatterns,
  type DerivedGame,
  type DerivedOutcome,
} from '../src/derived-runner.js';

const SEED = 7;
const source = readFileSync(resolve(__dirname, 'fixtures/derived/platform-words.story'), 'utf8');

function compileSource(text: string = source): StoryIR {
  const result = compile(text);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

const ir = compileSource();
const branches = collectClauseBranches(ir);

/** The real game's vocabulary: what the parser will read when the run types a verb. */
const language: ActionPatterns = (() => {
  const game = assembleGame(createStory(ir, { seed: SEED }), { seed: SEED });
  const provider = game.engine.getLanguageProvider();
  return (actionId) => provider.getActionPatterns(actionId);
})();

/** The one branch carrying exactly this label, by the runner's own labels. */
function branchOf(story: StoryIR, all: ClauseBranch[], labelPart: string): ClauseBranch {
  const hits = all.filter((candidate) => derivedBranchLabel(candidate, story) === labelPart);
  if (hits.length !== 1) throw new Error(`${hits.length} branches are labelled "${labelPart}": ${all.map((b) => derivedBranchLabel(b, story)).join(' | ')}`);
  return hits[0];
}

describe('planBranch — a story action\'s `while` is arranged before its verb is typed', () => {
  it('arranges the gate\'s condition as a precondition, first', () => {
    const plan = planBranch(branchOf(ir, branches, 'story · define action shouting'), ir, branches, language);
    expect(plan.kind).toBe('run');
    if (plan.kind !== 'run') return;
    expect(plan.arrange[0]).toEqual({ kind: 'pin', expression: 'tower-bell is tolling', mustHold: true });
    expect(plan.command).toEqual({ kind: 'typed', input: 'shout' });
  });

  it('SKIPS, naming the action, when the gate is no floor form', () => {
    const plan = planBranch(branchOf(ir, branches, 'story · define action humming'), ir, branches, language);
    expect(plan.kind).toBe('skip');
    if (plan.kind !== 'skip') return;
    expect(plan.shape).toBe('condition-chance');
    expect(plan.detail).toContain('the `while` of `define action humming`');
  });

  it('adds nothing for an action with no `while`', () => {
    const plan = planBranch(branchOf(ir, branches, 'hand lamp · on kindling'), ir, branches, language);
    expect(plan.kind).toBe('run');
    if (plan.kind !== 'run') return;
    expect(plan.arrange.filter((term) => term.kind === 'pin').map((term) => (term.kind === 'pin' ? term.expression : ''))).not.toContain(
      'tower-bell is tolling',
    );
  });
});

describe('planBranch — a sibling `on` clause\'s guard is arranged so it does not fire', () => {
  it('puts the other trait\'s requirement ahead of the clause\'s own precondition', () => {
    const plan = planBranch(branchOf(ir, branches, 'great lantern · on kindling · refused already-burning'), ir, branches, language);
    expect(plan.kind).toBe('run');
    if (plan.kind !== 'run') return;
    expect(plan.arrange.slice(0, 2)).toEqual([
      { kind: 'pin', expression: 'glass-lens.location = great-lantern', mustHold: true },
      { kind: 'pin', expression: 'great-lantern is lit', mustHold: true },
    ]);
  });

  it('adds nothing to a thing that composes only one of the traits', () => {
    const plan = planBranch(branchOf(ir, branches, 'hand lamp · on kindling · refused already-burning'), ir, branches, language);
    expect(plan.kind === 'run' && plan.arrange[0]).toEqual({ kind: 'pin', expression: 'hand-lamp is lit', mustHold: true });
  });
});

describe('planBranch — a pattern the story removed is not typed', () => {
  it('types the pattern the standard action still has, leaving its other slot to be filled', () => {
    const plan = planBranch(branchOf(ir, branches, 'hand lamp · on lighting'), ir, branches, language);
    expect(plan.kind).toBe('run');
    if (plan.kind !== 'run') return;
    expect(plan.command).toEqual({
      kind: 'typed',
      input: 'light hand lamp with [something]',
      fillers: [{ token: '[something]', entity: null }],
    });
  });

  it('SKIPS as command-removed when the story removed every pattern of the action', () => {
    const everyPattern = compileSource(source.replace('  light the target\n\nextend action kindling', '  light the target\n  light the target with or using the tool\n\nextend action kindling'));
    const all = collectClauseBranches(everyPattern);
    const plan = planBranch(branchOf(everyPattern, all, 'hand lamp · on lighting'), everyPattern, all, language);
    expect(plan).toEqual({ kind: 'skip', shape: 'command-removed', detail: 'the story removed every pattern of if.action.lighting' });
  });
});

const loader = async (): Promise<DerivedGame> => {
  const story = createStory(compileSource(), { seed: SEED });
  return assembleGame(story, { seed: SEED, freshStory: () => createStory(compileSource(), { seed: SEED }) }) as unknown as DerivedGame;
};

describe('derived runner — platform words, a gated action and moved grammar, on a real game', async () => {
  const run = await runDerivedSuite(compileSource(), loader);
  const outcome = (labelPart: string): DerivedOutcome => {
    const hits = run.outcomes.filter((candidate) => candidate.label === labelPart);
    if (hits.length !== 1) throw new Error(`${hits.length} outcomes are labelled "${labelPart}": ${run.outcomes.map((o) => o.label).join(' | ')}`);
    return hits[0];
  };

  it('a trait clause\'s `change it to lit` is claimed off the light source, and holds', () => {
    const kindled = outcome('hand lamp · on kindling');
    expect(kindled.status).toBe('passed');
    expect(kindled.claims.map((claim) => [claim.claim, claim.passed])).toEqual(
      expect.arrayContaining([['hand-lamp is lit', true]]),
    );
  });

  it('the refusal that needs the lamp already lit arranges `lit` on the trait and fires', () => {
    const burning = outcome('hand lamp · on kindling · refused already-burning');
    expect(burning.status).toBe('passed');
    expect(burning.arranged).toContain('hand-lamp is lit');
    expect(burning.claims.map((claim) => [claim.claim, claim.passed])).toEqual(
      expect.arrayContaining([['emitted already-burning', true]]),
    );
  });

  it('an entity clause\'s `change … to whole` is claimed off the breakable, and holds', () => {
    const mended = outcome('cracked lens · on pulling');
    expect(mended.status).toBe('passed');
    expect(mended.claims.map((claim) => [claim.claim, claim.passed])).toEqual(
      expect.arrayContaining([['cracked-lens is whole', true]]),
    );
  });

  it('a gated action is reached with its gate arranged', () => {
    const shouted = outcome('story · define action shouting');
    expect(shouted.status).toBe('passed');
    expect(shouted.command).toBe('shout');
    expect(shouted.claims.map((claim) => [claim.claim, claim.passed])).toEqual([['emitted shouted', true]]);
  });

  it('a lighting clause is reached by the pattern lighting still has, not the one moved to kindling', () => {
    const lighting = outcome('hand lamp · on lighting');
    expect(lighting.status).toBe('passed');
    expect(lighting.command).toBe('light hand lamp with wax taper');
    expect(lighting.claims.map((claim) => [claim.claim, claim.passed])).toEqual([['emitted light-needs-the-word', true]]);
  });

  it('a thing composing two traits that answer one action arranges the other trait\'s requirement', () => {
    // Two branches carry this label, one per trait; the lens-seat's has no
    // body to claim and is SKIPPED, so the wick's is the one that ran.
    const labelled = run.outcomes.filter((candidate) => candidate.label === 'great lantern · on kindling');
    expect(labelled.map((candidate) => (candidate.status === 'error' || candidate.status === 'failed' ? `${candidate.status}: ${candidate.detail}` : candidate.status)).sort()).toEqual(['passed', 'skipped']);
    const kindled = labelled.find((candidate) => candidate.status === 'passed')!;
    expect(kindled.arranged).toContain('glass-lens.location = great-lantern');
    expect(kindled.claims.map((claim) => [claim.claim, claim.passed])).toEqual(
      expect.arrayContaining([['great-lantern is lit', true]]),
    );
    const burning = outcome('great lantern · on kindling · refused already-burning');
    expect(burning.status).toBe('passed');
    expect(burning.claims.map((claim) => [claim.claim, claim.passed])).toEqual(
      expect.arrayContaining([['emitted already-burning', true]]),
    );
    const empty = outcome('great lantern · on kindling · refused lantern-empty');
    expect(empty.status).toBe('passed');
  });

  it('fails nothing in the fixture', () => {
    expect(run.outcomes.filter((candidate) => candidate.status === 'failed').map((candidate) => `${candidate.label}: ${candidate.detail}`)).toEqual([]);
  });
});
