/**
 * @file A seated noun phrase names the slot it filled
 * @description Parser review C1: the parser records on each noun phrase the
 * matched rule's slot name (`INounPhrase.slot`), whichever seat the phrase
 * goes to, so dispatch can bind both objects by name. Asserts the parsed
 * command's structure for a two-noun rule, a rule whose first slot is not
 * its direct object, and an instrument.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { vocabularyRegistry } from '@sharpee/if-domain';

const things = ['coat', 'peg', 'bob', 'coin', 'branch', 'knife'].map((name) => ({
  id: name,
  name,
  attributes: { name },
  visible: true,
  portable: true,
}));

/** A room holding every thing the rules name. */
class Room {
  getEntity(id: string) {
    return things.find((t) => t.id === id);
  }
  getAllEntities() {
    return things;
  }
  getVisibleEntities() {
    return things;
  }
  getTouchableEntities() {
    return things;
  }
  getCarriedEntities() {
    return [];
  }
  getVisible() {
    return things;
  }
  getReachable() {
    return things;
  }
  getCarriedAndWorn() {
    return { carried: [], worn: [] };
  }
}

describe('a seated noun phrase names its slot', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    vocabularyRegistry.clear();
    parser = new EnglishParser(new EnglishLanguageProvider());
    parser.setWorldContext(new Room(), 'player', 'room');
    const grammar = parser.getStoryGrammar();
    grammar.define('hang :item on :hook').mapsTo('story.action.hang').build();
    grammar.define('slice :branch with :blade').instrument('blade').mapsTo('story.action.slice').build();
  });

  it('a two-noun rule names the direct object `item` and the indirect `hook`', () => {
    const result = parser.parse('hang coat on peg');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.structure.directObject?.text).toBe('coat');
      expect(result.value.structure.directObject?.slot).toBe('item');
      expect(result.value.structure.indirectObject?.text).toBe('peg');
      expect(result.value.structure.indirectObject?.slot).toBe('hook');
    }
  });

  it('a seat chosen by a special case still names the slot (`give :recipient :item`)', () => {
    const result = parser.parse('give bob coin');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.structure.directObject?.text).toBe('coin');
      expect(result.value.structure.directObject?.slot).toBe('item');
      expect(result.value.structure.indirectObject?.text).toBe('bob');
      expect(result.value.structure.indirectObject?.slot).toBe('recipient');
    }
  });

  it('an instrument names its slot too', () => {
    const result = parser.parse('slice branch with knife');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.structure.directObject?.slot).toBe('branch');
      expect(result.value.instrument?.text).toBe('knife');
      expect(result.value.instrument?.slot).toBe('blade');
    }
  });
});
