/**
 * define-sound-heard.test.ts — a `define sound` block's `heard:` and `heard
 * from afar:` lines reach the IR, the one-line form still compiles, and the
 * block's malformed shapes are refused by name. Also the `emit` rule the
 * same issue settled: an event name is one word (GH #713).
 *
 * Public interface: none (test module).
 * Owner context: @sharpee/chord tests
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = [
  'story',
  '  title: Belfry',
  '  authors:',
  '    T',
  '  id: belfry',
  '  story-version: 0.0.1',
  '',
  'create the Belfry',
  '  a room',
  '',
  '  A belfry.',
  '',
  'create Ringer',
  '  a person',
  '  playable',
  '  starts in the Belfry',
  '',
  '  You.',
  '',
  'before the game starts',
  '  change the player to Ringer',
  'end before',
  '',
].join('\n');

const compileWith = (body: string) => compile(`${HEADER}\n${body}\n`);
const codesOf = (result: ReturnType<typeof compile>) => result.diagnostics.map((d) => d.code);

describe('define sound: heard lines (GH #713)', () => {
  it('a block states both lines and they reach the IR', () => {
    const result = compileWith(
      [
        'define sound tolling from "audio/toll.ogg"',
        '  heard: The bell tolls, close and enormous.',
        '  heard from afar: A bell tolls somewhere above you.',
        'end sound',
      ].join('\n'),
    );
    expect(codesOf(result)).toEqual([]);
    if (!result.ok) throw new Error('expected a clean compile');
    expect(result.ir.sounds).toEqual([
      {
        name: 'tolling',
        heard: 'The bell tolls, close and enormous.',
        heardFromAfar: 'A bell tolls somewhere above you.',
      },
    ]);
  });

  it('a block on a sound with no file states one line', () => {
    const result = compileWith(['define sound creak', '  heard: A board creaks.', 'end sound'].join('\n'));
    expect(codesOf(result)).toEqual([]);
    if (!result.ok) throw new Error('expected a clean compile');
    expect(result.ir.sounds).toEqual([{ name: 'creak', heard: 'A board creaks.' }]);
  });

  it('the one-line forms still compile and carry no heard line', () => {
    const result = compileWith(['define sound catch from "audio/catch.ogg"', '', 'define sound hum'].join('\n'));
    expect(codesOf(result)).toEqual([]);
    if (!result.ok) throw new Error('expected a clean compile');
    expect(result.ir.sounds).toEqual([{ name: 'catch' }, { name: 'hum' }]);
  });

  it('a story with no sound has no sounds field', () => {
    const result = compileWith('');
    if (!result.ok) throw new Error('expected a clean compile');
    expect(result.ir.sounds).toBeUndefined();
  });

  it('a repeated line is refused', () => {
    const result = compileWith(
      ['define sound tolling', '  heard: One.', '  heard: Two.', 'end sound'].join('\n'),
    );
    expect(codesOf(result)).toContain('parse.sound-heard-repeated');
  });

  it('a heard line with no text is refused', () => {
    const result = compileWith(['define sound tolling', '  heard:', 'end sound'].join('\n'));
    expect(codesOf(result)).toContain('parse.sound-heard');
  });

  it('a line that is not a heard line is refused', () => {
    const result = compileWith(['define sound tolling', '  loud: yes', 'end sound'].join('\n'));
    expect(codesOf(result)).toContain('parse.sound-body');
  });

  it('a block with no `end sound` is refused', () => {
    const result = compileWith(['define sound tolling', '  heard: One.'].join('\n'));
    expect(codesOf(result)).toContain('parse.sound-end');
  });
});

describe('emit: an event name is one word (GH #713)', () => {
  const rope = (emitLine: string) =>
    [
      'create the rope',
      '  a thing, singular, scenery, pullable',
      '  in the Belfry',
      '',
      '  A rope.',
      '',
      '  after the player pulling',
      `    ${emitLine}`,
      '  end after',
    ].join('\n');

  it('the hyphenated name compiles', () => {
    const result = compileWith(rope('emit media-sound-play with src "audio/toll.ogg"'));
    expect(codesOf(result)).toEqual([]);
    if (!result.ok) throw new Error('expected a clean compile');
    expect(JSON.stringify(result.ir)).toContain('"kind":"emit","event":"media-sound-play"');
  });

  it('several words are refused, with the hyphenated spelling offered', () => {
    const result = compileWith(rope('emit media sound play with src "audio/toll.ogg"'));
    const found = result.diagnostics.find((d) => d.code === 'parse.emit-name');
    expect(found).toBeDefined();
    expect(found!.message).toContain('emit media-sound-play');
  });
});
