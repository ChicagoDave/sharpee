/**
 * derived-runner.test.ts — the derived rule-test runner end to end (ADR-356
 * D3), against REAL games: each fixture is compiled by `@sharpee/chord`,
 * loaded by `@sharpee/story-loader`, assembled by `@sharpee/bootstrap`, and
 * every command runs through the real parser and engine (ADR-293 D12). No
 * stub of any owned dependency.
 *
 * The ADR's acceptance criteria, each a named test:
 *   AC-2 — the vine's `when flowering` branch passes as written and fails
 *          by name with its `move` line deleted;
 *   AC-3 — a planted "refuse, then change the state anyway" defect fails on
 *          the state assertion, not the message;
 *   AC-4 — a branch guarded by a non-floor shape is SKIPPED with the shape
 *          named and still counted (total = the enumerator's count);
 *   AC-7 — a branch whose command has no vocabulary is a parse failure;
 *   AC-9 — nothing derived is written to disk (D6).
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { collectClauseBranches } from '@sharpee/world-index';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { runDerivedSuite, type DerivedGame, type DerivedOutcome, type DerivedSuiteResult } from '../src/derived-runner.js';

const SEED = 7;

function fixtureSource(name: string): string {
  return readFileSync(resolve(__dirname, 'fixtures/derived', `${name}.story`), 'utf8');
}

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

/** Boots one fresh real game at the pinned seed, the way `sharpee test` does. */
function loaderFor(source: string): () => Promise<DerivedGame> {
  return async () => {
    const story = createStory(compileSource(source), { seed: SEED });
    return assembleGame(story, { seed: SEED, freshStory: () => createStory(compileSource(source), { seed: SEED }) }) as unknown as DerivedGame;
  };
}

async function runFixture(name: string): Promise<{ ir: StoryIR; run: DerivedSuiteResult }> {
  const source = fixtureSource(name);
  const ir = compileSource(source);
  const run = await runDerivedSuite(ir, loaderFor(source));
  return { ir, run };
}

function outcome(run: DerivedSuiteResult, labelPart: string): DerivedOutcome {
  const hits = run.outcomes.filter((candidate) => candidate.label.includes(labelPart));
  if (hits.length !== 1) throw new Error(`${hits.length} outcomes match "${labelPart}": ${run.outcomes.map((o) => o.label).join(' | ')}`);
  return hits[0];
}

describe('AC-2 — the vine fixture, as written', () => {
  it('passes every branch it can run and skips the one with nothing to claim', async () => {
    const { run } = await runFixture('vine');
    const byStatus = Object.fromEntries(run.outcomes.map((o) => [o.label, o.status]));
    expect(byStatus).toEqual({
      'vine · after pruning, once': 'passed',
      'silver locket · on taking': 'passed',
      'vine · on pruning · refused need-shears': 'passed',
      'vine · on pruning · when seedling': 'passed',
      'vine · on pruning · when flowering': 'passed',
      'vine · on pruning · when fruiting': 'passed',
      'story · before the game starts': 'passed',
      'story · define action pruning': 'skipped',
    });
    expect([run.total, run.passed, run.failed, run.skipped, run.errored]).toEqual([8, 7, 0, 1, 0]);
    // D5's rooms contribution: every room a branch placed the player in, as IR ids.
    expect(run.roomsEntered).toContain('greenhouse');
    expect(run.outcomes.find((o) => o.label === 'vine · on pruning · when flowering')?.rooms).toEqual(['greenhouse']);
    expect(run.outcomes.find((o) => o.status === 'skipped')?.rooms).toBeUndefined();
  }, 30_000);

  it('the flowering branch arranged the precondition, typed the command, and every claim held', async () => {
    const { run } = await runFixture('vine');
    const flowering = outcome(run, 'when flowering');
    expect(flowering.command).toBe('prune vine');
    expect(flowering.arranged).toEqual([
      'player.inventory contains garden-shears',
      'vine is flowering',
      expect.stringMatching(/^player\.location = /),
    ]);
    expect(flowering.claims).toEqual([
      { claim: 'vine is fruiting', passed: true },
      { claim: 'silver-locket.location = greenhouse', passed: true },
      { claim: 'emitted vine-fruits', passed: true },
    ]);
  }, 30_000);

  it('a remove is asserted as gone and a win as the ending with its id; an award as the score delta', async () => {
    const { run } = await runFixture('vine');
    expect(outcome(run, 'on taking').claims).toEqual([
      { claim: 'silver-locket is gone', passed: true },
      { claim: 'ending victory locket-found', passed: true },
    ]);
    expect(outcome(run, 'after pruning, once').claims).toEqual([{ claim: 'score = 5 (award vine.fruited)', passed: true }]);
  }, 30_000);
});

