/**
 * feed-record.test.ts — the opening card is seated from the record's own
 * mark, never from where the record stands in the feed.
 *
 * Public interface: none (a test file).
 * Owner context: tools/ide — testing surface tests.
 */
import { describe, expect, it } from 'vitest';

import { isOpeningRecord, type OpeningMark } from '../src/feed-record';

describe('which feed record is the opening', () => {
  it('the record the client marks `opening` is', () => {
    expect(isOpeningRecord({ opening: true })).toBe(true);
  });

  it('a typed turn is not, even as the first record of a session, which is what a restored session posts', () => {
    const firstRecordOfARestoredSession: OpeningMark & { turn: number; command: string } =
      { turn: 1, command: 'look' };
    expect(isOpeningRecord(firstRecordOfARestoredSession)).toBe(false);
  });

  it('a record with no command and no mark is not: the mark decides, not the missing command', () => {
    expect(isOpeningRecord({})).toBe(false);
    expect(isOpeningRecord({ opening: false })).toBe(false);
  });
});
