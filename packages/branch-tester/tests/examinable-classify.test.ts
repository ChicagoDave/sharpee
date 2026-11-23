/**
 * examinable-classify.test.ts — the examinable lens's classifier, one event
 * shape at a time (ADR-407 D7: the engine decides each class), and its fold
 * (ADR-408 D4: findings name their passages by key and their target by IR id).
 *
 * Ported from the spike's `classify` cases
 * (`tools/explorer-probe/tests/lens-examinable.test.js`), so the branches the
 * real-path pins never reach — ambiguous, blocked, unclassified — stay
 * pinned once the spike is gone.
 *
 * Owner context: @sharpee/branch-tester — the lenses (ADR-408 D3).
 */

import { describe, expect, it } from 'vitest';
import type { NounExtractor } from '@sharpee/if-domain/nouns';
import type { ExaminableRow, LensSource } from '@sharpee/ide-protocol';
import { classifyCandidates, classifyExamine, foldFindings, type IrIdOf } from '../src/lens/examinable-classify.js';

const examined = (data: Record<string, string | boolean>) => ({ type: 'if.event.examined', data });

/** An engine whose runtime ids the IR does not declare: no target id is ever named. */
const noIds: IrIdOf = () => undefined;

describe('classifyExamine', () => {
  it('an examined event with an authored description is resolved-described, naming the target', () => {
    expect(classifyExamine({ events: [examined({ messageId: 'if.action.examining.examined', targetName: 'bucket' })] }, noIds))
      .toEqual({ kind: 'resolved-described', detail: 'if.action.examining.examined', target: 'bucket' });
  });

  it('a Chord phrase id from an `on examining` clause is still resolved-described', () => {
    expect(classifyExamine({ events: [examined({ messageId: 'story.bucket-glints', targetName: 'bucket' })] }, noIds).kind).toBe('resolved-described');
  });

  it('each of the three default ids is resolved-default', () => {
    for (const id of ['if.action.examining.default_description', 'if.action.examining.default_description_self', 'if.action.examining.nothing_special']) {
      expect(classifyExamine({ events: [examined({ messageId: id, targetName: 'pebble' })] }, noIds)).toEqual({ kind: 'resolved-default', detail: id, target: 'pebble' });
    }
  });

  it('a blocked examined event (in scope, not visible) is not-in-scope, still naming what answered', () => {
    expect(classifyExamine({ events: [examined({ messageId: 'if.action.examining.too_dark', blocked: true, targetName: 'lamp' })] }, noIds))
      .toEqual({ kind: 'not-in-scope', detail: 'if.action.examining.too_dark', target: 'lamp' });
  });

  it('the examined event\'s runtime target id becomes the IR id the story declares it by', () => {
    const irIds: IrIdOf = (entityId) => (entityId === 'i07' ? 'whetstone' : undefined);
    expect(classifyExamine({ events: [examined({ messageId: 'if.action.examining.default_description', targetId: 'i07', targetName: 'whetstone' })] }, irIds))
      .toEqual({ kind: 'resolved-default', detail: 'if.action.examining.default_description', target: 'whetstone', targetId: 'whetstone' });
  });

  it('a target the IR does not declare names no target id, and the runtime id is never passed off as one', () => {
    const verdict = classifyExamine({ events: [examined({ messageId: 'if.action.examining.examined', targetId: 'a01', targetName: 'yourself' })] }, noIds);
    expect(verdict).toEqual({ kind: 'resolved-described', detail: 'if.action.examining.examined', target: 'yourself' });
    expect('targetId' in verdict).toBe(false);
  });

  it('a contents-list examined event is not the verdict', () => {
    const events = [examined({ messageId: 'if.action.examining.contents', isContentsMessage: true, targetName: 'box' }), { type: 'command.failed', data: { reason: 'Validation failed: ENTITY_NOT_FOUND' } }];
    expect(classifyExamine({ events }, noIds)).toEqual({ kind: 'not-in-scope', detail: 'Validation failed: ENTITY_NOT_FOUND' });
  });

  it('a client.query is ambiguous, listing the candidates', () => {
    const events = [{ type: 'client.query', data: { messageId: 'disambiguate', candidates: [{ name: 'red key' }, { id: 'k2' }, 'blue key'] } }];
    expect(classifyExamine({ events }, noIds)).toEqual({ kind: 'ambiguous', detail: 'red key / k2 / blue key' });
  });

  it('a command.failed carries the validator reason as not-in-scope', () => {
    expect(classifyExamine({ events: [{ type: 'command.failed', data: { reason: 'Validation failed: ENTITY_NOT_FOUND' } }] }, noIds))
      .toEqual({ kind: 'not-in-scope', detail: 'Validation failed: ENTITY_NOT_FOUND' });
  });

  it('a failed turn with no events is not-in-scope on the turn\'s error', () => {
    expect(classifyExamine({ events: [], success: false, error: 'parse failed' }, noIds)).toEqual({ kind: 'not-in-scope', detail: 'parse failed' });
  });

  it('anything else is unclassified, carrying what the turn threw and the event types it saw', () => {
    expect(classifyExamine({ events: [{ type: 'game.message' }, { type: 'if.event.looked' }], thrown: 'the game has ended' }, noIds))
      .toEqual({ kind: 'unclassified', detail: 'the game has ended game.message,if.event.looked' });
  });
});

