/**
 * lens-examinable.test.js — the regression pin for the examinable lens.
 *
 * Three layers, in the order a failure is cheapest to read:
 *
 *   1. the classifier, on hand-built event shapes copied from what the
 *      engine really emits (measured 2026-09-23, recorded in the lens header);
 *   2. the fold and the console form, on synthetic rows;
 *   2b. the language guard on all three outcomes (ADR-407 D2, D6; the
 *      mismatch case has no real path until a second language exists), and
 *      AC-6: one fixed map of events, two candidate lists, the same classes;
 *   3. the real path — `runLens` through the real engine — pinned on the
 *      one-room fixture under `fixtures/lens-fixture/`, the test story
 *      `test-stories/orchard` (obligation OB-35), and `test-stories/scullery`
 *      (OB-54 to OB-60: number forms, the undescribed and carried things, and
 *      the CLI's refusal of a language with no extractor on a temporary IR
 *      copy). Expected findings are the specification the same way
 *      `@sharpee/world-index`'s `incomplete.test.ts` pins its extractor: a
 *      prose or extractor change that moves a finding shows up here as a
 *      diff. Each is compiled here, from source, so a stale artifact never
 *      pins yesterday's compiler. Pins re-recorded 2026-11-22 after the
 *      census in `docs/work/description-noun-lens/census-lens.md` (format 2).
 *
 * The corpus pin was on Fernhill until 2026-11-22. ADR-395 D7 keeps
 * exploring tests off real stories, and David ruled on 2026-11-11 that the
 * pin moves to orchard once the lens is repaired. Orchard is found through
 * `SHARPEE_TEST_STORIES` when it is set, and otherwise at the repository's
 * `test-stories/`: this directory has no package and no test configuration,
 * like `scripts/__tests__`, which locates orchard the same way. Scullery is
 * found the same way.
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
const {
  runLens, classify, classifyCandidates, phrasesIn, guardLanguage, foldFindings, isFinding, printReport,
} = require('../lens-examinable.js');
const os = require('node:os');

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
// 2b. The language guard (ADR-407 D2, D6) and the extractor's place (D7, AC-6)
// ---------------------------------------------------------------------------

const NO_EXTRACTOR_XX = "No noun extractor for language 'xx-YY': @sharpee/lang-xx-yy/nouns does not provide one.";

describe('guardLanguage', () => {
  // The mismatch case cannot be reached through a real engine until a second
  // language exists, because Chord always writes en-US; the guard is tested
  // here on all three outcomes instead (rule 13a stub justification; the
  // no-extractor case also runs end to end below, through the real CLI).
  const english = { languageCode: 'en-US' };
  const lookup = (code) => (code === 'en-US'
    ? { found: true, extractor: english }
    : { found: false, refusal: 'no extractor for ' + code });

  test('finds the extractor when the story and the engine speak the same language', () => {
    assert.deepEqual(guardLanguage('en-US', 'en-US', lookup), { found: true, extractor: english });
  });

  test('refuses a story language with no extractor, before it compares the engine', () => {
    assert.deepEqual(guardLanguage('xx-YY', 'en-US', lookup), { found: false, refusal: 'no extractor for xx-YY' });
    assert.deepEqual(guardLanguage('xx-YY', 'xx-YY', lookup), { found: false, refusal: 'no extractor for xx-YY' });
  });

  test("refuses an engine whose language is not the story's, naming both codes", () => {
    const v = guardLanguage('en-US', 'fr-FR', lookup);
    assert.equal(v.found, false);
    assert.equal(v.refusal,
      "The engine's language 'fr-FR' is not the story's language 'en-US': prose is read only through the story's own language.");
  });
});

describe('the extractor never decides a verdict (AC-6)', () => {
  // One fixed map of form to the engine's events, and two different candidate
  // lists over the same prose: every phrase both lists propose gets the same
  // class, because the class is read only off the events.
  const failed = [{ type: 'command.failed', data: { reason: NOT_FOUND } }];
  const examined = (messageId, targetName) => [{ type: 'if.event.examined', data: { messageId, targetName } }];
  const EVENTS = new Map([
    ['candles', examined('if.action.examining.examined', 'candles')],
    ['pebble', examined('if.action.examining.default_description', 'pebble')],
    ['crack', failed],
  ]);
  const runForm = async (form) => classify(EVENTS.get(form) || failed, { success: !!EVENTS.get(form) }, null);
  const numberForms = (noun) => (noun.endsWith('s') ? { singular: noun.slice(0, -1), plural: noun } : { singular: noun, plural: noun + 's' });
  const extractorOf = (lists) => ({
    extract: (text) => (lists[text] || []).map((words, offset) => ({ text: words.join(' '), words, head: words[words.length - 1], offset })),
    numberForms,
  });
  const PROSE = [{ source: 'room', text: 'passage' }];
  const narrow = extractorOf({ passage: [['candles'], ['crack']] });
  const wide = extractorOf({ passage: [['candles'], ['pebble'], ['crack'], ['rows', 'of', 'candles']] });

  test('every phrase both candidate lists share gets the same class and detail', async () => {
    const a = await classifyCandidates(phrasesIn(PROSE, narrow), runForm, narrow);
    const b = await classifyCandidates(phrasesIn(PROSE, wide), runForm, wide);
    const byPhrase = (rows) => new Map(rows.map((r) => [r.phrase, [r.kind, r.detail, r.resolvedForm]]));
    const ma = byPhrase(a);
    const mb = byPhrase(b);
    const shared = [...ma.keys()].filter((p) => mb.has(p));
    assert.deepEqual(shared, ['candles', 'candle', 'crack']);
    for (const p of shared) assert.deepEqual(ma.get(p), mb.get(p), p);
  });

  test('classes come from the events: described, number-form against what resolved, not-in-scope', async () => {
    const rows = await classifyCandidates(phrasesIn(PROSE, wide), runForm, wide);
    assert.deepEqual(rows.map((r) => [r.phrase, r.kind, r.resolvedForm]), [
      ['candles', 'resolved-described', undefined],
      ['candle', 'number-form', 'candles'],
      ['pebble', 'resolved-default', undefined],
      ['pebbles', 'number-form', 'pebble'],
      ['crack', 'not-in-scope', undefined],
      ['rows of candles', 'not-in-scope', undefined],
    ]);
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

  test('carries format 2 with exactly the documented top-level keys', () => {
    assert.equal(report.lens, 'examinable');
    assert.equal(report.format, 2);
    assert.deepEqual(Object.keys(report), ['lens', 'format', 'story', 'seed', 'walk', 'phrasesExecuted', 'counts', 'findings', 'rooms']);
    assert.deepEqual(Object.keys(report.walk), ['stopReason', 'roomsReached', 'roomsDeclared', 'statesDiscovered', 'walkMs']);
  });

  test('walks the one room to completion', () => {
    assert.equal(report.walk.stopReason, 'all-rooms-reached');
    assert.equal(report.walk.roomsReached, 1);
    assert.equal(report.walk.roomsDeclared, 1);
    // Census-reviewed 2026-11-22 (census-lens.md, David "a"): 4 → 12, both numbers typed.
    assert.equal(report.phrasesExecuted, 12);
    assert.deepEqual(report.counts, { 'not-in-scope': 4, 'resolved-default': 1, 'number-form': 2, 'resolved-described': 1 });
  });

  test('classifies the described bucket, the descriptionless pebble, the entity-less crack, and each plural', () => {
    const rows = report.rooms[0].rows.map((r) => [r.phrase, r.kind, r.detail, r.target, r.resolvedForm, r.sources, r.thing]);
    assert.deepEqual(rows, [
      ['bare shed', 'not-in-scope', NOT_FOUND, undefined, undefined, ['room'], true],
      ['pebble', 'resolved-default', 'if.action.examining.default_description', 'pebble', undefined, ['room'], true],
      ['pebbles', 'number-form', NOT_FOUND, 'pebble', 'pebble', ['room'], true],
      ['bucket', 'resolved-described', 'if.action.examining.examined', 'bucket', undefined, ['room'], true],
      ['buckets', 'number-form', NOT_FOUND, 'bucket', 'bucket', ['room'], true],
      ['crack', 'not-in-scope', NOT_FOUND, undefined, undefined, ['room'], true],
      ['dented tin bucket', 'not-in-scope', NOT_FOUND, undefined, undefined, ['bucket'], true],
      ['tin bucket', 'not-in-scope', NOT_FOUND, undefined, undefined, ['bucket'], true],
    ]);
  });

  test('folds the findings, each seen in the one room, described row excluded', () => {
    assert.deepEqual(report.findings.map((f) => [f.phrase, f.kind, f.rooms.map((r) => r.room)]), [
      ['bare shed', 'not-in-scope', ['Shed']],
      ['buckets', 'number-form', ['Shed']],
      ['crack', 'not-in-scope', ['Shed']],
      ['dented tin bucket', 'not-in-scope', ['Shed']],
      ['pebble', 'resolved-default', ['Shed']],
      ['pebbles', 'number-form', ['Shed']],
      ['tin bucket', 'not-in-scope', ['Shed']],
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

  // Census-reviewed 2026-11-22 (census-lens.md, David "a"): the story language's
  // extractor and both numbers. Every one of the 26 earlier findings is kept.
  test('executes 92 forms: 40 not-in-scope, 6 described, 6 number-form, nothing ambiguous or unclassified', () => {
    assert.equal(report.phrasesExecuted, 92);
    assert.deepEqual(report.counts, { 'not-in-scope': 40, 'resolved-described': 6, 'number-form': 6 });
  });

  test('described things resolve to the thing that answers them, with the message examining chose', () => {
    const described = report.rooms.flatMap((r) => r.rows.filter((row) => row.kind === 'resolved-described')
      .map((row) => [row.phrase, row.target, row.detail]));
    assert.deepEqual(described, [
      ['tree', 'apple tree', 'if.action.examining.examined'],
      ['cider press', 'cider press', 'if.action.examining.examined'],
      ['water valve', 'water valve', 'if.action.examining.examined'],
      ['bee smoker', 'bee smoker', 'if.action.examining.examined_wearable'],
      ['press', 'cider press', 'if.action.examining.examined'],
      ['honeycomb', 'honeycomb', 'if.action.examining.examined'],
    ]);
  });

  test('pins the findings, folded, with the rooms each recurs in', () => {
    assert.deepEqual(report.findings.map((f) => [f.phrase, f.rooms.length]), [
      ['cellar', 2], ['rows', 2], ['age', 1], ['arm', 1], ['bark split', 1], ['barrels', 1], ['bee smokers', 1], ['bees', 1],
      ['brass valve', 1], ['cider press fills', 1], ['cider presses', 1], ['cloud', 1], ['cool cellar', 1], ['door', 1],
      ['honeycombs', 1], ['hook', 1], ['iron crank handle', 1], ['lane', 1], ['leather strap', 1], ['long ash pole', 1],
      ['low wall', 1], ['old apple trees', 1], ['oldest hive', 1], ['oldest tree', 1], ['orchard', 1], ['orchard gate', 1],
      ['orchard keeper', 1], ['paint lifting', 1], ['painted sign', 1], ['pipe', 1], ['presses', 1], ['screw', 1], ['slab', 1],
      ['sleeves', 1], ['slope', 1], ['small green apple', 1], ['steps', 1], ['stone', 1], ['straw', 1], ['straw hives hum', 1],
      ['top bar', 1], ['trees', 1], ['wall', 1], ['water valves', 1],
    ]);
    assert.ok(report.findings.every((f) => (f.kind === 'not-in-scope' || f.kind === 'number-form') && f.detail === NOT_FOUND));
    assert.deepEqual(report.findings.filter((f) => !f.thing).map((f) => f.phrase), ['straw hives hum']);
  });

  test('each singular thing that resolves has its plural tried, and the plural is a number-form finding', () => {
    assert.deepEqual(report.findings.filter((f) => f.kind === 'number-form').map((f) => [f.phrase, f.resolvedForm, f.target, f.sources]), [
      ['bee smokers', 'bee smoker', 'bee smoker', ['bee smoker']],
      ['cider presses', 'cider press', 'cider press', ['room', 'cider press']],
      ['honeycombs', 'honeycomb', 'honeycomb', ['honeycomb']],
      ['presses', 'press', 'cider press', ['keeper']],
      ['trees', 'tree', 'apple tree', ['room']],
      ['water valves', 'water valve', 'water valve', ['room']],
    ]);
  });

  test('a phrase found in two rooms is one finding naming both rooms and both sources', () => {
    const cellar = report.findings.find((f) => f.phrase === 'cellar');
    assert.deepEqual(cellar.rooms.map((r) => r.room), ['Press House', 'Cellar']);
    assert.deepEqual(cellar.sources, ['room', 'crank handle']);
  });
});

const SCULLERY = path.join(TEST_STORIES, 'scullery', 'scullery.story');
const LENS_CLI = path.join(__dirname, '..', 'lens-examinable.js');

describe('scullery at seed 42 / 600 states — number forms (OB-54 to OB-59)', () => {
  let report;
  const rowsOf = (room) => report.rooms.find((r) => r.room === room).rows
    .map((r) => [r.phrase, r.kind, r.target, r.resolvedForm, r.sources]);
  before(async () => {
    assert.ok(fs.existsSync(SCULLERY), 'scullery is missing: ' + SCULLERY + ' (set SHARPEE_TEST_STORIES or run from the repository)');
    compose(SCULLERY);
    report = await runLens(SCULLERY, { seed: 42, maxStates: 600, maxSeconds: 120, maxDepth: 40 });
  });

  test('reaches both rooms and types 42 forms', () => {
    assert.equal(report.walk.stopReason, 'all-rooms-reached');
    assert.equal(report.walk.statesDiscovered, 2);
    assert.deepEqual(report.rooms.map((r) => r.room), ['Scullery', 'Larder']);
    assert.equal(report.phrasesExecuted, 42);
    assert.deepEqual(report.counts, { 'resolved-described': 3, 'number-form': 4, 'not-in-scope': 18, 'resolved-default': 1 });
  });

  test('a plural thing and its plural alias resolve, found only by the tagger, and each singular is a number-form finding (OB-56)', () => {
    const jars = rowsOf('Scullery').slice(0, 4);
    assert.deepEqual(jars, [
      ['jars', 'resolved-described', 'jars', undefined, ['room', 'jars']],
      ['jar', 'number-form', 'jars', 'jars', ['room', 'jars']],
      ['crocks', 'resolved-described', 'jars', undefined, ['room']],
      ['crock', 'number-form', 'jars', 'crocks', ['room']],
    ]);
    const crock = report.findings.find((f) => f.phrase === 'crock');
    assert.equal(crock.detail, NOT_FOUND);
    assert.equal(crock.resolvedForm, 'crocks');
  });

  test('a thing with no description answers with the default response, and its plural is tried (OB-54, OB-58)', () => {
    const rows = rowsOf('Scullery');
    assert.deepEqual(rows.find((r) => r[0] === 'whetstone'), ['whetstone', 'resolved-default', 'whetstone', undefined, ['room']]);
    assert.deepEqual(rows.find((r) => r[0] === 'whetstones'), ['whetstones', 'number-form', 'whetstone', 'whetstone', ['room']]);
    assert.deepEqual(rowsOf('Larder').find((r) => r[0] === 'cheeses'), ['cheeses', 'number-form', 'cheese', 'cheese', ['room']]);
  });

  test("a plural in a thing's own description with nothing behind it is not in scope, never a number form (OB-57)", () => {
    assert.deepEqual(rowsOf('Scullery').find((r) => r[0] === 'corks'), ['corks', 'not-in-scope', undefined, undefined, ['jars']]);
    assert.equal(report.findings.some((f) => f.phrase === 'cork'), false);
  });

  test("the carried list's text is a source in both rooms, each phrase one finding naming both (OB-55, OB-59)", () => {
    for (const room of report.rooms) assert.ok(room.prose.some((p) => p.source === 'chore list'), room.room);
    const carried = report.findings.filter((f) => f.sources.includes('chore list'));
    assert.deepEqual(carried.map((f) => [f.phrase, f.kind, f.rooms.map((r) => r.room)]), [
      ['bellows', 'not-in-scope', ['Scullery', 'Larder']],
      ['kettles', 'not-in-scope', ['Scullery', 'Larder']],
      ['scour', 'not-in-scope', ['Scullery', 'Larder']],
    ]);
  });

  test('pins every finding, folded', () => {
    assert.deepEqual(report.findings.map((f) => [f.phrase, f.kind, f.rooms.length]), [
      ['bellows', 'not-in-scope', 2], ['kettles', 'not-in-scope', 2], ['scour', 'not-in-scope', 2],
      ['beams', 'not-in-scope', 1], ['cheeses', 'number-form', 1], ['cold larder', 'not-in-scope', 1],
      ['corks', 'not-in-scope', 1], ['crock', 'number-form', 1], ['damp', 'not-in-scope', 1],
      ['drainboard', 'not-in-scope', 1], ['jar', 'number-form', 1], ['neck', 'not-in-scope', 1],
      ['rind', 'not-in-scope', 1], ['shelf', 'not-in-scope', 1], ['sink', 'not-in-scope', 1],
      ['slate', 'not-in-scope', 1], ['wheel', 'not-in-scope', 1], ['whetstone', 'resolved-default', 1],
      ['whetstones', 'number-form', 1], ['window', 'not-in-scope', 1],
    ]);
  });
});

describe('a story language with no extractor is refused by the CLI (AC-2, OB-60)', () => {
  let run;
  before(() => {
    // A temporary copy: the story compiled as it is, then its IR's language
    // changed to one with no nouns module. Nothing under test-stories/ is edited.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lens-refusal-'));
    const story = path.join(dir, 'scullery.story');
    fs.copyFileSync(SCULLERY, story);
    const ir = compose(story);
    const doc = JSON.parse(fs.readFileSync(ir, 'utf8'));
    doc.phrases.defaultLocale = 'xx-YY';
    fs.writeFileSync(ir, JSON.stringify(doc));
    run = require('node:child_process').spawnSync(process.execPath, [LENS_CLI, story, '--seed', '42', '--max-states', '50'], { encoding: 'utf8' });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('exits non-zero with one line on stderr naming the code, and prints no walk', () => {
    assert.equal(run.status, 1);
    assert.equal(run.stdout, '');
    assert.deepEqual(run.stderr.trim().split('\n'), [NO_EXTRACTOR_XX]);
  });
});