describe('AC-2 — the vine fixture with the move line deleted', () => {
  it('fails the flowering branch on the locket claim, by name, and nothing else', async () => {
    // The suite is derived from what the story DECLARES, so the claims come
    // from the intact story's IR; the game that runs them is the one whose
    // flowering arm lost its `move` line — a rule the source states and the
    // running story does not honour, which is exactly what a derived test
    // exists to catch.
    const ir = compileSource(fixtureSource('vine'));
    const run = await runDerivedSuite(ir, loaderFor(fixtureSource('vine-defect')));
    const flowering = outcome(run, 'when flowering');
    expect(flowering.status).toBe('failed');
    expect(flowering.claims).toEqual([
      { claim: 'vine is fruiting', passed: true },
      {
        claim: 'silver-locket.location = greenhouse',
        passed: false,
        message: expect.stringContaining('silver-locket.location is'),
      },
      { claim: 'emitted vine-fruits', passed: true },
    ]);
    expect(run.outcomes.filter((o) => o.status === 'failed').map((o) => o.label)).toEqual(['vine · on pruning · when flowering']);
  }, 30_000);
});

describe('AC-3 — a refusal that fires and then the state changes anyway', () => {
  it('fails on the negative space, not on the message', async () => {
    const { run } = await runFixture('guard-defect');
    const refused = outcome(run, 'refused need-shears');
    expect(refused.status).toBe('failed');
    expect(refused.claims).toEqual([
      { claim: 'emitted need-shears', passed: true },
      {
        claim: "unchanged: vine's state",
        passed: false,
        message: expect.stringContaining('changed from "seedling" to "fruiting"'),
      },
      { claim: "unchanged: silver-locket's location", passed: true },
    ]);
  }, 30_000);

  it('the planted every-turn clause itself passes as its own branch', async () => {
    const { run } = await runFixture('guard-defect');
    const everyTurn = outcome(run, 'on every-turn');
    expect(everyTurn.status).toBe('passed');
    expect(everyTurn.command).toBe('wait');
    expect(everyTurn.claims).toEqual([{ claim: 'vine is fruiting', passed: true }]);
  }, 30_000);
});

describe('AC-4 — a precondition the floor cannot arrange', () => {
  it('is SKIPPED with the shape named, and still counted against the enumerator\'s total', async () => {
    const { ir, run } = await runFixture('skip');
    const guarded = outcome(run, 'on examining');
    expect(guarded.status).toBe('skipped');
    expect(guarded.shape).toBe('timer-phase');
    expect(guarded.arranged).toEqual([]);
    expect(guarded.span).toEqual(guarded.branch.span);

    expect(outcome(run, 'on touching')).toMatchObject({ status: 'passed', command: 'touch brass lamp', claims: [{ claim: 'brass-lamp is lit', passed: true }] });

    expect(run.total).toBe(collectClauseBranches(ir).length);
    expect(run.outcomes.length).toBe(run.total);
    expect(run.passed + run.failed + run.skipped + run.errored).toBe(run.total);
  }, 30_000);
});

