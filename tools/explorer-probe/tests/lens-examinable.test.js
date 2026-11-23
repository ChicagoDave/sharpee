/**
 * lens-examinable.test.js — the regression pin for the examinable lens.
 *
 * Three layers, in the order a failure is cheapest to read:
 *
 *   1. the classifier, on hand-built event shapes copied from what the
 *      engine really emits (measured 2026-09-23, recorded in the lens header);
 *   2. the fold and the console form, on synthetic rows;
 *   3. the real path — `runLens` through the real engine — pinned twice:
 *      the one-room fixture under `fixtures/lens-fixture/`, and the test
 *      story `test-stories/orchard` at its test set's seed (obligation OB-35),
 *      whose expected findings are the specification the same way
 *      `@sharpee/world-index`'s `incomplete.test.ts` pins its extractor: a
 *      prose or extractor change that moves a finding shows up here as a
 *      diff. Both are compiled here, from source, so a stale artifact never
 *      pins yesterday's compiler.
 *
 * The corpus pin was on Fernhill until 2026-11-22. ADR-395 D7 keeps
 * exploring tests off real stories, and David ruled on 2026-11-11 that the
 * pin moves to orchard once the lens is repaired. Orchard is found through
 * `SHARPEE_TEST_STORIES` when it is set, and otherwise at the repository's
 * `test-stories/`: this directory has no package and no test configuration,
 * like `scripts/__tests__`, which locates orchard the same way.
 *
 * The orchard pin is bounded by STATES, not seconds: states are
 * deterministic at a seed, wall-clock is not. Orchard's five rooms are all
 * reached in 5 states, so the walk stops on `all-rooms-reached` well inside
 * the budget.
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
const { runLens, classify, foldFindings, isFinding, printReport } = require('../lens-examinable.js');

const NOT_FOUND = 'Validation failed: ENTITY_NOT_FOUND';

// ---------------------------------------------------------------------------
// 1. classify — the engine's answer, as the engine really shapes it
// ---------------------------------------------------------------------------

describe('classify', () => {
  const examined = (data) => ({ type: 'if.event.examined', data });

  test('an examined event with an authored description is resolved-described, naming the target', () => {
    const v = classify([examined({ messageId: 'if.action.examining.examined', targetName: 'bucket' })], { success: true }, null);
    assert.deepEqual(v, { kind: 'resolved-described', detail: 'if.action.examining.examined', target: 'bucket' });
  });

  test('a Chord phrase id from an `on examining` clause is still resolved-described', () => {
    const v = classify([examined({ messageId: 'stalls-from-junction', targetName: 'stalls' })], { success: true }, null);
    assert.equal(v.kind, 'resolved-described');
    assert.equal(v.detail, 'stalls-from-junction');
  });

  test('each of the three default ids is resolved-default', () => {
    for (const id of ['if.action.examining.default_description', 'if.action.examining.default_description_self', 'if.action.examining.nothing_special']) {
      const v = classify([examined({ messageId: id, targetName: 'pebble' })], { success: true }, null);
      assert.equal(v.kind, 'resolved-default', id);
      assert.equal(v.detail, id);
    }
  });

  test('a blocked examined event (in scope, not visible) is not-in-scope', () => {
    const v = classify([examined({ messageId: 'if.action.examining.too_dark', blocked: true, targetName: 'lamp' })], { success: true }, null);
    assert.deepEqual(v, { kind: 'not-in-scope', detail: 'if.action.examining.too_dark', target: 'lamp' });
  });

  test('a contents-list examined event is not the verdict', () => {
    const v = classify([examined({ messageId: 'if.action.examining.contents', isContentsMessage: true })], { success: false, error: NOT_FOUND }, null);
    assert.equal(v.kind, 'not-in-scope');
  });

  test('a client.query is ambiguous, listing the candidates', () => {
    const v = classify([{ type: 'client.query', data: { candidates: [{ name: 'silk tent' }, { name: 'canvas tent' }] } }], null, null);
    assert.deepEqual(v, { kind: 'ambiguous', detail: 'silk tent / canvas tent' });
  });

  test('a command.failed carries the validator reason as not-in-scope', () => {
    const v = classify([{ type: 'command.failed', data: { reason: NOT_FOUND } }], { success: false, error: NOT_FOUND }, null);
    assert.deepEqual(v, { kind: 'not-in-scope', detail: NOT_FOUND });
  });

  test('a failed turn result with no events is not-in-scope on the result error', () => {
    const v = classify([], { success: false, error: 'boom' }, null);
    assert.deepEqual(v, { kind: 'not-in-scope', detail: 'boom' });
  });

  test('anything else is unclassified, carrying the engine error and event types', () => {
    const v = classify([{ type: 'game.message', data: {} }], { success: true }, new Error('ended'));
    assert.equal(v.kind, 'unclassified');
    assert.match(v.detail, /ended/);
    assert.match(v.detail, /game\.message/);
  });
});

// ---------------------------------------------------------------------------
// 2. foldFindings and the console form — on synthetic rows
// ---------------------------------------------------------------------------

/** Two rooms: a carried letter's phrase recurs in both; each has one unique finding. */
function twoRooms() {
  const row = (phrase, kind, detail, sources, extra) => ({ phrase, kind, detail, sources, thing: true, ...extra });
  return [
    {
      roomId: 'r01', room: 'Gate', path: [], prose: [],
      rows: [
        row('deed', 'not-in-scope', NOT_FOUND, ['letter'], { thing: false }),
        row('house', 'not-in-scope', NOT_FOUND, ['room']),
        row('gate', 'resolved-described', 'if.action.examining.examined', ['room'], { target: 'gate' }),
        row('scrollwork', 'not-in-scope', NOT_FOUND, ['room']),
      ],
    },
    {
      roomId: 'r02', room: 'Drive', path: ['north'], prose: [],
      rows: [
        row('deed', 'not-in-scope', NOT_FOUND, ['letter'], { thing: false }),
        row('house', 'not-in-scope', NOT_FOUND, ['room', 'weathervane']),
        row('drive', 'not-in-scope', NOT_FOUND, ['room']),
        row('pebble', 'resolved-default', 'if.action.examining.default_description', ['room'], { target: 'pebble' }),
      ],
    },
  ];
}

