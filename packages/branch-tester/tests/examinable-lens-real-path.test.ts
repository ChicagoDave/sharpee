/**
 * REAL-PATH — the examinable lens on the shared walk, through the real
 * engine, against the spike's pins (ADR-408 AC-1).
 *
 * The stories are the test stories `test-stories/orchard` and
 * `test-stories/scullery`, compiled by `@sharpee/chord` and booted by
 * `@sharpee/bootstrap` at seed 42, as the spike's suite boots them
 * (`tools/explorer-probe/tests/lens-examinable.test.js`, OB-35 and OB-54 to
 * OB-59). Every `examine` runs through the real parser and engine, and the
 * extractor is English's own, found by if-domain's lookup.
 *
 * Owner context: @sharpee/branch-tester — the lenses (ADR-408 D3).
 */

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { languageMismatchRefusal, resolveNounExtractor, type NounExtractorLookup, type NounsModule } from '@sharpee/if-domain/nouns';
import type { ExaminableLensReport, LensOutput, LensSource } from '@sharpee/ide-protocol';
import { runExaminableLens, type LensGame } from '../src/lens/examinable-lens.js';

const SEED = 42;
const BUDGETS = { maxSeconds: 120 };
const NOT_FOUND = 'Validation failed: ENTITY_NOT_FOUND';
const testStories = process.env.SHARPEE_TEST_STORIES;
const ORCHARD = testStories ? resolve(testStories, 'orchard/orchard.story') : undefined;
const SCULLERY = testStories ? resolve(testStories, 'scullery/scullery.story') : undefined;

const requireHere = createRequire(__filename);
/** The lookup `sharpee world-index` applies: if-domain's resolver loading `@sharpee/lang-<code>/nouns`. */
const lookup: NounExtractorLookup = (code) => resolveNounExtractor(code, (moduleName) => requireHere(moduleName) as NounsModule);