/** The room's description passage, as the lens names it. */
const ROOM: LensSource = { key: 'shed.description', kind: 'description', ownerId: 'shed', ownerName: 'Shed' };

describe('the extractor never decides a verdict (ADR-407 AC-6)', () => {
  // One fixed map of form to the engine's events, and two different candidate
  // lists over the same prose: every phrase both lists propose gets the same
  // class, because the class is read only off the events.
  const NOT_FOUND = 'Validation failed: ENTITY_NOT_FOUND';
  const failed = [{ type: 'command.failed', data: { reason: NOT_FOUND } }];
  const EVENTS = new Map([
    ['candles', [examined({ messageId: 'if.action.examining.examined', targetName: 'candles' })]],
    ['pebble', [examined({ messageId: 'if.action.examining.default_description', targetName: 'pebble' })]],
    ['crack', failed],
  ]);
  const runForm = async (form: string) => classifyExamine({ events: EVENTS.get(form) ?? failed, success: EVENTS.has(form) }, noIds);
  const numberForms = (noun: string) => (noun.endsWith('s') ? { singular: noun.slice(0, -1), plural: noun } : { singular: noun, plural: `${noun}s` });
  const extractorOf = (phrases: ReadonlyArray<readonly string[]>): NounExtractor => ({
    languageCode: 'en-US',
    filters: { headStopwords: [], minHeadLength: 1, maxPhraseWords: 6 },
    extract: () => phrases.map((words, offset) => ({ text: words.join(' '), words, head: words[words.length - 1], offset })),
    tokenize: (text) => text.split(/\s+/),
    numberForms,
  });
  const foldedOf = (extractor: NounExtractor) => new Map(extractor.extract('passage').map((candidate) => [candidate.words.join(' '), { words: candidate.words, sources: [ROOM] }]));
  const narrow = extractorOf([['candles'], ['crack']]);
  const wide = extractorOf([['candles'], ['pebble'], ['crack'], ['rows', 'of', 'candles']]);

  it('every phrase both candidate lists share gets the same class and detail', async () => {
    const byPhrase = (rows: Awaited<ReturnType<typeof classifyCandidates>>) => new Map(rows.map((row) => [row.phrase, [row.kind, row.detail, row.resolvedForm]]));
    const a = byPhrase(await classifyCandidates(foldedOf(narrow), runForm, narrow));
    const b = byPhrase(await classifyCandidates(foldedOf(wide), runForm, wide));
    const shared = [...a.keys()].filter((phrase) => b.has(phrase));
    expect(shared).toEqual(['candles', 'candle', 'crack']);
    for (const phrase of shared) expect(a.get(phrase)).toEqual(b.get(phrase));
  });

  it('classes come from the events: described, number-form against what resolved, not-in-scope', async () => {
    const rows = await classifyCandidates(foldedOf(wide), runForm, wide);
    expect(rows.map((row) => [row.phrase, row.kind, row.resolvedForm])).toEqual([
      ['candles', 'resolved-described', undefined],
      ['candle', 'number-form', 'candles'],
      ['pebble', 'resolved-default', undefined],
      ['pebbles', 'number-form', 'pebble'],
      ['crack', 'not-in-scope', undefined],
      ['rows of candles', 'not-in-scope', undefined],
    ]);
  });
});

