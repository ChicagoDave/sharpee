/**
 * @file Articles and determiners are split once, by the English parser (ADR-385 D2)
 * @description Every noun phrase the parser builds carries its leading articles
 *   in `articles`, its leading determiners in `determiners`, and only the
 *   content words in `text`, `head` and `modifiers`. `my` marks the phrase as
 *   the actor's own. The all-phrase and the except marker come from the
 *   language's word lists, so `everything` is `all`, and `all` followed by
 *   noun words keeps them as its noun. A pronoun is a pronoun only as the
 *   whole item; followed by a noun word it is a determiner (`her key`).
 *   `INounPhrase.candidates` no longer exists.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { vocabularyRegistry } from '@sharpee/if-domain';
import { getPronounContextManager } from '../src/pronoun-context';

/** A world of named things for the pronoun manager: actors carry a pronoun set, things take `it`. */
const fakeWorld = {
  getEntity(id: string) {
    const actors: Record<string, string> = { 'npc-1': 'her' };
    if (actors[id]) {
      return { id, get: (type: string) => (type === 'actor' ? { pronouns: { object: actors[id] } } : undefined) };
    }
    return { id, get: (type: string) => (type === 'identity' ? { grammaticalNumber: 'singular' } : undefined) };
  }
};
const remember = (entityId: string, text: string) => getPronounContextManager()!.registerEntity(entityId, text, fakeWorld, 1);

describe('ADR-385 D2: the English parser splits articles and determiners once', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    vocabularyRegistry.clear();
    parser = new EnglishParser(new EnglishLanguageProvider());
  });

  const direct = (input: string) => {
    const result = parser.parse(input);
    expect(result.success, input).toBe(true);
    if (!result.success) throw new Error(input);
    return result.value.structure.directObject!;
  };

  it('splits "the old brass key" into its article, modifiers and head', () => {
    const np = direct('take the old brass key');
    expect(np.articles).toEqual(['the']);
    expect(np.determiners).toEqual([]);
    expect(np.text).toBe('old brass key');
    expect(np.head).toBe('key');
    expect(np.modifiers).toEqual(['old', 'brass']);
    expect('candidates' in np).toBe(false);
  });

  it('splits "my lantern" into the determiner and the noun, marked as the actor\'s own', () => {
    const np = direct('take my lantern');
    expect(np.articles).toEqual([]);
    expect(np.determiners).toEqual(['my']);
    expect(np.text).toBe('lantern');
    expect(np.head).toBe('lantern');
    expect(np.modifiers).toEqual([]);
    expect(np.ownedByActor).toBe(true);
  });

  it('reads "her key" as a determiner and a noun, not as a pronoun, even with a pronoun context', () => {
    remember('npc-1', 'Mara');
    const np = direct('take her key');
    expect(np.determiners).toEqual(['her']);
    expect(np.text).toBe('key');
    expect(np.head).toBe('key');
    expect(np.wasPronoun).toBeUndefined();
    expect(np.ownedByActor).toBeUndefined();
  });

  it('keeps a pronoun that is the whole item a pronoun', () => {
    remember('lamp-1', 'brass lamp');
    const np = direct('take it');
    expect(np.wasPronoun).toBe(true);
    expect(np.entityId).toBe('lamp-1');
  });

  it('keeps a pronoun followed by an article a pronoun, so a two-slot rule still seats both', () => {
    remember('npc-1', 'Mara');
    const result = parser.parse('give her the key');
    expect(result.success).toBe(true);
    if (!result.success) return;
    const { directObject, indirectObject } = result.value.structure;
    expect(indirectObject?.wasPronoun).toBe(true);
    expect(directObject?.text).toBe('key');
    expect(directObject?.articles).toEqual(['the']);
  });

  it('reads "everything" as the all-phrase from the language\'s all words', () => {
    const np = direct('take everything');
    expect(np.isAll).toBe(true);
    expect(np.determiners).toEqual(['everything']);
    expect(np.text).toBe('');
  });

  it('keeps the noun words after "all" as the all-phrase\'s noun', () => {
    const np = direct('take all coins');
    expect(np.isAll).toBe(true);
    expect(np.determiners).toEqual(['all']);
    expect(np.text).toBe('coins');
    expect(np.head).toBe('coins');
    const withArticle = direct('take all the gold coins');
    expect(withArticle.isAll).toBe(true);
    expect(withArticle.articles).toEqual(['the']);
    expect(withArticle.text).toBe('gold coins');
    expect(withArticle.modifiers).toEqual(['gold']);
  });

  it('splits each exclusion after an except word from the language', () => {
    const result = parser.parse('take all except the brass lantern and my sword');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.structure.directObject?.isAll).toBe(true);
    const excluded = result.value.excluded!;
    expect(excluded).toHaveLength(2);
    expect(excluded[0].articles).toEqual(['the']);
    expect(excluded[0].text).toBe('brass lantern');
    expect(excluded[0].head).toBe('lantern');
    expect(excluded[1].determiners).toEqual(['my']);
    expect(excluded[1].text).toBe('sword');
    expect(excluded[1].ownedByActor).toBe(true);
  });

  it('splits each item of a list', () => {
    const np = direct('take the sword and my lantern');
    expect(np.isList).toBe(true);
    const [sword, lantern] = np.items!;
    expect(sword.articles).toEqual(['the']);
    expect(sword.text).toBe('sword');
    expect(lantern.determiners).toEqual(['my']);
    expect(lantern.text).toBe('lantern');
    expect(lantern.ownedByActor).toBe(true);
  });

  it('keeps the last word when a phrase is nothing but articles and determiners', () => {
    const np = direct('take the');
    expect(np.text).toBe('the');
    expect(np.articles).toEqual([]);
  });

  it('gives the parsed topic its verbatim text and the split phrase', () => {
    const result = parser.parse('ask hermit about the ancient door');
    expect(result.success).toBe(true);
    if (!result.success) return;
    const topic = result.value.topic!;
    expect(topic.text).toBe('the ancient door');
    expect(topic.phrase.articles).toEqual(['the']);
    expect(topic.phrase.text).toBe('ancient door');
    expect(topic.phrase.head).toBe('door');
    expect(topic.phrase.modifiers).toEqual(['ancient']);
  });
});
