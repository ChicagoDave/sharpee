/**
 * adr-387-d1-language-table.test.ts — the parser reads its words from the
 * provider it was constructed with, never from lang-en-us data (ADR-387 D1).
 *
 * A provider whose articles are `le`, `la`, `les` changes how the parser
 * splits `prends la lampe` and how the compiler counts a pattern's required
 * tokens, with no code edit: the proof that the articles have one home.
 */
import { describe, it, expect } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { EnglishPatternCompiler } from '../src/english-pattern-compiler';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { WorldModel, EntityType } from '@sharpee/world-model';
import type { SpecialVocabulary } from '@sharpee/if-domain';


/** English in every respect but its articles and its self words. */
class FrenchArticlesProvider extends EnglishLanguageProvider {
  getSpecialVocabulary(): SpecialVocabulary {
    return { ...super.getSpecialVocabulary(), articles: ['le', 'la', 'les'] };
  }
  getLanguageWords() {
    return { selfWords: ['moi'], nameStopwords: ['le', 'la', 'les', 'de'] };
  }
}

function worldWithLamp(provider: EnglishLanguageProvider) {
  const world = new WorldModel();
  world.setLanguageWords(provider.getLanguageWords());
  const room = world.createEntity('Salle', EntityType.ROOM);
  const player = world.createEntity('you', EntityType.ACTOR);
  const lamp = world.createEntity('lampe', EntityType.ITEM);
  world.moveEntity(player.id, room.id);
  world.moveEntity(lamp.id, room.id);
  return { world, room, player, lamp };
}

describe('ADR-387 D1: the parser reads its words from its provider', () => {
  it('splits an article the provider declares, with no code edit', () => {
    const provider = new FrenchArticlesProvider();
    const parser = new EnglishParser(provider);
    const { world, room, player } = worldWithLamp(provider);
    parser.setWorldContext(world, player.id, room.id);
    parser.getStoryGrammar().define('prends :item').mapsTo('if.action.taking').build();

    const result = parser.parse('prends la lampe');
    expect(result.success, JSON.stringify(result)).toBe(true);
    if (!result.success) return;
    const item = result.value.structure.directObject!;
    expect(item.articles).toEqual(['la']);
    expect(item.text).toBe('lampe');
    expect(item.head).toBe('lampe');
  });

  it('does not treat the English article as one when the provider does not declare it', () => {
    const provider = new FrenchArticlesProvider();
    const parser = new EnglishParser(provider);
    const { world, room, player } = worldWithLamp(provider);
    parser.setWorldContext(world, player.id, room.id);
    parser.getStoryGrammar().define('prends :item').mapsTo('if.action.taking').build();

    const result = parser.parse('prends the lampe');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.structure.directObject!.articles).toEqual([]);
    expect(result.value.structure.directObject!.text).toBe('the lampe');
  });

  it('discounts the provider\'s pattern articles when counting required tokens (ADR-386 D7)', () => {
    const french = new EnglishPatternCompiler(new FrenchArticlesProvider());
    const english = new EnglishPatternCompiler(new EnglishLanguageProvider());
    expect(french.compile(french.parse('prends la chose')).minTokens).toBe(2);
    expect(english.compile(english.parse('prends la chose')).minTokens).toBe(3);
    expect(english.compile(english.parse('take the item')).minTokens).toBe(2);
  });

  it('skips a typed article the pattern does not spell only when the provider calls it one (ADR-386 D3)', () => {
    const provider = new FrenchArticlesProvider();
    const engine = new EnglishGrammarEngine(provider);
    const grammar = engine.createBuilder();
    grammar.define('monte corde').mapsTo('story.action.monter').build();
    const parser = new EnglishParser(provider);
    const { world, room, player } = worldWithLamp(provider);
    parser.setWorldContext(world, player.id, room.id);
    parser.getStoryGrammar().define('monte corde').mapsTo('story.action.monter').build();

    const withFrench = parser.parse('monte la corde');
    expect(withFrench.success && withFrench.value.action).toBe('story.action.monter');
    const withEnglish = parser.parse('monte the corde');
    expect(withEnglish.success).toBe(false);
  });
});