describe('foldFindings — one finding per phrase, class, detail and target, sources unioned by key (ADR-408 D4)', () => {
  const NOT_FOUND = 'Validation failed: ENTITY_NOT_FOUND';
  const LIST: LensSource = { key: 'list.description', kind: 'description', ownerId: 'list', ownerName: 'list' };
  const HALL: LensSource = { key: 'hall.description', kind: 'description', ownerId: 'hall', ownerName: 'Hall' };
  const row = (phrase: string, sources: LensSource[], extra: Partial<ExaminableRow> = {}): ExaminableRow => ({ phrase, kind: 'not-in-scope', detail: NOT_FOUND, sources, thing: true, ...extra });

  it('a phrase read from one passage in two rooms is one finding naming both rooms and that passage once', () => {
    const [finding] = foldFindings([
      { roomId: 'shed', room: 'Shed', rows: [row('kettles', [{ ...LIST }])] },
      { roomId: 'hall', room: 'Hall', rows: [row('kettles', [{ ...LIST }])] },
    ]);
    expect(finding.rooms).toEqual([{ roomId: 'shed', room: 'Shed' }, { roomId: 'hall', room: 'Hall' }]);
    expect(finding.sources).toEqual([LIST]);
  });

  it('the same phrase read from different passages in two rooms unions both passages, in first-seen order', () => {
    const [finding] = foldFindings([
      { roomId: 'shed', room: 'Shed', rows: [row('door', [ROOM])] },
      { roomId: 'hall', room: 'Hall', rows: [row('door', [HALL, ROOM])] },
    ]);
    expect(finding.sources.map((source) => source.key)).toEqual(['shed.description', 'hall.description']);
  });

  it('one phrase answered by two different things stays two findings, each with its own target id', () => {
    const findings = foldFindings([
      { roomId: 'shed', room: 'Shed', rows: [row('stone', [ROOM], { kind: 'resolved-default', detail: 'd', target: 'stone', targetId: 'shed-stone' })] },
      { roomId: 'hall', room: 'Hall', rows: [row('stone', [HALL], { kind: 'resolved-default', detail: 'd', target: 'stone', targetId: 'hall-stone' })] },
    ]);
    expect(findings.map((finding) => [finding.targetId, finding.rooms.map((room) => room.roomId), finding.sources.map((source) => source.key)])).toEqual([
      ['shed-stone', ['shed'], ['shed.description']],
      ['hall-stone', ['hall'], ['hall.description']],
    ]);
  });

  it('text with no key unions by kind and owner: one owner\'s state text is one source, another owner\'s is another', () => {
    const lamp = (ownerId: string): LensSource => ({ key: null, kind: 'state', ownerId, ownerName: 'lamp' });
    const [finding] = foldFindings([
      { roomId: 'shed', room: 'Shed', rows: [row('wick', [lamp('lamp-1')])] },
      { roomId: 'hall', room: 'Hall', rows: [row('wick', [lamp('lamp-1'), lamp('lamp-2')])] },
    ]);
    expect(finding.sources).toEqual([lamp('lamp-1'), lamp('lamp-2')]);
  });

  it('a described resolution is never a finding', () => {
    expect(foldFindings([{ roomId: 'shed', room: 'Shed', rows: [row('bucket', [ROOM], { kind: 'resolved-described', detail: 'x', targetId: 'bucket' })] }])).toEqual([]);
  });
});