describe('AC-7 — a command the parser cannot resolve', () => {
  it('is a failed test naming the parse failure, never a skip', async () => {
    const { run } = await runFixture('no-vocabulary');
    const clause = outcome(run, 'on entering_room');
    expect(clause.status).toBe('failed');
    expect(clause.detail).toBe('parse failure: no language pattern for if.action.entering_room');
    expect(run.skipped).toBe(0);
  }, 30_000);
});

describe('implicit arrangement — the command reaches its subject', () => {
  it('opens and unlocks what encloses the subject, holds the tool, closes the door to open it, walks to the speaker', async () => {
    const { run } = await runFixture('reach');
    const byStatus = Object.fromEntries(run.outcomes.map((o) => [o.label, o.status]));
    expect(byStatus).toEqual({
      'Hall · after entering': 'skipped',
      'scroll · on reading': 'passed',
      'cellar door · after opening': 'passed',
      'rope · on cutting': 'passed',
      'cook · topic the weather': 'passed',
      'story · before the game starts': 'passed',
    });

    expect(outcome(run, 'after entering').shape).toBe('command-lifecycle');

    const scroll = outcome(run, 'on reading');
    expect(scroll.command).toBe('read scroll');
    expect(scroll.arranged).toEqual([
      expect.stringMatching(/\.isLocked = false$/),
      expect.stringMatching(/\.isOpen = true$/),
      expect.stringMatching(/^player\.location = /),
    ]);
    expect(scroll.claims).toEqual([{ claim: 'emitted scroll-text', passed: true }]);

    const door = outcome(run, 'after opening');
    expect(door.command).toBe('open cellar door');
    expect(door.arranged).toEqual([expect.stringMatching(/^player\.location = /), expect.stringMatching(/\.isLocked = false$/)]);
    expect(door.claims).toEqual([{ claim: 'cellar-door is swung', passed: true }]);

    const rope = outcome(run, 'on cutting');
    expect(rope.command).toBe('cut rope');
    expect(rope.arranged).toEqual([expect.stringMatching(/^player\.location = /), expect.stringMatching(/^player\.inventory contains /)]);
    expect(rope.claims).toEqual([{ claim: 'rope is cut', passed: true }]);

    const cook = outcome(run, 'topic the weather');
    expect(cook.command).toBe('ask cook about the weather');
    expect(cook.arranged).toEqual([expect.stringMatching(/^player\.location = /)]);
    expect(cook.claims).toEqual([{ claim: 'emitted weather-talk', passed: true }]);
  }, 30_000);
});

describe('AC-9 — nothing derived is written to disk (D6)', () => {
  const fixtures = resolve(__dirname, 'fixtures/derived');
  const repoRoot = resolve(__dirname, '../../..');

  /** Every file under the fixture directory with its size and mtime — the disk as it stands. */
  function snapshot(): string {
    return readdirSync(fixtures)
      .sort()
      .map((name) => {
        const info = statSync(resolve(fixtures, name));
        return `${name} ${info.size} ${info.mtimeMs}`;
      })
      .join('\n');
  }

  it('leaves the fixture project exactly as it was, by git and by the filesystem', async () => {
    const gitBefore = execFileSync('git', ['status', '--porcelain', '--', fixtures], { cwd: repoRoot, encoding: 'utf8' });
    const diskBefore = snapshot();
    for (const name of ['vine', 'guard-defect', 'skip', 'no-vocabulary', 'reach']) {
      await runFixture(name);
    }
    expect(execFileSync('git', ['status', '--porcelain', '--', fixtures], { cwd: repoRoot, encoding: 'utf8' })).toBe(gitBefore);
    expect(snapshot()).toBe(diskBefore);
  }, 60_000);
});

describe('determinism', () => {
  it('two runs of the vine fixture are byte-identical', async () => {
    const strip = (run: DerivedSuiteResult) => JSON.stringify(run.outcomes.map(({ branch: _branch, ...rest }) => rest));
    const first = await runFixture('vine');
    const second = await runFixture('vine');
    expect(strip(second.run)).toBe(strip(first.run));
  }, 60_000);
});
