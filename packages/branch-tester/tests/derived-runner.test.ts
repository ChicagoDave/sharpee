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
    const guarded = outcome(run, 'on smelling');
    expect(guarded.status).toBe('skipped');
    expect(guarded.shape).toBe('predicate-is');
    expect(guarded.arranged).toEqual([]);
    expect(guarded.span).toEqual(guarded.branch.span);

    expect(outcome(run, 'on touching')).toMatchObject({ status: 'passed', command: 'touch brass lamp', claims: [{ claim: 'brass-lamp is lit', passed: true }] });

    expect(run.total).toBe(collectClauseBranches(ir).length);
    expect(run.outcomes.length).toBe(run.total);
    expect(run.passed + run.failed + run.skipped + run.errored).toBe(run.total);
  }, 30_000);
});

describe('a timer phase is arranged, not skipped (ADR-356 D2 as amended 2026-09-27)', () => {
  it('arranges `has expired` on the lamp\'s timer and proves the guarded clause fires', async () => {
    const { run } = await runFixture('skip');
    const guarded = outcome(run, 'on examining');
    expect(guarded.status).toBe('passed');
    expect(guarded.arranged).toContain('brass-lamp.flicker has expired');
    expect(guarded.claims).toEqual([{ claim: 'emitted lamp-after', passed: true }]);
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
      'cook · topic rope': 'passed',
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

    // The rope starts in the Hall; the cook is in the Pantry. The ask names
    // the rope, so the rope is brought to the cook's room after the player is.
    const ropeTopic = outcome(run, 'topic rope');
    expect(ropeTopic.command).toBe('ask cook about rope');
    expect(ropeTopic.arranged).toEqual([expect.stringMatching(/^player\.location = /), expect.stringMatching(/^rope\.location = /)]);
    expect(ropeTopic.arranged![0].slice('player.location = '.length)).toBe(ropeTopic.arranged![1].slice('rope.location = '.length));
    expect(ropeTopic.claims).toEqual([{ claim: 'emitted rope-talk', passed: true }]);
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

describe('condition compositions — the compose fixture, end to end', () => {
  it('runs what the compositions arrange and names what they cannot', async () => {
    const { run } = await runFixture('compose');
    const byStatus = Object.fromEntries(run.outcomes.map((o) => [o.label, o.status]));
    expect(byStatus).toEqual({
      'lamp · on switching_on · refused lamp-bell-first': 'passed',
      'lamp · on switching_on · refused lamp-contradiction': 'skipped',
      'lamp · on switching_on · refused lamp-flickers': 'passed',
      'lamp · on switching_on': 'skipped',
      'bell · on examining · refused too-dark': 'passed',
      'bell · on examining': 'passed',
      'bell · on ringing · refused bell-outside': 'passed',
      'bell · on ringing · refused ring-done': 'passed',
      'bell · on ringing · refused ring-quiet': 'passed',
      'bell · on ringing': 'passed',
      'gong · on examining · refused cat-startled': 'passed',
      'gong · on examining': 'passed',
      'story · before the game starts': 'passed',
      'story · define action ringing': 'skipped',
    });
    expect([run.total, run.passed, run.failed, run.skipped, run.errored]).toEqual([14, 11, 0, 3, 0]);
  }, 30_000);

  it('a thing that must be `here` is placed after the player: the cat reaches the gong\'s room, not the boot room', async () => {
    const { run } = await runFixture('compose');
    const startled = outcome(run, 'refused cat-startled');
    expect(startled.arranged).toEqual([expect.stringMatching(/^player\.location = /), expect.stringMatching(/^cat\.location = /)]);
    const [playerRoom, catRoom] = startled.arranged.map((expression) => expression.split(' = ')[1]);
    expect(catRoom).toBe(playerRoom);
    expect(startled.rooms).toEqual(['yard']);
    expect(startled.claims).toContainEqual({ claim: 'emitted cat-startled', passed: true });
    // The through leaf reads `cat is here` against the settled room too: the cat stayed in the Hall, so it fails, and the body runs.
    const through = run.outcomes.find((o) => o.label === 'gong · on examining')!;
    expect(through.status).toBe('passed');
    expect(through.arranged).toEqual([expect.stringMatching(/^player\.location = /)]);
  }, 30_000);

  it('a named open condition read `it` as the subject: the bell went to the Yard and the player followed', async () => {
    const { run } = await runFixture('compose');
    const outside = outcome(run, 'refused bell-outside');
    expect(outside.command).toBe('ring bell');
    expect(outside.arranged).toEqual(['bell.location = yard', expect.stringMatching(/^player\.location = /)]);
    expect(outside.rooms).toEqual(['yard']);
    expect(outside.claims).toContainEqual({ claim: 'emitted bell-outside', passed: true });
  }, 30_000);

  it('a failed `and` is proved by the arranged world and a named `or` by its leftmost witness — then the body runs', async () => {
    const { run } = await runFixture('compose');
    const quiet = outcome(run, 'refused ring-quiet');
    expect(quiet.arranged).toEqual(['lamp is warm', expect.stringMatching(/^player\.location = /)]);
    expect(quiet.claims).toContainEqual({ claim: 'emitted ring-quiet', passed: true });
    // The through leaf's negated guards are two-state entities: each is written as its complement, not read.
    const through = run.outcomes.find((o) => o.label === 'bell · on ringing')!;
    expect(through.arranged).toEqual(['lamp is cold', 'bell is still', expect.stringMatching(/^player\.location = /)]);
    expect(through.claims).toContainEqual({ claim: 'bell is rung', passed: true });
  }, 30_000);

  it('checks run after every write: a guard pair whose preconditions contradict is SKIPPED as a negation, never run', async () => {
    const { run } = await runFixture('compose');
    const contradiction = outcome(run, 'refused lamp-contradiction');
    expect(contradiction.status).toBe('skipped');
    expect(contradiction.shape).toBe('negation');
    expect(contradiction.detail).toBe('`bell is rung` already holds in the arranged world');
    // Every write landed before the check read it — the write that made the check fail is in the list.
    expect(contradiction.arranged).toEqual(['bell is rung', 'lamp is cold', expect.stringMatching(/^player\.location = /)]);
    expect(contradiction.command).toBeUndefined();
  }, 30_000);

  it('an `and` whose every operand already holds is made to fail by its leftmost two-valued operand, and the witness skips an operand that maps to nothing', async () => {
    const { run } = await runFixture('compose');
    // `not (bell is still and lamp is cold)`: both hold at boot, both are two-state entities; the leftmost is written.
    const examine = run.outcomes.find((o) => o.label === 'bell · on examining')!;
    expect(examine.status).toBe('passed');
    expect(examine.arranged).toContain('bell is rung');
    const flickers = outcome(run, 'refused lamp-flickers');
    expect(flickers.arranged).toContain('bell is still');
    expect(flickers.claims).toContainEqual({ claim: 'emitted lamp-flickers', passed: true });
    const lampThrough = run.outcomes.find((o) => o.label === 'lamp · on switching_on')!;
    expect(lampThrough.shape).toBe('condition-chance');
  }, 30_000);
});

describe('reach for every noun the command names (GH #549 Phase 2)', () => {
  it('fills the unnamed slot, holds what must be held, brings what must be present, and names the gap it cannot fill', async () => {
    const { run } = await runFixture('reach-nouns');
    const byStatus = Object.fromEntries(run.outcomes.map((o) => [o.label, o.status]));
    expect(byStatus).toEqual({
      'clerk · on showing': 'passed',
      'clerk · on giving': 'passed',
      'apron · on wearing': 'passed',
      'dough · on touching': 'passed',
      'locket · on showing': 'passed',
      'medal · on showing': 'passed',
      'guard · on giving': 'passed',
      'ghost · on showing': 'skipped',
      'plank · on inserting': 'passed',
      'coin · on giving': 'passed',
      'story · before the game starts': 'passed',
    });

    // The clerk is the viewer; the coin the player carries fills the item slot.
    const showClerk = outcome(run, 'clerk · on showing');
    expect(showClerk.command).toBe('show coin to clerk');
    expect(showClerk.arranged).toEqual([expect.stringMatching(/^player\.location = /)]);
    expect(showClerk.claims).toEqual([{ claim: 'emitted clerk-shrug', passed: true }]);
    // The coin has a giving clause of its own, which would answer instead of the clerk's: the button fills the slot.
    expect(outcome(run, 'clerk · on giving').command).toBe('give button to clerk');

    // The clerk carries the apron: wearing needs it in the player's hands.
    const apron = outcome(run, 'on wearing');
    expect(apron.command).toBe('wear apron');
    expect(apron.arranged).toEqual([expect.stringMatching(/^player\.location = /), 'player.inventory contains apron']);
    expect(apron.claims).toEqual([{ claim: 'emitted apron-no', passed: true }]);

    // The clerk carries the dough: touching needs it in the player's room, not their hands.
    const dough = outcome(run, 'on touching');
    expect(dough.command).toBe('touch dough');
    expect(dough.arranged).toEqual([expect.stringMatching(/^player\.location = /), expect.stringMatching(/^dough\.location = /)]);
    expect(dough.arranged![1].slice('dough.location = '.length)).toBe(dough.arranged![0].slice('player.location = '.length));
    expect(dough.claims).toEqual([{ claim: 'emitted dough-no', passed: true }]);

    // The locket is the item; the clerk, already in the room, is the viewer.
    const locket = outcome(run, 'locket · on showing');
    expect(locket.command).toBe('show locket to clerk');
    expect(locket.arranged).toEqual([expect.stringMatching(/^player\.location = /), 'player.inventory contains locket']);

    // Nobody is in the Attic: the first declared person is brought to the medal.
    const medal = outcome(run, 'medal · on showing');
    expect(medal.command).toBe('show medal to clerk');
    expect(medal.arranged).toEqual([
      expect.stringMatching(/^player\.location = /),
      'player.inventory contains medal',
      expect.stringMatching(/^clerk\.location = /),
    ]);
    expect(medal.arranged![2].slice('clerk.location = '.length)).toBe(medal.arranged![0].slice('player.location = '.length));
    expect(medal.claims).toEqual([{ claim: 'emitted medal-shine', passed: true }]);

    expect(outcome(run, 'guard · on giving').command).toBe('give button to guard');
    expect(outcome(run, 'ghost · on showing').shape).toBe('subject-offstage');

    // The `in` slot wants a container: the crate, not the coin the player holds.
    const plank = outcome(run, 'plank · on inserting');
    expect(plank.command).toBe('insert plank in crate');
    expect(plank.arranged).toEqual([expect.stringMatching(/^player\.location = /), 'player.inventory contains plank', 'crate.isOpen = true']);
    expect(plank.claims).toEqual([{ claim: 'emitted plank-no', passed: true }]);
  }, 30_000);

  it('a slot nothing can fill is SKIPPED object-unreachable before any command is typed', async () => {
    const { run } = await runFixture('reach-nobody');
    const medal = outcome(run, 'medal · on showing');
    expect(medal.status).toBe('skipped');
    expect(medal.shape).toBe('object-unreachable');
    expect(medal.detail).toContain('[someone]');
    expect(medal.command).toBeUndefined();
    expect(run.total).toBe(run.outcomes.length);
  }, 30_000);
});

describe('keys, typed names, and trait words (GH #549 Phase 3)', () => {
  it('types the key, drops the slot a lock does not name, picks the alias nothing else answers to, and writes a flag word as the flag', async () => {
    const { run } = await runFixture('keys-and-names');
    const byStatus = Object.fromEntries(run.outcomes.map((o) => [o.label, o.status]));
    expect(byStatus).toEqual({
      'cellar door · after unlocking': 'passed',
      'padlock · on unlocking': 'passed',
      'strongbox · on opening · refused box-locked': 'passed',
      'strongbox · on opening': 'skipped',
      'pear · on taking': 'passed',
      'shadow · on examining': 'skipped',
      'stove · on examining · refused stove-hot-closed': 'passed',
      'stove · on examining · refused stove-hot-open': 'passed',
      'stove · on examining': 'skipped',
      'story · before the game starts': 'passed',
    });

    const door = outcome(run, 'cellar door · after unlocking');
    expect(door.command).toBe('unlock cellar door with iron key');
    expect(door.arranged).toEqual([expect.stringMatching(/^player\.location = /), expect.stringMatching(/^player\.inventory contains /)]);
    expect(door.claims).toEqual([{ claim: 'cellar-door is swung', passed: true }]);

    expect(outcome(run, 'padlock · on unlocking').command).toBe('unlock padlock');

    // The clause pins `locked`; the implicit unlock-to-open must not undo it.
    const boxLocked = outcome(run, 'refused box-locked');
    expect(boxLocked.arranged).toEqual(['strongbox is locked', expect.stringMatching(/^player\.location = /)]);
    expect(boxLocked.claims).toEqual([{ claim: 'emitted box-locked', passed: true }]);
    expect(outcome(run, 'pear · on taking').command).toBe('take green pear');

    const shadow = outcome(run, 'shadow · on examining');
    expect(shadow.shape).toBe('name-ambiguous');
    expect(shadow.detail).toContain('figure');
    expect(shadow.command).toBeUndefined();

    // `stove is closed` is the openable flag: written as the flag, the declared state `hot` survives it.
    const hotClosed = outcome(run, 'refused stove-hot-closed');
    expect(hotClosed.arranged).toEqual(['stove is hot', 'stove is closed', expect.stringMatching(/^player\.location = /)]);
    expect(hotClosed.claims).toEqual([{ claim: 'emitted stove-hot-closed', passed: true }]);
    // `not (hot and closed)` with `hot` held: `closed` is two-valued, so the
    // conjunction is made to fail by writing `open` — in the check pass, after
    // every write — never left to a read that would skip the branch.
    const hotOpen = outcome(run, 'refused stove-hot-open');
    expect(hotOpen.arranged).toEqual(['stove is hot', expect.stringMatching(/^player\.location = /), 'stove is open']);
    expect(hotOpen.claims).toEqual([{ claim: 'emitted stove-hot-open', passed: true }]);
  }, 30_000);
});

describe('selecting state — intercepting guards, guard order, two-valued negations, response ladders (GH #549 Phase 4)', () => {
  it('an after clause arranges its on clause\'s refusals to NOT fire, writes two-valued complements, and names what it cannot', async () => {
    const { run } = await runFixture('intercepting');
    const byStatus = Object.fromEntries(run.outcomes.map((o) => [o.label, o.status]));
    expect(byStatus).toEqual({
      'banana · on taking · refused banana-blocked': 'passed',
      'banana · on taking': 'skipped',
      'banana · after taking': 'skipped',
      'crate · on opening · refused crate-stuck': 'passed',
      'crate · on opening': 'skipped',
      'crate · after opening': 'passed',
      'lamp · on examining · refused too-dark': 'passed',
      'lamp · on examining': 'skipped',
      'lamp · after examining': 'passed',
      'relic · on taking': 'passed',
      'relic · after taking': 'skipped',
      'story · before the game starts': 'passed',
    });

    // Three story phases: `not calm` has no complement, so the reaction is a named gap — not blocked by a guard the runner itself arranged.
    const banana = outcome(run, 'banana · after taking');
    expect(banana.shape).toBe('negation');
    expect(banana.detail).toBe('`story.state = calm` already holds in the arranged world');
    expect(banana.arranged).not.toContain('story.state = calm');

    // `not locked` is a flag: written as unlocked, and the reaction runs.
    const crate = outcome(run, 'crate · after opening');
    expect(crate.arranged[0]).toBe('crate is unlocked');
    expect(crate.claims).toEqual([{ claim: 'crate is breached', passed: true }]);

    // `not dim` on a two-state entity: written as bright.
    const lamp = outcome(run, 'lamp · after examining');
    expect(lamp.arranged[0]).toBe('lamp is bright');
    expect(lamp.claims).toEqual([{ claim: 'lamp is dim', passed: true }]);

    // An unconditional refusal intercepts every firing: the reaction can never run.
    const relic = outcome(run, 'relic · after taking');
    expect(relic.shape).toBe('intercepted');
    expect(relic.detail).toContain('relic-cursed');
  }, 30_000);

  it('a define action\'s must line is tested behind its refuse-when ladder, as the loader runs it', async () => {
    const { run } = await runFixture('must-order');
    const byStatus = Object.fromEntries(run.outcomes.map((o) => [o.label, o.status]));
    expect(byStatus).toEqual({
      'story · define action bathing · refused water-cold': 'passed',
      'story · define action bathing · refused nowhere-to-bathe': 'passed',
      'story · define action bathing': 'passed',
      'story · before the game starts': 'passed',
    });
    const must = outcome(run, 'refused nowhere-to-bathe');
    expect(must.arranged).toEqual(['stove is hot']);
    expect(must.claims).toEqual([{ claim: 'emitted nowhere-to-bathe', passed: true }]);
    const through = run.outcomes.find((o) => o.label === 'story · define action bathing')!;
    expect(through.arranged).toEqual(['stove is hot', expect.stringMatching(/^player\.location = /)]);
    expect(through.claims).toEqual([{ claim: 'emitted the-bath', passed: true }]);
  }, 30_000);

  it('a mutating on body behind a standard refusal stays red, and the line names the refusal', async () => {
    const { run } = await runFixture('refused-body');
    const dishes = outcome(run, 'dishes · on taking');
    expect(dishes.status).toBe('failed');
    expect(dishes.detail).toContain('the standard action refused first: if.action.taking.fixed_in_place');
    expect(dishes.claims).toContainEqual({ claim: 'dishes is clean', passed: false, message: 'the dishes is "dirty", expected "clean"' });
  }, 30_000);

  it('a topic row answers with its first phrase whose when holds: each phrase is a leaf, guarded by the earlier whens failing', async () => {
    const { run } = await runFixture('phrase-ladder');
    const byStatus = Object.fromEntries(run.outcomes.map((o) => [o.label, o.status]));
    expect(byStatus).toEqual({
      'clerk · topic the weather · answers weather-fine': 'passed',
      'clerk · topic the weather · answers weather-grumble': 'passed',
      'story · before the game starts': 'passed',
    });
    const grumble = outcome(run, 'answers weather-grumble');
    expect(grumble.arranged).toEqual(['clerk is cross', expect.stringMatching(/^player\.location = /)]);
    expect(grumble.claims).toEqual([{ claim: 'emitted weather-grumble', passed: true }]);
  }, 30_000);
});

describe('region guards — `is in <region>` is membership, written and read (GH #549 Phase 5, GH #538)', () => {
  it('writes a region as its first room, reads membership through the containing room, and names the negation it cannot write', async () => {
    const { ir, run } = await runFixture('region-guard');
    expect(run.total).toBe(collectClauseBranches(ir).length);
    expect(run.outcomes.length).toBe(run.total);
    const byStatus = Object.fromEntries(run.outcomes.map((o) => [o.label, o.status]));
    expect(byStatus).toEqual({
      'gate · on examining · refused gate-from-inside': 'passed',
      'gate · on examining': 'skipped',
      'story · define action whistling · refused hush': 'passed',
      'story · define action whistling': 'passed',
      'story · before the game starts': 'passed',
    });

    // The write: the region pin lands the player in the region's first room, and the guard fires.
    const hush = outcome(run, 'refused hush');
    expect(hush.arranged).toEqual(['player.location = grounds']);
    expect(hush.claims).toEqual([{ claim: 'emitted hush', passed: true }]);
    expect(run.roomsEntered).toContain('east-yard');

    // The same write stands the player with the gate — nothing else places the player.
    const inside = outcome(run, 'refused gate-from-inside');
    expect(inside.arranged).toEqual(['player.location = grounds']);
    expect(inside.claims).toEqual([{ claim: 'emitted gate-from-inside', passed: true }]);

    // The read: the player placed with the gate IS in the Grounds, so `not in the Grounds` is a negation no write satisfies — never a false run.
    const outside = run.outcomes.find((o) => o.label === 'gate · on examining')!;
    expect(outside.shape).toBe('negation');
    expect(outside.detail).toBe('`player.location = grounds` already holds in the arranged world');

    // Outside the region, the through-line runs as written.
    const free = run.outcomes.find((o) => o.label === 'story · define action whistling')!;
    expect(free.claims).toEqual([{ claim: 'emitted whistle-free', passed: true }]);
  }, 30_000);
});
