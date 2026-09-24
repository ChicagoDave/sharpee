/**
 * lens-declared-state.test.js — the regression pin for the declared-state lens.
 *
 * Three layers, cheapest failure first:
 *
 *   1. the two walks and the classifier on hand-built IR fragments, shaped
 *      as the compiler emits them (verified against fernhill's compiled IR,
 *      2026-09-24: `predicate`/`is` with a `symbol` object, `select-on`
 *      over `it.state` arms, `story-state`, `change` with an `it` target);
 *   2. the fixture under `fixtures/declared-state-fixture/`, compiled here
 *      from source so a stale artifact never pins yesterday's compiler, with
 *      every surface and every direction pinned exactly;
 *   3. the corpus — fernhill and secret-letter's compiled IR — pinned to
 *      zero findings and to an empty `platformGap` (issue #517, fixed
 *      2026-09-24: world-index's `collectStateWriters` now walks every
 *      statement-bearing root, so the sweep this lens also runs finds
 *      nothing the platform walk missed). `platformGap` stays pinned empty
 *      as a regression detector, not deleted — a future surface either walk
 *      misses would reappear here.
 *
 * No seed and no budget: this lens executes nothing, and a compiled IR is a
 * fixed fact. The corpus IRs must exist (`branch-stories/<story>/dist/
 * <story>.ir.json`, as `./repokit build` leaves them); a missing build fails
 * the pin loudly rather than skipping it.
 *
 * Run: `node --test 'tools/explorer-probe/tests/*.test.js'`
 *
 * Owner context: tools/ — the testing-explorer, outside the published packages.
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..', '..', '..');
const { runLens, classify, collectStateReads, collectStoryStateWriters, printReport, DIRECTIONS } = require('../lens-declared-state.js');

// ---------------------------------------------------------------------------
// 1. Walks and classifier on IR fragments
// ---------------------------------------------------------------------------

const span = (line) => ({ line, column: 1, endLine: line, endColumn: 1 });
const entityRef = (id) => ({ kind: 'entity', id });
const IT = { kind: 'it' };
const isPred = (subject, name, line, negated = false) => ({ kind: 'predicate', pred: 'is', negated, subject, object: { kind: 'symbol', name }, span: span(line) });
const change = (entity, state, line) => ({ kind: 'change', entity, state, stmtWhen: null, span: span(line) });

/** A story with a lamp, a bell, and a trait two fruits compose. */
function fragmentIR() {
  return {
    story: { states: ['dawn', 'dusk'], onClauses: [{ condition: { kind: 'story-state', state: 'dusk' }, body: [] }] },
    entities: [
      { id: 'lamp', name: 'lamp', states: ['dim', 'bright', 'broken'], traits: [],
        onClauses: [{ condition: isPred(entityRef('lamp'), 'dim', 10), body: [change(entityRef('lamp'), 'bright', 11)] }] },
      { id: 'bell', name: 'bell', states: ['silent', 'rung'], traits: [], onClauses: [],
        topics: [{ body: [change(IT, 'rung', 20)] }] },
      { id: 'lone', name: 'lone', states: ['only'], traits: [], onClauses: [] },
      { id: 'apple', name: 'apple', states: ['green', 'ripe'], traits: [{ name: 'ripenable' }], onClauses: [] },
      { id: 'pear', name: 'pear', states: ['green', 'ripe'], traits: [{ name: 'ripenable' }], onClauses: [] },
      { id: 'guard', name: 'guard', states: ['calm', 'angry'], traits: [], onClauses: [] },
    ],
    traits: [{ name: 'ripenable', onClauses: [{ body: [{
      kind: 'select-on', subject: { kind: 'field', base: IT, field: 'state' },
      arms: [{ value: 'green', body: [change(IT, 'ripe', 31)], span: span(31) }, { value: 'ripe', body: [], span: span(33) }],
      span: span(30),
    }] }] }],
    machines: [],
    sequences: [{ steps: [{ body: [change({ kind: 'story' }, 'dusk', 40), isPred(entityRef('guard'), 'angry', 41, true)] }] }],
  };
}