describe('foldFindings', () => {
  test('isFinding is every class but resolved-described', () => {
    assert.equal(isFinding({ kind: 'resolved-described' }), false);
    for (const kind of ['resolved-default', 'not-in-scope', 'ambiguous', 'unclassified']) assert.equal(isFinding({ kind }), true, kind);
  });

  test('folds a phrase seen in two rooms into one finding with both rooms and the union of sources', () => {
    const f = foldFindings(twoRooms());
    const house = f.find((x) => x.phrase === 'house');
    assert.deepEqual(house, {
      phrase: 'house', kind: 'not-in-scope', detail: NOT_FOUND, thing: true,
      sources: ['room', 'weathervane'],
      rooms: [{ roomId: 'r01', room: 'Gate' }, { roomId: 'r02', room: 'Drive' }],
    });
  });

  test('sorts most-rooms first, then by phrase; excludes described rows; carries target and thing', () => {
    const f = foldFindings(twoRooms());
    assert.deepEqual(f.map((x) => [x.phrase, x.rooms.length]), [
      ['deed', 2], ['house', 2], ['drive', 1], ['pebble', 1], ['scrollwork', 1],
    ]);
    assert.equal(f.find((x) => x.phrase === 'gate'), undefined);
    assert.equal(f.find((x) => x.phrase === 'pebble').target, 'pebble');
    assert.equal(f.find((x) => x.phrase === 'deed').thing, false);
  });

  test('an empty room list folds to nothing', () => {
    assert.deepEqual(foldFindings([]), []);
  });
});

