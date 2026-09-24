/**
 * lens-examinable.test.js — the regression pin for the examinable lens.
 *
 * Three layers, in the order a failure is cheapest to read:
 *
 *   1. the classifier, on hand-built event shapes copied from what the
 *      engine really emits (measured 2026-09-23, recorded in the lens header);
 *   2. the fold and the console form, on synthetic rows;
 *   3. the real path — `runLens` through the real engine — pinned twice:
 *      the one-room fixture under `fixtures/lens-fixture/` (compiled here,
 *      from source, so a stale artifact never pins yesterday's compiler),
 *      and fernhill at seed 1209 / 600 states, whose expected findings are
 *      the specification the same way `@sharpee/world-index`'s
 *      `incomplete.test.ts` pins its extractor: a prose or extractor change
 *      that moves a finding shows up here as a diff.
 *
 * The fernhill pin is bounded by STATES, not seconds: states are
 * deterministic at a seed, wall-clock is not. Measured 2026-09-23: 600
 * states takes ~13s and reaches the same 11 of 13 rooms with the same
 * counts as 1500 states (~36s).
 *
 * Fernhill's compiled IR must exist (`branch-stories/fernhill/dist/
 * fernhill.ir.json`, as `./repokit build` leaves it). A missing build fails
 * the pin loudly rather than skipping it — a pin that skips is not a pin.
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
const FERNHILL = path.join(REPO, 'branch-stories', 'fernhill', 'fernhill.story');

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

describe('fernhill at seed 1209 / 600 states — the corpus pin', () => {
  let report;
  before(async () => {
    const ir = path.join(path.dirname(FERNHILL), 'dist', 'fernhill.ir.json');
    assert.ok(fs.existsSync(ir), 'fernhill is not built: ' + ir + ' is missing — run ./repokit build first');
    report = await runLens(FERNHILL, { seed: 1209, maxStates: 600, maxSeconds: 600, maxDepth: 40 });
  });

  test('reaches the same 11 of 13 rooms, in the same order, and stops on the state budget', () => {
    assert.equal(report.walk.stopReason, 'max-states');
    assert.equal(report.walk.statesDiscovered, 600);
    assert.equal(report.walk.roomsReached, 11);
    assert.equal(report.walk.roomsDeclared, 13);
    assert.deepEqual(report.rooms.map((r) => r.room), [
      'Iron Gates', 'Gravel Drive', 'Fountain Court', 'Entrance Hall', 'Greenhouse', 'Boiler Shed',
      'Kitchen', 'Cellar Stairs', 'Pantry', 'Study', 'Folly Hill',
    ]);
  });

  test('executes 119 phrases: 92 not-in-scope, 27 described, nothing ambiguous or unclassified', () => {
    assert.equal(report.phrasesExecuted, 119);
    assert.deepEqual(report.counts, { 'not-in-scope': 92, 'resolved-described': 27 });
  });

  test('pins the findings, folded, with the rooms each recurs in', () => {
    assert.deepEqual(report.findings.filter((f) => f.thing).map((f) => [f.phrase, f.rooms.length]), [
      ['house', 5], ['greenhouse', 3], ['bolt', 2], ['door', 2], ['kitchen', 2], ['north wall', 2], ['plain white-painted door', 2],
      ['back wall', 1], ['black iron range', 1], ['buried heating pipes', 1], ['buried pipes', 1], ['cast-iron estate boiler', 1],
      ['cellar steps', 1], ['cherub', 1], ['clean chimney', 1], ['colder passage', 1], ['dead fireplace', 1], ['drive', 1],
      ['dusty bottle', 1], ['estate', 1], ['feed pipe', 1], ['firedog', 1], ['flagstone', 1], ['flat tin', 1], ['front door', 1],
      ['frost', 1], ['full reservoir', 1], ['furnace grate', 1], ['gatepost', 1], ['gates', 1], ['glasshouse', 1], ['good stuff', 1],
      ['gravel drive', 1], ['heart', 1], ['heavy grey door', 1], ['hill', 1], ['housekeeper', 1], ['hurricane lamp', 1], ['keyhole', 1],
      ['leather-topped desk', 1], ['length', 1], ['lid', 1], ['lip', 1], ['little brass door', 1], ['little proud', 1],
      ['little stone temple', 1], ['long iron poker', 1], ['long-handled primer plunger', 1], ['pantry mice', 1], ['paved court', 1],
      ['person whole', 1], ['pockets', 1], ['quarter-turn stopcock', 1], ['rain tank', 1], ['scrollwork', 1],
      ['single framed photograph', 1], ['smoke-grey cat', 1], ['stairs', 1], ['stone-framed door', 1], ['study', 1], ['study door', 1],
      ['tomb', 1], ['wall', 1], ['wide mantel', 1], ['wide stone mantel', 1], ['winding hole', 1], ['window', 1], ['windows', 1],
      ['wrist', 1],
    ]);
    assert.deepEqual(report.findings.filter((f) => !f.thing).map((f) => [f.phrase, f.rooms.length]), [
      ['deed tonight', 11], ['seedling now', 1],
    ]);
    assert.ok(report.findings.every((f) => f.kind === 'not-in-scope' && f.detail === NOT_FOUND));
  });

  test('a carried item explains the recurrence: the letter is the source in every room', () => {
    const deed = report.findings.find((f) => f.phrase === 'deed tonight');
    assert.deepEqual(deed.sources, ["solicitor's letter"]);
    assert.equal(deed.rooms.length, report.rooms.length);
  });
});
