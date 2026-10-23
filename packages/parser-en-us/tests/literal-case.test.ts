/**
 * @file A pattern's literal words match whatever case the author wrote them in
 * @description Parser review B3: the engine matches literals against the
 * lowercased input, so the pattern compiler lowercases every literal and
 * alternate. A TS story's `define('XYZZY')` and a mixed-case `Zap :target`
 * match typed input; slot names keep their case. Asserts the parse.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { vocabularyRegistry } from '@sharpee/if-domain';

const book = { id: 'book', name: 'book', attributes: { name: 'book' }, visible: true, portable: true };

/** A room holding a book. */
class Room {
  getEntity(id: string) {
    return id === 'book' ? book : undefined;
  }
  getAllEntities() {
    return [book];
  }
  getVisibleEntities() {
    return [book];
  }
  getTouchableEntities() {
    return [book];
  }
  getCarriedEntities() {
    return [];
  }
  getVisible() {
    return [book];
  }
  getReachable() {
    return [book];
  }
  getCarriedAndWorn() {
    return { carried: [], worn: [] };
  }
}

describe('a literal written in capitals matches typed input', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    vocabularyRegistry.clear();
    parser = new EnglishParser(new EnglishLanguageProvider());
    parser.setWorldContext(new Room(), 'player', 'room');
    const grammar = parser.getStoryGrammar();
    grammar.define('XYZZY').mapsTo('story.action.magic').build();
    grammar.define('Zap :Target').mapsTo('story.action.zap').build();
    grammar.define('Plugh|PLOVER').mapsTo('story.action.plugh').build();
    grammar.define('Blast [Now] :Target').mapsTo('story.action.blast').build();
    grammar.define('Fizz [Quickly|SLOWLY] :Target').mapsTo('story.action.fizz').build();
  });

  it.each(['blast book', 'blast now book'])('a capitalized optional literal matches `%s`', (input) => {
    const result = parser.parse(input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.action).toBe('story.action.blast');
  });

  it.each(['fizz quickly book', 'fizz slowly book'])('a capitalized optional alternate matches `%s`', (input) => {
    const result = parser.parse(input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.action).toBe('story.action.fizz');
  });

  it.each(['xyzzy', 'XYZZY', 'Xyzzy'])('`define(\'XYZZY\')` matches `%s`', (input) => {
    const result = parser.parse(input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.action).toBe('story.action.magic');
  });

  it('a mixed-case verb matches, and its slot keeps the name the author wrote', () => {
    const result = parser.parse('zap book');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('story.action.zap');
      expect(result.value.structure.directObject?.slot).toBe('Target');
    }
  });

  it.each(['plugh', 'plover'])('a capitalized alternate matches `%s`', (input) => {
    const result = parser.parse(input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.action).toBe('story.action.plugh');
  });
});