describe('printReport', () => {
  const report = (rooms) => ({
    lens: 'examinable', format: 1, story: 'x.story', seed: 1,
    walk: { stopReason: 'all-rooms-reached', roomsReached: 2, roomsDeclared: 2, statesDiscovered: 3, walkMs: 10 },
    phrasesExecuted: 8, counts: { 'not-in-scope': 6, 'resolved-described': 1, 'resolved-default': 1 },
    findings: foldFindings(rooms), rooms,
  });
  const lines = (opts) => { const out = []; printReport(report(twoRooms()), opts, (l) => out.push(l)); return out; };

  test('lists a recurring visible finding once, under its own heading, with its rooms', () => {
    const out = lines({ all: false });
    assert.equal(out.filter((l) => l.includes('"house"')).length, 1);
    assert.ok(out.includes('== seen in more than one room  (1 findings)'));
    assert.ok(out.some((l) => l.includes('in 2 rooms: Gate, Drive')));
  });

  test('a room shows only its unique findings and counts only VISIBLE folded rows as listed above', () => {
    const out = lines({ all: false });
    const gate = out.indexOf('== Gate  [start]');
    const drive = out.indexOf('== Drive  [north]');
    const gateSection = out.slice(gate, drive);
    assert.ok(gateSection.some((l) => l.includes('"scrollwork"')));
    assert.ok(!gateSection.some((l) => l.includes('"house"')));
    // `deed` recurs too but is not-a-thing, so it is hidden, not "listed above".
    assert.ok(gateSection.includes('   (1 listed above under "seen in more than one room")'));
    assert.ok(gateSection.some((l) => l.includes('1 more hidden as not-a-thing')));
  });

  test('--all shows described rows and not-a-thing rows', () => {
    const out = lines({ all: true });
    assert.ok(out.some((l) => l.includes('"gate"  -> gate')));
    assert.ok(out.some((l) => l.includes('"deed"') && l.includes('(not-a-thing)')));
    assert.ok(out.includes('== seen in more than one room  (2 findings)'));
  });
});

// ---------------------------------------------------------------------------
// 3. The real path — through the real engine
// ---------------------------------------------------------------------------

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'lens-fixture', 'lens-fixture.story');
const TEST_STORIES = process.env.SHARPEE_TEST_STORIES || path.join(REPO, 'test-stories');
const ORCHARD = path.join(TEST_STORIES, 'orchard', 'orchard.story');