function compileStory(storyFile: string): StoryIR {
  const result = compile(readFileSync(storyFile, 'utf8'));
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

/** Boots one fresh real game at the seed, the way `sharpee test` does. */
function loaderFor(ir: StoryIR): () => Promise<LensGame> {
  return async () => {
    const story = createStory(ir, { seed: SEED });
    return assembleGame(story, { seed: SEED, freshStory: () => createStory(ir, { seed: SEED }) }) as Promise<LensGame>;
  };
}

function asReport(output: LensOutput): ExaminableLensReport {
  if (!output.ok || !output.report) throw new Error(`the lens refused: ${output.refusal?.message}`);
  return output.report;
}

/** A row's sources as their passage keys, the attribution of record (ADR-408 D4). */
const keysOf = (sources: readonly LensSource[]): Array<string | null> => sources.map((source) => source.key);

const describeWith = (file: string | undefined) => (file && existsSync(file) ? describe : describe.skip);

describeWith(ORCHARD)('REAL-PATH — orchard at seed 42 / 600 states on the shared walk (OB-35)', () => {
  let report: ExaminableLensReport;
  beforeAll(async () => {
    const ir = compileStory(ORCHARD!);
    report = asReport(await runExaminableLens(ir, loaderFor(ir), { story: 'orchard.story', seed: SEED, lookup, ...BUDGETS }));
  }, 120_000);

  it('reaches every one of the five rooms by route, in order, with none unreached', () => {
    expect(report.reach.roomsReached).toBe(5);
    expect(report.reach.roomsDeclared).toBe(5);
    expect(report.reach.unreached).toEqual([]);
    expect(report.rooms.map((room) => room.room)).toEqual(['Gate', 'Rows', 'Press House', 'Hive Yard', 'Cellar']);
  });

  it('executes 92 forms: 40 not-in-scope, 6 described, 6 number-form', () => {
    expect(report.phrasesExecuted).toBe(92);
    expect(report.counts).toEqual({ 'not-in-scope': 40, 'resolved-described': 6, 'number-form': 6 });
  });

  it('pins the findings, folded, with the rooms each recurs in', () => {
    expect(report.findings.map((finding) => [finding.phrase, finding.rooms.length])).toEqual([
      ['cellar', 2], ['rows', 2], ['age', 1], ['arm', 1], ['bark split', 1], ['barrels', 1], ['bee smokers', 1], ['bees', 1],
      ['brass valve', 1], ['cider press fills', 1], ['cider presses', 1], ['cloud', 1], ['cool cellar', 1], ['door', 1],
      ['honeycombs', 1], ['hook', 1], ['iron crank handle', 1], ['lane', 1], ['leather strap', 1], ['long ash pole', 1],
      ['low wall', 1], ['old apple trees', 1], ['oldest hive', 1], ['oldest tree', 1], ['orchard', 1], ['orchard gate', 1],
      ['orchard keeper', 1], ['paint lifting', 1], ['painted sign', 1], ['pipe', 1], ['presses', 1], ['screw', 1], ['slab', 1],
      ['sleeves', 1], ['slope', 1], ['small green apple', 1], ['steps', 1], ['stone', 1], ['straw', 1], ['straw hives hum', 1],
      ['top bar', 1], ['trees', 1], ['wall', 1], ['water valves', 1],
    ]);
    expect(report.findings.every((finding) => (finding.kind === 'not-in-scope' || finding.kind === 'number-form') && finding.detail === NOT_FOUND)).toBe(true);
    expect(report.findings.filter((finding) => !finding.thing).map((finding) => finding.phrase)).toEqual(['straw hives hum']);
  });

  it('each singular thing that resolves has its plural tried, and the plural is a number-form finding', () => {
    expect(report.findings.filter((finding) => finding.kind === 'number-form').map((finding) => [finding.phrase, finding.resolvedForm, finding.target, finding.targetId, keysOf(finding.sources)])).toEqual([
      ['bee smokers', 'bee smoker', 'bee smoker', 'bee-smoker', ['bee-smoker.description']],
      ['cider presses', 'cider press', 'cider press', 'cider-press', ['press-house.description', 'cider-press.description']],
      ['honeycombs', 'honeycomb', 'honeycomb', 'honeycomb', ['honeycomb.description']],
      ['presses', 'press', 'cider press', 'cider-press', ['keeper.description']],
      ['trees', 'tree', 'apple tree', 'apple-tree', ['rows.description']],
      ['water valves', 'water valve', 'water valve', 'water-valve', ['press-house.description']],
    ]);
  });

  it('a phrase found in two rooms is one finding naming both rooms, by IR id, and the union of its passages by key', () => {
    const cellar = report.findings.find((finding) => finding.phrase === 'cellar')!;
    expect(cellar.rooms).toEqual([{ roomId: 'press-house', room: 'Press House' }, { roomId: 'cellar', room: 'Cellar' }]);
    expect(keysOf(cellar.sources)).toEqual(['press-house.description', 'crank-handle.description']);
    expect(cellar.targetId).toBeUndefined();
  });
});

describeWith(SCULLERY)('REAL-PATH — scullery at seed 42 / 600 states on the shared walk (OB-54 to OB-59)', () => {
  let report: ExaminableLensReport;
  const rowsOf = (room: string) => report.rooms.find((r) => r.room === room)!.rows
    .map((row) => [row.phrase, row.kind, row.target, row.resolvedForm, keysOf(row.sources)]);
  beforeAll(async () => {
    const ir = compileStory(SCULLERY!);
    report = asReport(await runExaminableLens(ir, loaderFor(ir), { story: 'scullery.story', seed: SEED, lookup, ...BUDGETS }));
  }, 120_000);

  it('reaches both rooms and types 42 forms', () => {
    expect(report.reach).toMatchObject({ roomsReached: 2, roomsDeclared: 2, unreached: [] });
    expect(report.rooms.map((room) => room.room)).toEqual(['Scullery', 'Larder']);
    expect(report.phrasesExecuted).toBe(42);
    expect(report.counts).toEqual({ 'resolved-described': 3, 'number-form': 4, 'not-in-scope': 18, 'resolved-default': 1 });
  });

  it('a plural thing and its plural alias resolve, and each singular is a number-form finding (OB-56)', () => {
    expect(rowsOf('Scullery').slice(0, 4)).toEqual([
      ['jars', 'resolved-described', 'jars', undefined, ['scullery.description', 'jars.description']],
      ['jar', 'number-form', 'jars', 'jars', ['scullery.description', 'jars.description']],
      ['crocks', 'resolved-described', 'jars', undefined, ['scullery.description']],
      ['crock', 'number-form', 'jars', 'crocks', ['scullery.description']],
    ]);
  });

  it('a thing with no description answers with the default response, and its plural is tried (OB-54, OB-58)', () => {
    expect(rowsOf('Scullery').find((row) => row[0] === 'whetstone')).toEqual(['whetstone', 'resolved-default', 'whetstone', undefined, ['scullery.description']]);
    expect(rowsOf('Scullery').find((row) => row[0] === 'whetstones')).toEqual(['whetstones', 'number-form', 'whetstone', 'whetstone', ['scullery.description']]);
    expect(rowsOf('Larder').find((row) => row[0] === 'cheeses')).toEqual(['cheeses', 'number-form', 'cheese', 'cheese', ['larder.description']]);
  });

  it('the whetstone\'s no-text finding names the Scullery\'s description passage and owner, and the whetstone\'s IR id (ADR-408 D4, AC-2)', () => {
    const whetstone = report.findings.find((finding) => finding.phrase === 'whetstone' && finding.kind === 'resolved-default')!;
    expect(whetstone.targetId).toBe('whetstone');
    expect(whetstone.sources).toEqual([{ key: 'scullery.description', kind: 'description', ownerId: 'scullery', ownerName: 'Scullery' }]);
    expect(whetstone.rooms).toEqual([{ roomId: 'scullery', room: 'Scullery' }]);
  });

  it('every room id is an IR id, and each passage read names its key, kind and owner', () => {
    expect(report.rooms.map((room) => room.roomId)).toEqual(['scullery', 'larder']);
    expect(report.rooms[0].prose.map((passage) => passage.source)).toEqual([
      { key: 'scullery.description', kind: 'description', ownerId: 'scullery', ownerName: 'Scullery' },
      { key: 'jars.description', kind: 'description', ownerId: 'jars', ownerName: 'jars' },
      { key: 'chore-list.description', kind: 'description', ownerId: 'chore-list', ownerName: 'chore list' },
    ]);
  });

  it('a phrase read in two rooms from one passage is one finding with one source', () => {
    const bellows = report.findings.find((finding) => finding.phrase === 'bellows')!;
    expect(bellows.rooms.map((room) => room.roomId)).toEqual(['scullery', 'larder']);
    expect(keysOf(bellows.sources)).toEqual(['chore-list.description']);
  });

  it("a plural in a thing's own description with nothing behind it is not in scope, never a number form (OB-57)", () => {
    expect(rowsOf('Scullery').find((row) => row[0] === 'corks')).toEqual(['corks', 'not-in-scope', undefined, undefined, ['jars.description']]);
    expect(report.findings.some((finding) => finding.phrase === 'cork')).toBe(false);
  });

  it('pins every finding, folded', () => {
    expect(report.findings.map((finding) => [finding.phrase, finding.kind, finding.rooms.length])).toEqual([
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

describeWith(SCULLERY)('REAL-PATH — the language guard (ADR-407 D2, D6)', () => {
  it('a story whose language has no extractor is refused, and the game is never loaded', async () => {
    const ir = compileStory(SCULLERY!);
    const foreign: StoryIR = { ...ir, phrases: { ...ir.phrases, defaultLocale: 'xx-YY' } };
    let loads = 0;
    const result = await runExaminableLens(foreign, async () => { loads++; return loaderFor(ir)(); }, { story: 'scullery.story', seed: SEED, lookup, ...BUDGETS });
    expect(result).toEqual({ lens: 'examinable', format: 3, story: 'scullery.story', ok: false, refusal: { message: "No noun extractor for language 'xx-YY': @sharpee/lang-xx-yy/nouns does not provide one." } });
    expect(loads).toBe(0);
  });

  it('an engine whose language is not the story\'s is refused on the opening room, before any turn is typed', async () => {
    const ir = compileStory(SCULLERY!);
    // The story says en-GB; English's extractor answers for it, the engine is en-US.
    const english = lookup('en-US');
    const both: NounExtractorLookup = (code) => (code === 'en-GB' ? english : lookup(code));
    const relabelled: StoryIR = { ...ir, phrases: { ...ir.phrases, defaultLocale: 'en-GB' } };
    let turns = 0;
    const counting = async (): Promise<LensGame> => {
      const game = await loaderFor(ir)();
      const turn = game.engine.executeTurn.bind(game.engine);
      game.engine.executeTurn = async (input: string) => { turns++; return turn(input); };
      return game;
    };
    const result = await runExaminableLens(relabelled, counting, { story: 'scullery.story', seed: SEED, lookup: both, ...BUDGETS });
    expect(result).toEqual({ lens: 'examinable', format: 3, story: 'scullery.story', ok: false, refusal: { message: languageMismatchRefusal('en-US', 'en-GB') } });
    expect(turns).toBe(0);
  });
});

const ENDED = resolve(__dirname, 'fixtures/lens-ended/lens-ended.story');

describe('REAL-PATH — a room first seen in the move that ends the game', () => {
  it('is recorded as ended, with no prose and no rows, and nothing is examined there', async () => {
    const ir = compileStory(ENDED);
    // Every examine the lens types, and where the player stands when it does.
    const examinedIn: string[] = [];
    const watching = async (): Promise<LensGame> => {
      const game = await loaderFor(ir)();
      const turn = game.engine.executeTurn.bind(game.engine);
      game.engine.executeTurn = async (input: string) => {
        if (input.startsWith('examine ')) examinedIn.push(game.world.getContainingRoom(game.world.playerCharacter.id)?.name ?? '?');
        return turn(input);
      };
      return game;
    };
    const report = asReport(await runExaminableLens(ir, watching, { story: 'lens-ended.story', seed: SEED, lookup, ...BUDGETS }));
    const porch = report.rooms.find((room) => room.room === 'Porch')!;
    const garden = report.rooms.find((room) => room.room === 'Garden')!;
    expect(garden).toMatchObject({ ended: true, prose: [], rows: [], path: ['north'] });
    expect(porch.ended).toBeUndefined();
    expect(report.reach).toMatchObject({ roomsReached: 2, roomsDeclared: 2, unreached: [] });
    // Every form typed was typed in the Porch: the Garden added none.
    expect(report.phrasesExecuted).toBeGreaterThan(0);
    expect(examinedIn.length).toBe(report.phrasesExecuted);
    expect(new Set(examinedIn)).toEqual(new Set(['Porch']));
    expect(report.findings.every((finding) => finding.rooms.every((room) => room.room === 'Porch'))).toBe(true);
  }, 60_000);
});

const FIXTURE = resolve(__dirname, 'fixtures/lens-fixture/lens-fixture.story');

describe('REAL-PATH — the lens fixture, through the real engine (ported from the spike)', () => {
  let output: LensOutput;
  let report: ExaminableLensReport;
  beforeAll(async () => {
    const ir = compileStory(FIXTURE);
    output = await runExaminableLens(ir, loaderFor(ir), { story: 'lens-fixture.story', seed: SEED, lookup, ...BUDGETS });
    report = asReport(output);
  }, 60_000);

  it('is a format-3 document, ok with a report and no refusal, with exactly the documented keys', () => {
    expect(Object.keys(output)).toEqual(['lens', 'format', 'story', 'ok', 'report']);
    expect(output).toMatchObject({ lens: 'examinable', format: 3, story: 'lens-fixture.story', ok: true });
    expect(Object.keys(report)).toEqual(['seed', 'reach', 'phrasesExecuted', 'counts', 'findings', 'rooms']);
    expect(Object.keys(report.reach)).toEqual(['roomsReached', 'roomsDeclared', 'unreached', 'commandsTyped', 'ms', 'maxSeconds', 'stoppedBy']);
    expect(report.reach.stoppedBy).toBe('every-route');
  });

  it('reaches the one room and types every form in both numbers', () => {
    expect(report.reach).toMatchObject({ roomsReached: 1, roomsDeclared: 1, unreached: [] });
    expect(report.phrasesExecuted).toBe(12);
    expect(report.counts).toEqual({ 'not-in-scope': 4, 'resolved-default': 1, 'number-form': 2, 'resolved-described': 1 });
  });

  it('classifies the described bucket, the descriptionless pebble, the entity-less crack, and each plural', () => {
    expect(report.rooms[0].rows.map((row) => [row.phrase, row.kind, row.detail, row.target, row.targetId, row.resolvedForm, keysOf(row.sources), row.thing])).toEqual([
      ['bare shed', 'not-in-scope', NOT_FOUND, undefined, undefined, undefined, ['shed.description'], true],
      ['pebble', 'resolved-default', 'if.action.examining.default_description', 'pebble', 'pebble', undefined, ['shed.description'], true],
      ['pebbles', 'number-form', NOT_FOUND, 'pebble', 'pebble', 'pebble', ['shed.description'], true],
      ['bucket', 'resolved-described', 'if.action.examining.examined', 'bucket', 'bucket', undefined, ['shed.description'], true],
      ['buckets', 'number-form', NOT_FOUND, 'bucket', 'bucket', 'bucket', ['shed.description'], true],
      ['crack', 'not-in-scope', NOT_FOUND, undefined, undefined, undefined, ['shed.description'], true],
      ['dented tin bucket', 'not-in-scope', NOT_FOUND, undefined, undefined, undefined, ['bucket.description'], true],
      ['tin bucket', 'not-in-scope', NOT_FOUND, undefined, undefined, undefined, ['bucket.description'], true],
    ]);
  });

  it('folds the findings, each seen in the one room, the described row excluded', () => {
    expect(report.findings.map((finding) => [finding.phrase, finding.kind, finding.rooms.map((room) => room.room)])).toEqual([
      ['bare shed', 'not-in-scope', ['Shed']],
      ['buckets', 'number-form', ['Shed']],
      ['crack', 'not-in-scope', ['Shed']],
      ['dented tin bucket', 'not-in-scope', ['Shed']],
      ['pebble', 'resolved-default', ['Shed']],
      ['pebbles', 'number-form', ['Shed']],
      ['tin bucket', 'not-in-scope', ['Shed']],
    ]);
  });

  it('records the prose the player saw, by source', () => {
    expect(report.rooms[0].prose.map((passage) => passage.source)).toEqual([
      { key: 'shed.description', kind: 'description', ownerId: 'shed', ownerName: 'Shed' },
      { key: 'bucket.description', kind: 'description', ownerId: 'bucket', ownerName: 'bucket' },
    ]);
    expect(report.rooms[0].prose[1].text).toMatch(/dented tin bucket/);
  });
});
