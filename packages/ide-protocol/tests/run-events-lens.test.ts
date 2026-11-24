/**
 * Guard tests for the examinable lens's two run events (ADR-408 D8):
 * `lens-finding` and `lens-summary`.
 *
 * The properties these hold: a finding's class is one of the lens's six
 * words, each source names its key (or null), its kind and owner, and a
 * span (or null), and the phrase's own span with its length or neither;
 * a summary carries either the refusal or the measurements,
 * never both and never neither, so a consumer cannot read a refused run as
 * one that reached no rooms.
 */

import { describe, it, expect } from 'vitest';
import {
  RUN_EVENT_SCHEMA_VERSION,
  isLensFindingEvent,
  isLensSummaryEvent,
  isRunEvent,
  type LensFindingEvent,
  type LensSummaryEvent,
} from '../src/index.js';

const envelope = { schemaVersion: RUN_EVENT_SCHEMA_VERSION, seq: 0, elapsedMs: 0 } as const;
const span = { line: 18, column: 3, endLine: 19, endColumn: 39 };

describe('lens-finding', () => {
  const whetstone: LensFindingEvent = {
    ...envelope,
    type: 'lens-finding',
    lens: 'examinable',
    phrase: 'whetstone',
    kind: 'resolved-default',
    detail: 'if.action.examining.default_description',
    thing: true,
    target: 'whetstone',
    targetId: 'whetstone',
    targetSpan: { line: 35, column: 1, endLine: 37, endColumn: 17 },
    sources: [{ key: 'scullery.description', kind: 'description', ownerId: 'scullery', ownerName: 'Scullery', span }],
    rooms: [{ roomId: 'scullery', room: 'Scullery' }],
  };

  it('accepts a no-text finding with its passage, span, target and declaration', () => {
    expect(isLensFindingEvent(whetstone)).toBe(true);
    expect(isRunEvent(whetstone)).toBe(true);
  });

  it('accepts a finding with no target, a keyless state source, and a null span', () => {
    const corks = { ...whetstone, phrase: 'corks', kind: 'not-in-scope', target: undefined, targetId: undefined, targetSpan: undefined,
      sources: [{ key: null, kind: 'state', ownerId: 'jars', ownerName: 'jars', span: null }] };
    expect(isLensFindingEvent(corks)).toBe(true);
  });

  it('refuses a class outside the lens\'s six, a source with no span field, and a source kind it does not know', () => {
    expect(isLensFindingEvent({ ...whetstone, kind: 'missing' })).toBe(false);
    const { span: _span, ...spanless } = whetstone.sources[0];
    expect(isLensFindingEvent({ ...whetstone, sources: [spanless] })).toBe(false);
    expect(isLensFindingEvent({ ...whetstone, sources: [{ ...whetstone.sources[0], kind: 'response' }] })).toBe(false);
  });

  it('accepts a source carrying the phrase\'s own span and its length, and one carrying neither (ADR-408 D9)', () => {
    const located = { ...whetstone.sources[0], at: { line: 19, column: 3, endLine: 19, endColumn: 12 }, length: 9 };
    expect(isLensFindingEvent({ ...whetstone, sources: [located] })).toBe(true);
    expect('at' in whetstone.sources[0]).toBe(false);
    expect(isLensFindingEvent(whetstone)).toBe(true);
  });

  it('refuses a malformed phrase span, a length that is not a positive whole number, and either one without the other', () => {
    const at = { line: 19, column: 3, endLine: 19, endColumn: 12 };
    const source = whetstone.sources[0];
    const finding = (extra: Record<string, unknown>) => ({ ...whetstone, sources: [{ ...source, ...extra }] });
    expect(isLensFindingEvent(finding({ at: { line: 19, column: 3 }, length: 9 }))).toBe(false);
    expect(isLensFindingEvent(finding({ at: null, length: 9 }))).toBe(false);
    expect(isLensFindingEvent(finding({ at, length: 0 }))).toBe(false);
    expect(isLensFindingEvent(finding({ at, length: 2.5 }))).toBe(false);
    expect(isLensFindingEvent(finding({ at, length: '9' }))).toBe(false);
    expect(isLensFindingEvent(finding({ at }))).toBe(false);
    expect(isLensFindingEvent(finding({ length: 9 }))).toBe(false);
  });

  it('refuses a room without its IR id', () => {
    expect(isLensFindingEvent({ ...whetstone, rooms: [{ room: 'Scullery' }] })).toBe(false);
  });
});

describe('lens-summary', () => {
  const reach = { roomsReached: 2, roomsDeclared: 2, unreached: [], commandsTyped: 1, ms: 90, maxSeconds: 30, stoppedBy: 'every-route' as const };
  const ran: LensSummaryEvent = {
    ...envelope,
    type: 'lens-summary',
    lens: 'examinable',
    seed: 42,
    maxSeconds: 30,
    reach,
    phrasesExecuted: 42,
    counts: { 'resolved-described': 3, 'number-form': 4, 'not-in-scope': 18, 'resolved-default': 1 },
  };
  const refused: LensSummaryEvent = {
    ...envelope,
    type: 'lens-summary',
    lens: 'examinable',
    seed: 42,
    maxSeconds: 30,
    refusal: "No noun extractor for language 'xx-YY': @sharpee/lang-xx-yy/nouns does not provide one.",
  };

  it('accepts a run with its reach, phrases and counts, and a refusal with none of them', () => {
    expect(isLensSummaryEvent(ran)).toBe(true);
    expect(isLensSummaryEvent(refused)).toBe(true);
    expect(isRunEvent(refused)).toBe(true);
  });

  it('refuses a summary carrying both a refusal and measurements, and one carrying neither', () => {
    expect(isLensSummaryEvent({ ...ran, refusal: 'no extractor' })).toBe(false);
    const { reach: _r, phrasesExecuted: _p, counts: _c, ...neither } = ran;
    expect(isLensSummaryEvent(neither)).toBe(false);
  });

  it('refuses a reach with no stop reason, or one it does not know', () => {
    const { stoppedBy: _s, ...noReason } = reach;
    expect(isLensSummaryEvent({ ...ran, reach: noReason })).toBe(false);
    expect(isLensSummaryEvent({ ...ran, reach: { ...reach, stoppedBy: 'states' } })).toBe(false);
  });
});