/** Compile a `.story` to the `dist/<stem>.ir.json` the lens loads, from source. */
function compose(storyPath) {
  const dir = path.dirname(storyPath);
  const out = path.join(dir, 'dist', path.basename(storyPath, '.story') + '.ir.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync(path.join(REPO, 'sharpee'), ['compose', storyPath, '-o', out], { cwd: REPO, stdio: 'pipe' });
  return out;
}

describe('the fixture, through the real engine', () => {
  let report;
  before(async () => {
    compose(FIXTURE);
    report = await runLens(FIXTURE, { seed: 1209, maxStates: 50, maxSeconds: 60, maxDepth: 10 });
  });

  test('carries format 1 with exactly the documented top-level keys', () => {
    assert.equal(report.lens, 'examinable');
    assert.equal(report.format, 1);
    assert.deepEqual(Object.keys(report), ['lens', 'format', 'story', 'seed', 'walk', 'phrasesExecuted', 'counts', 'findings', 'rooms']);
    assert.deepEqual(Object.keys(report.walk), ['stopReason', 'roomsReached', 'roomsDeclared', 'statesDiscovered', 'walkMs']);
  });

  test('walks the one room to completion', () => {
    assert.equal(report.walk.stopReason, 'all-rooms-reached');
    assert.equal(report.walk.roomsReached, 1);
    assert.equal(report.walk.roomsDeclared, 1);
    assert.equal(report.phrasesExecuted, 4);
    assert.deepEqual(report.counts, { 'resolved-default': 1, 'resolved-described': 1, 'not-in-scope': 2 });
  });

  test('classifies the described bucket, the descriptionless pebble, and the entity-less crack', () => {
    const rows = report.rooms[0].rows.map((r) => [r.phrase, r.kind, r.detail, r.target, r.sources, r.thing]);
    assert.deepEqual(rows, [
      ['pebble', 'resolved-default', 'if.action.examining.default_description', 'pebble', ['room'], true],
      ['bucket', 'resolved-described', 'if.action.examining.examined', 'bucket', ['room'], true],
      ['crack', 'not-in-scope', NOT_FOUND, undefined, ['room'], true],
      ['dented tin bucket', 'not-in-scope', NOT_FOUND, undefined, ['bucket'], true],
    ]);
  });

  test('folds the findings, each seen in the one room, described row excluded', () => {
    assert.deepEqual(report.findings.map((f) => [f.phrase, f.kind, f.rooms.map((r) => r.room)]), [
      ['crack', 'not-in-scope', ['Shed']],
      ['dented tin bucket', 'not-in-scope', ['Shed']],
      ['pebble', 'resolved-default', ['Shed']],
    ]);
  });

  test('records the prose the player saw, by source', () => {
    assert.deepEqual(report.rooms[0].prose.map((p) => p.source), ['room', 'bucket']);
    assert.match(report.rooms[0].prose[1].text, /dented tin bucket/);
  });
});

describe('orchard at seed 42 / 600 states — the corpus pin (OB-35)', () => {
  let report;
  before(async () => {
    assert.ok(fs.existsSync(ORCHARD), 'orchard is missing: ' + ORCHARD + ' (set SHARPEE_TEST_STORIES or run from the repository)');
    compose(ORCHARD);
    report = await runLens(ORCHARD, { seed: 42, maxStates: 600, maxSeconds: 120, maxDepth: 40 });
  });

  test('reaches every one of the five rooms, in order, and stops because all are reached', () => {
    assert.equal(report.walk.stopReason, 'all-rooms-reached');
    assert.equal(report.walk.statesDiscovered, 5);
    assert.equal(report.walk.roomsReached, 5);
    assert.equal(report.walk.roomsDeclared, 5);
    assert.deepEqual(report.rooms.map((r) => r.room), ['Gate', 'Rows', 'Press House', 'Hive Yard', 'Cellar']);
  });

  test('executes 31 phrases: 27 not-in-scope, 4 described, nothing ambiguous or unclassified', () => {
    assert.equal(report.phrasesExecuted, 31);
    assert.deepEqual(report.counts, { 'not-in-scope': 27, 'resolved-described': 4 });
  });

  test('described things resolve to the thing that answers them, with the message examining chose', () => {
    const described = report.rooms.flatMap((r) => r.rows.filter((row) => row.kind === 'resolved-described')
      .map((row) => [row.phrase, row.target, row.detail]));
    assert.deepEqual(described, [
      ['water valve', 'water valve', 'if.action.examining.examined'],
      ['bee smoker', 'bee smoker', 'if.action.examining.examined_wearable'],
      ['cider press', 'cider press', 'if.action.examining.examined'],
      ['press', 'cider press', 'if.action.examining.examined'],
    ]);
  });

  test('pins the phrases nothing answers to, folded, with the rooms each recurs in', () => {
    assert.deepEqual(report.findings.map((f) => [f.phrase, f.rooms.length]), [
      ['cellar', 2], ['brass valve', 1], ['cider press fills', 1], ['cool cellar', 1], ['door', 1], ['hook', 1],
      ['iron crank handle', 1], ['lane', 1], ['leather strap', 1], ['long ash pole', 1], ['low wall', 1], ['oldest hive', 1],
      ['oldest tree', 1], ['orchard', 1], ['orchard gate', 1], ['orchard keeper', 1], ['painted sign', 1], ['pipe', 1],
      ['rows', 1], ['screw', 1], ['slab', 1], ['slope', 1], ['small green apple', 1], ['stone', 1], ['top bar', 1], ['wall', 1],
    ]);
    assert.ok(report.findings.every((f) => f.thing && f.kind === 'not-in-scope' && f.detail === NOT_FOUND));
  });

  test('a phrase found in two rooms is one finding naming both rooms and both sources', () => {
    const cellar = report.findings.find((f) => f.phrase === 'cellar');
    assert.deepEqual(cellar.rooms.map((r) => r.room), ['Press House', 'Cellar']);
    assert.deepEqual(cellar.sources, ['room', 'crank handle']);
  });
});
