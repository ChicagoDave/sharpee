/**
 * adr-349-room-name.test.ts — the authored location heading in Chord.
 *
 * The `room name` construct (D1) and its IR shape (D15): arms ride the existing
 * numbered phrase-key convention, so `IREntity` gains no field and `IRPhrases`
 * gains no shape. AC-12 lives here — the three-arm compile shape in declaration
 * order, plus both negatives — with the AC-1 analyzer half (twelve rooms with
 * distinct names and one identical heading raise no duplicate-entity diagnostic).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';

const START = `before the game starts
  change the player to Alex
end before

`;

const PLAYER = `create Alex
  a person
  playable
  starts in the Well

  You.

` + START;

const compileStory = (world: string) => compile(HEADER + world + PLAYER);

const errorCodes = (result: { diagnostics: { code: string; severity: string }[] }) =>
  result.diagnostics.filter(d => d.severity === 'error').map(d => d.code);

const phraseTable = (result: any): Record<string, any> =>
  result.ir?.phrases?.locales?.['en-US'] ?? {};

const phraseKeys = (result: any, prefix: string) =>
  Object.keys(phraseTable(result)).filter(k => k.startsWith(prefix));

describe('the `room name` construct (ADR-349 D1/D15)', () => {
  it('compiles three arms to numbered keys in declaration order', () => {
    const result = compileStory(`create the Well
  a room
  room name while the bucket is open:
    Top of Well, the bucket gaping
  room name while the bucket is closed:
    Top of Well, the bucket shut
  room name:
    Top of Well

  A well.

create the bucket
  a container
  openable
  in the Well

  A bucket.

`);

    expect(errorCodes(result)).toEqual([]);
    expect(phraseKeys(result, 'well.room-name')).toEqual([
      'well.room-name',
      'well.room-name.2',
      'well.room-name.3',
    ]);
    const phrases = phraseTable(result);
    expect(phrases['well.room-name'].variants[0].text).toBe('Top of Well, the bucket gaping');
    expect(phrases['well.room-name.2'].variants[0].text).toBe('Top of Well, the bucket shut');
    expect(phrases['well.room-name.3'].variants[0].text).toBe('Top of Well');
  });

  it('carries each arm\'s condition, and the unconditional arm carries none', () => {
    const result = compileStory(`create the Well
  a room
  room name while the bucket is open:
    Top of Well, the bucket gaping
  room name:
    Top of Well

  A well.

create the bucket
  a container
  openable
  in the Well

  A bucket.

`);

    expect(errorCodes(result)).toEqual([]);
    const phrases = phraseTable(result);
    expect(phrases['well.room-name'].condition).toBeDefined();
    expect(phrases['well.room-name.2'].condition).toBeUndefined();
  });

  it('adds no field to the entity and no shape to the phrase table', () => {
    const result = compileStory(`create the Well
  a room
  room name:
    Top of Well

  A well.

`);

    const entity = (result as any).ir.entities.find((e: any) => e.id === 'well');
    expect(entity).toBeDefined();
    expect(Object.keys(entity)).not.toContain('roomName');
    expect(entity.name).toBe('Well');
  });

  describe('the analyzer gates (D15)', () => {
    it('rejects a second unconditional arm', () => {
      const result = compileStory(`create the Well
  a room
  room name:
    Top of Well
  room name:
    Bottom of Well

  A well.

`);

      expect(errorCodes(result)).toContain('analysis.room-name-duplicate-unconditional');
    });

    it('rejects a conditional arm after the unconditional one', () => {
      const result = compileStory(`create the Well
  a room
  room name:
    Top of Well
  room name while the bucket is open:
    Top of Well, the bucket gaping

  A well.

create the bucket
  a container
  openable
  in the Well

  A bucket.

`);

      expect(errorCodes(result)).toContain('analysis.room-name-dead-arm');
    });

    it('accepts the arms in the legal order', () => {
      const result = compileStory(`create the Well
  a room
  room name while the bucket is open:
    Top of Well, the bucket gaping
  room name:
    Top of Well

  A well.

create the bucket
  a container
  openable
  in the Well

  A bucket.

`);

      expect(errorCodes(result)).toEqual([]);
    });

    it('rejects `or`-separated variants in one arm', () => {
      const result = compileStory(`create the Well
  a room
  room name:
    Top of Well
  or
    The Well

  A well.

`);

      expect(errorCodes(result)).toContain('analysis.room-name-variants');
    });

    it('rejects the block on a thing that cannot contribute to a heading', () => {
      const result = compileStory(`create the Well
  a room

  A well.

create the lamp
  in the Well
  room name:
    Lamplight

  A lamp.

`);

      expect(errorCodes(result)).toContain('analysis.room-name-owner');
    });

    it('accepts the block on an enterable thing and on a region', () => {
      const result = compileStory(`create the Underground
  a region
  containing the Well
  room name:
    underground

create the Well
  a room

  A well.

create the bucket
  a container
  enterable
  in the Well
  room name:
    in the bucket

  A bucket.

`);

      expect(errorCodes(result)).toEqual([]);
    });
  });

  describe('the maze (AC-1, analyzer half)', () => {
    it('twelve distinct entity names share one heading with no duplicate-entity diagnostic', () => {
      const rooms = Array.from({ length: 12 }, (_, i) => `create the maze-${i + 1}
  a room
  room name:
    Maze of twisty little passages, all alike

  You are lost.

`).join('');
      const result = compile(HEADER + rooms + `create Alex
  a person
  playable
  starts in the maze-1

  You.

` + START);

      expect(errorCodes(result)).toEqual([]);
      const phrases = phraseTable(result);
      const headings = Array.from({ length: 12 }, (_, i) => phrases[`maze-${i + 1}.room-name`]);
      expect(headings.every(h => h?.variants[0].text === 'Maze of twisty little passages, all alike')).toBe(true);
    });
  });
});