describe('collectStateReads', () => {
  test('reads an `is` predicate on an entity, negated or not, and a story-state', () => {
    const reads = collectStateReads(fragmentIR()).map((r) => [r.target, r.state, r.owner, r.via]);
    assert.deepEqual(reads.filter((r) => r[0] === 'lamp'), [['lamp', 'dim', 'entity:lamp', 'is']]);
    assert.deepEqual(reads.filter((r) => r[0] === 'guard'), [['guard', 'angry', 'story', 'is']]);
    assert.deepEqual(reads.filter((r) => r[0] === 'story'), [['story', 'dusk', 'story', 'story-state']]);
  });

  test('expands a trait select-on once per composing entity, one read per arm, `it` bound', () => {
    const reads = collectStateReads(fragmentIR()).filter((r) => r.via === 'select-on').map((r) => [r.target, r.state, r.line]);
    assert.deepEqual(reads, [['apple', 'green', 31], ['apple', 'ripe', 33], ['pear', 'green', 31], ['pear', 'ripe', 33]]);
  });
});

describe('collectStoryStateWriters', () => {
  test('finds a `change the story to` anywhere, and nothing else', () => {
    assert.deepEqual(collectStoryStateWriters(fragmentIR()), [{ target: 'story', state: 'dusk', owner: 'story', line: 40 }]);
  });
});

describe('classify', () => {
  const result = classify(fragmentIR());
  const dim = (id) => result.dimensions.find((d) => d.entity === id);

  test('a declared value with no writer is never-assigned, except the initial value', () => {
    assert.deepEqual(result.findings.filter((f) => f.direction === 'never-assigned').map((f) => [f.entity, f.state]), [['guard', 'angry'], ['lamp', 'broken']]);
    assert.equal(dim('lamp').initial, 'dim');
  });

  test('a written dimension no rule reads is never-read, carrying its writers; an unwritten one is not', () => {
    const neverRead = result.findings.filter((f) => f.direction === 'never-read');
    assert.deepEqual(neverRead.map((f) => f.entity), ['bell']);
    assert.deepEqual(neverRead[0].sources, [{ owner: 'entity:bell', line: 20 }]);
    // `guard` is read but never written: not a finding in either direction beyond never-assigned.
    assert.equal(result.findings.some((f) => f.entity === 'guard' && f.direction === 'never-read'), false);
  });

  test('a single-state entity is not a dimension; the story is one', () => {
    assert.equal(dim('lone'), undefined);
    assert.deepEqual(dim('story').written, { dusk: [{ owner: 'story', line: 40 }] });
    assert.deepEqual(Object.keys(dim('story').read), ['dusk']);
  });

  test('a trait writer is attributed to each composer via world-index, in declaration order', () => {
    assert.deepEqual(Object.keys(dim('apple').written), ['ripe']);
    assert.deepEqual(Object.keys(dim('pear').written), ['ripe']);
    assert.deepEqual(result.platformGap, []);
  });

  test('findings sort by direction, then entity, then value', () => {
    assert.deepEqual(result.findings.map((f) => [f.direction, f.entity, f.state]), [
      ['never-assigned', 'guard', 'angry'],
      ['never-assigned', 'lamp', 'broken'],
      ['never-read', 'bell', undefined],
    ]);
    assert.deepEqual(DIRECTIONS, ['never-assigned', 'never-read']);
  });
});

// ---------------------------------------------------------------------------
// 2. The fixture, compiled from source
// ---------------------------------------------------------------------------

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'declared-state-fixture', 'declared-state-fixture.story');

