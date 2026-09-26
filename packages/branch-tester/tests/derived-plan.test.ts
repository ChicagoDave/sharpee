/**
 * derived-plan.test.ts — `planBranch`, the pure half of the derived runner
 * (ADR-356 D3): each enumerated record of the vine fixture maps to the
 * arrange terms, the one command, and the claims the ADR's table names —
 * or to a SKIP with the shape named. No command runs: the plan is what the
 * run will do, asserted before anything runs. The vocabulary standard verbs
 * are typed from is a real booted game's own language provider, read once.
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
import { planBranch, derivedBranchLabel, type ActionPatterns } from '../src/derived-runner.js';

function fixture(name: string): StoryIR {
  const source = readFileSync(resolve(__dirname, 'fixtures/derived', `${name}.story`), 'utf8');
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

const ir = fixture('vine');
const branches = collectClauseBranches(ir);

/** The real game's vocabulary: what the parser will read when the run types a verb. */
const language: ActionPatterns = (() => {
  const game = assembleGame(createStory(ir, { seed: 7 }), { seed: 7 });
  const provider = game.engine.getLanguageProvider();
  return (actionId) => provider.getActionPatterns(actionId);
})();

/** The one branch matching a label fragment, by the runner's own labels. */
function branch(labelPart: string): ClauseBranch {
  const hits = branches.filter((candidate) => derivedBranchLabel(candidate, ir).includes(labelPart));
  if (hits.length !== 1) throw new Error(`${hits.length} branches match "${labelPart}": ${hits.map((b) => derivedBranchLabel(b, ir)).join(' | ')}`);
  return hits[0];
}

describe('planBranch — the flowering arm (the ADR\'s worked example)', () => {
  const plan = planBranch(branch('when flowering'), ir, branches, language);

  it('arranges the guard, the arm, and the player at the subject, in that order', () => {
    expect(plan.kind).toBe('run');
    if (plan.kind !== 'run') return;
    expect(plan.arrange).toEqual([
      { kind: 'pin', expression: 'player.inventory contains garden-shears', mustHold: true },
      { kind: 'pin', expression: 'vine is flowering', mustHold: true },
      { kind: 'reach-subject', subject: 'vine' },
      { kind: 'player-to-subject', subject: 'vine' },
    ]);
  });

  it('types the story action\'s first grammar pattern with the subject', () => {
    expect(plan.kind === 'run' && plan.command).toEqual({ kind: 'typed', input: 'prune vine' });
  });

  it('claims every effect by the table: change, move, phrase', () => {
    expect(plan.kind === 'run' && plan.claims).toEqual([
      { kind: 'pin', expression: 'vine is fruiting' },
      { kind: 'pin', expression: 'silver-locket.location = greenhouse' },
      { kind: 'pin', expression: 'emitted vine-fruits' },
    ]);
    expect(plan.kind === 'run' && plan.unmapped).toEqual([]);
  });
});

describe('planBranch — the refused leaf', () => {
  const plan = planBranch(branch('refused need-shears'), ir, branches, language);

  it('checks the guard fails without writing it', () => {
    expect(plan.kind === 'run' && plan.arrange[0]).toEqual({
      kind: 'pin',
      expression: 'player.inventory contains garden-shears',
      mustHold: false,
    });
  });

  it('claims the refusal and reads the negative space of every sibling body', () => {
    expect(plan.kind === 'run' && plan.claims).toEqual([{ kind: 'pin', expression: 'emitted need-shears' }]);
    expect(plan.kind === 'run' && plan.negativeSpace).toEqual([
      { kind: 'state', entity: 'vine' },
      { kind: 'location', entity: 'silver-locket' },
    ]);
  });
});

describe('planBranch — the other shapes in the fixture', () => {
  it('an after-clause arranges the intercepting on-clause\'s guards as well as its own condition', () => {
    const plan = planBranch(branch('after pruning, once'), ir, branches, language);
    expect(plan.kind === 'run' && plan.arrange).toEqual([
      { kind: 'pin', expression: 'player.inventory contains garden-shears', mustHold: true },
      { kind: 'pin', expression: 'vine is fruiting', mustHold: true },
      { kind: 'reach-subject', subject: 'vine' },
      { kind: 'player-to-subject', subject: 'vine' },
    ]);
    expect(plan.kind === 'run' && plan.claims).toEqual([{ kind: 'score', name: 'vine.fruited', worth: 5 }]);
  });

  it('a standard-action clause types the language pattern; remove and win map to gone and an ending', () => {
    const plan = planBranch(branch('silver locket · on taking'), ir, branches, language);
    expect(plan.kind === 'run' && plan.command).toEqual({ kind: 'typed', input: 'take silver locket' });
    expect(plan.kind === 'run' && plan.arrange).toEqual([
      { kind: 'reach-subject', subject: 'silver-locket' },
      { kind: 'player-to-subject', subject: 'silver-locket' },
    ]);
    expect(plan.kind === 'run' && plan.claims).toEqual([
      { kind: 'pin', expression: 'silver-locket is gone' },
      { kind: 'ending', ending: 'victory', messageId: 'locket-found' },
    ]);
  });

  it('the start block runs no command and claims the player role', () => {
    const plan = planBranch(branch('before the game starts'), ir, branches, language);
    expect(plan).toEqual({
      kind: 'run',
      arrange: [],
      command: { kind: 'none' },
      claims: [{ kind: 'player', entity: 'alex' }],
      negativeSpace: [],
      unmapped: [],
    });
  });

  it('a body with nothing to assert is SKIPPED as no-claims', () => {
    const plan = planBranch(branch('define action pruning'), ir, branches, language);
    expect(plan).toEqual({ kind: 'skip', shape: 'no-claims', detail: 'the body has no effects' });
  });
});

describe('planBranch — shapes outside the floor are named', () => {
  it('a timer-phase guard is arranged as its named non-floor pin', () => {
    const skipIr = fixture('skip');
    const skipBranches = collectClauseBranches(skipIr);
    const guarded = skipBranches.find((candidate) => candidate.clause.kind === 'on' && candidate.clause.action === 'examining')!;
    const plan = planBranch(guarded, skipIr, skipBranches, language);
    expect(plan.kind === 'run' && plan.arrange[0]).toEqual({ kind: 'pin', expression: 'brass-lamp.flicker has expired', mustHold: true });
  });

  it('an action the language has no pattern for is a parse failure, not a skip', () => {
    const noVocabIr = fixture('no-vocabulary');
    const noVocabBranches = collectClauseBranches(noVocabIr);
    const clause = noVocabBranches.find((candidate) => candidate.clause.kind === 'on')!;
    expect(planBranch(clause, noVocabIr, noVocabBranches, language)).toEqual({
      kind: 'no-vocabulary',
      detail: 'no language pattern for if.action.entering_room',
    });
  });

  it('is deterministic: the same record plans the same way twice', () => {
    for (const candidate of branches) {
      expect(JSON.stringify(planBranch(candidate, ir, branches, language))).toBe(
        JSON.stringify(planBranch(candidate, ir, branches, language))
      );
    }
  });
});
