/**
 * @file Entity slot constraints decide a match by pass or fail
 * @description A constrained entity slot matches only text an in-scope entity
 * answers to. A list slot matches only when every item does, and of two
 * consecutive slots the first takes the shortest phrase its constraint
 * accepts. Since ADR-384 D1 the check is a plain pass or fail, with no
 * confidence; these tests pin both rejection paths through the real parser.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { ParserLanguageProvider, GrammarBuilder, ScopeBuilder } from '@sharpee/if-domain';
import { WorldModel, type IFEntity } from '@sharpee/world-model';

/** English, handed to hand-built worlds as the language's words (ADR-387 D2). */
const ENGLISH_WORDS = { selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] };

/**
 * A real entity (the gate reads its naming surface through the one noun
 * matcher, ADR-385 D3) carrying the flags the mock world's property filters
 * read.
 */
type MockEntity = IFEntity & { visible: boolean; magical?: boolean; creature?: boolean };
const scratch = new WorldModel();
scratch.setLanguageWords(ENGLISH_WORDS);
const thing = (name: string, flags: { visible: boolean; magical?: boolean; creature?: boolean }): MockEntity =>
  Object.assign(scratch.createEntity(name, 'item'), flags) as MockEntity;

const languageProvider: ParserLanguageProvider = {
  getVerbs: () => [],
  getNouns: () => [],
  getAdjectives: () => [],
  getPrepositions: () => ['at', 'with', 'from', 'to'],
  getDeterminers: () => [{ word: 'the' }, { word: 'a' }, { word: 'an' }],
  getSpecialVocabulary: () => ({ articles: ['a', 'an', 'the'], pronouns: ['it', 'them', 'him', 'her'], allWords: ['all', 'everything'], exceptWords: ['except', 'but'] }),
  getLanguageWords: () => ({ selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] }),
  getListSeparators: () => ['and', ','],
  getMannerAdverbs: () => [],
  parseCardinal: (words: readonly string[]) => (words.length === 1 && /^\d+$/.test(words[0]) ? Number(words[0]) : null),
  getOrdinalNumbers: () => ({}),
  getNarrativePerson: () => 'second' as const,
  getConjunctions: () => ['and', 'or'],
  getNumbers: () => [],
  getSpecialWords: () => [],
  getDirections: () => []
};

/** A crystal and an orb (magical), a sword (not), a dragon (a creature), all visible */
class MockWorldModel {
  getLanguageWords() {
    return { selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] };
  }
  private entities = new Map<string, MockEntity>(
    [
      thing('crystal', { visible: true, magical: true }),
      thing('orb', { visible: true, magical: true }),
      thing('sword', { visible: true }),
      thing('dragon', { visible: true, creature: true })
    ].map((e) => [e.id, e])
  );

  getEntity(id: string): MockEntity | undefined {
    return this.entities.get(id);
  }

  getVisible(): MockEntity[] {
    return [...this.entities.values()].filter((e) => e.visible);
  }

  getReachable(): MockEntity[] {
    return this.getVisible();
  }

  getCarriedAndWorn(): { carried: MockEntity[]; worn: MockEntity[] } {
    return { carried: [], worn: [] };
  }
}

describe('entity slot constraints', () => {
  let parser: EnglishParser;
  let grammar: GrammarBuilder;

  beforeEach(() => {
    parser = new EnglishParser(languageProvider);
    grammar = parser.getStoryGrammar();
    parser.setWorldContext(new MockWorldModel(), 'player', 'room');
  });

  describe('a list slot', () => {
    beforeEach(() => {
      grammar
        .define('enchant :things')
        .where('things', (scope: ScopeBuilder) => scope.visible().matching({ magical: true }))
        .mapsTo('story.action.enchanting')
        .build();
    });

    it('matches when every item satisfies the constraint', () => {
      const result = parser.parse('enchant crystal and orb');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('story.action.enchanting');
      }
    });

    it('does not match when one item fails the constraint', () => {
      const result = parser.parse('enchant crystal and sword');
      expect(result.success).toBe(false);
    });
  });

  describe('two consecutive slots', () => {
    beforeEach(() => {
      grammar
        .define('bewitch :charm :beast')
        .where('charm', (scope: ScopeBuilder) => scope.visible().matching({ magical: true }))
        .where('beast', (scope: ScopeBuilder) => scope.visible().matching({ creature: true }))
        .mapsTo('story.action.bewitching')
        .build();
    });

    it('splits where the first slot\'s constraint is first satisfied', () => {
      const result = parser.parse('bewitch crystal dragon');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('story.action.bewitching');
        expect(result.value.structure.directObject?.text).toBe('crystal');
        expect(result.value.structure.indirectObject?.text).toBe('dragon');
      }
    });

    it('does not match when no prefix satisfies the first slot', () => {
      const result = parser.parse('bewitch sword dragon');
      expect(result.success).toBe(false);
    });
  });
});