function compose(storyPath) {
  const out = path.join(path.dirname(storyPath), 'dist', path.basename(storyPath, '.story') + '.ir.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync(path.join(REPO, 'sharpee'), ['compose', storyPath, '-o', out], { cwd: REPO, stdio: 'pipe' });
}

describe('the fixture', () => {
  let report;
  before(() => { compose(FIXTURE); report = runLens(FIXTURE); });

  test('carries format 1 with exactly the documented top-level keys', () => {
    assert.equal(report.lens, 'declared-state');
    assert.equal(report.format, 1);
    assert.deepEqual(Object.keys(report), ['lens', 'format', 'story', 'counts', 'findings', 'dimensions', 'platformGap']);
  });

  test('declares eight dimensions in IR order, the story last', () => {
    assert.deepEqual(report.dimensions.map((d) => d.entity), ['lamp', 'bell', 'pump', 'tank', 'apple', 'pear', 'tap', 'story']);
  });

  test('pins every finding: the unassigned lamp value, and the two written-but-unread dimensions', () => {
    assert.deepEqual(report.counts, { 'never-assigned': 1, 'never-read': 2 });
    assert.deepEqual(report.findings.map((f) => [f.direction, f.entity, f.state, f.sources.map((s) => s.owner)]), [
      ['never-assigned', 'lamp', 'broken', []],
      ['never-read', 'bell', undefined, ['entity:old-tom']],
      ['never-read', 'pump', undefined, ['machine:the pump works']],
    ]);
  });

  test('every surface is seen: own clause, topic, machine to another entity, trait per composer, timer, sequence', () => {
    const d = (id) => report.dimensions.find((x) => x.entity === id);
    assert.deepEqual([Object.keys(d('lamp').written), Object.keys(d('lamp').read)], [['bright'], ['dim']]);
    assert.deepEqual(Object.keys(d('bell').written), ['rung']);
    assert.deepEqual([Object.keys(d('tank').written), d('tank').written.full[0].owner], [['full'], 'machine:the pump works']);
    assert.deepEqual([Object.keys(d('apple').read), Object.keys(d('pear').read)], [['green', 'ripe'], ['green', 'ripe']]);
    assert.deepEqual(Object.keys(d('tap').written), ['dripping']);
    assert.deepEqual([Object.keys(d('story').written), Object.keys(d('story').read)], [['dusk'], ['dusk']]);
  });

  test('#517 fixed 2026-09-24: the timer-clause write world-index used to miss is now seen upstream', () => {
    assert.deepEqual(report.platformGap, []);
  });

  test('the console form lists each direction once with its rows, and no gap section (the gap is empty)', () => {
    const out = [];
    printReport(report, { all: false }, (l) => out.push(l));
    assert.ok(out.includes('== never-assigned  (1)'));
    assert.ok(out.includes('   lamp is broken'));
    assert.ok(out.includes('== never-read  (2)'));
    assert.ok(out.some((l) => l.includes('written at: machine:the pump works:')));
    assert.ok(out.every((l) => !l.startsWith("== writes world-index's collectStateWriters does not see")));
  });
});

// ---------------------------------------------------------------------------
// 3. The corpus
// ---------------------------------------------------------------------------

function corpusStory(relative) {
  const story = path.join(REPO, relative);
  const ir = path.join(path.dirname(story), 'dist', path.basename(story, '.story') + '.ir.json');
  assert.ok(fs.existsSync(ir), relative + ' is not built: ' + ir + ' is missing — run ./repokit build first');
  return story;
}

describe('fernhill — the corpus pin', () => {
  let report;
  before(() => { report = runLens(corpusStory('branch-stories/fernhill/fernhill.story')); });

  test('nine dimensions, no findings, nothing world-index misses', () => {
    assert.deepEqual(report.dimensions.map((d) => d.entity), ['boiler', 'diary-page', 'vine', 'smoke', 'fuse', 'mrs-kettle', 'tobias', 'case-clock', 'story']);
    assert.deepEqual(report.findings, []);
    assert.deepEqual(report.platformGap, []);
  });

  test('the vine: fruiting written by the trait, flowering by the machine, seedling the loader-assigned initial', () => {
    const vine = report.dimensions.find((d) => d.entity === 'vine');
    assert.equal(vine.initial, 'seedling');
    assert.deepEqual(vine.written.fruiting.map((s) => s.owner), ['entity:vine']);
    assert.deepEqual(vine.written.flowering.map((s) => s.owner), ['machine:the boiler works']);
    assert.equal(vine.written.seedling, undefined);
    assert.deepEqual(Object.keys(vine.read).sort(), ['flowering', 'fruiting', 'seedling']);
  });
});

describe('secret-letter — the corpus pin', () => {
  let report;
  before(() => { report = runLens(corpusStory('branch-stories/secret-letter/secret-letter.story')); });

  test('41 dimensions and no findings: the spike\'s 27 inert dimensions were trait reads its model never walked', () => {
    assert.equal(report.dimensions.length, 41);
    assert.deepEqual(report.findings, []);
  });

  test('#517 fixed 2026-09-24: the nine timer- and move-clause writes world-index used to miss are now seen upstream', () => {
    assert.deepEqual(report.platformGap, []);
  });
});
