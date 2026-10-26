/**
 * language-words.test.ts — the world carries its language's words, assigned at
 * install; the matcher reads them from the surface (ADR-387 D2).
 *
 * World-model declares the roles (`LanguageWords`) and holds no English: the
 * self words and the name stopwords are whatever the language assigned. A
 * world that was never given its words refuses to derive a name rather than
 * matching with empty lists.
 */
import { describe, it, expect } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { EntityType } from '../../../src/entities/entity-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { matchNoun, namingSurfaceOf, vocabularyOf } from '../../../src/traits/identity/noun-match';
import { deriveNameVocabulary } from '../../../src/traits/identity/name-vocabulary';
import { addPlayerRoleVocabulary, movePlayerRoleVocabulary } from '../../../src/traits/actor/playerRole';

const ENGLISH = { selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] } as const;
const FRENCH = { selfWords: ['moi', 'moi-même'], nameStopwords: ['le', 'la', 'les', 'de'] } as const;

function worldWith(words: { selfWords: readonly string[]; nameStopwords: readonly string[] } | null) {
  const world = new WorldModel();
  if (words) world.setLanguageWords(words);
  const room = world.createEntity('Room', EntityType.ROOM);
  const player = world.createEntity('Alex', EntityType.ACTOR);
  const bag = world.createEntity('the bag of holding', EntityType.ITEM);
  world.moveEntity(player.id, room.id);
  world.moveEntity(bag.id, room.id);
  return { world, player, bag };
}

describe('ADR-387 D2: the world carries its language words', () => {
  it('refuses to derive a naming surface on a world that was never given its words, naming the install seam', () => {
    const { world, bag, player } = worldWith(null);
    expect(() => world.getLanguageWords()).toThrow(/installStory/);
    expect(() => namingSurfaceOf(world, bag, player.id)).toThrow(/installStory/);
    expect(() => namingSurfaceOf(world, bag, player.id)).toThrow(/setLanguageWords/);
  });

  it('returns the words it was given', () => {
    const { world } = worldWith(ENGLISH);
    expect(world.getLanguageWords()).toEqual(ENGLISH);
  });

  it('puts the words on every surface, so the matcher reads the self words from the surface', () => {
    const { world, player } = worldWith(FRENCH);
    const surface = namingSurfaceOf(world, player, player.id);
    expect(surface.words).toEqual(FRENCH);
    expect(surface.isObserver).toBe(true);
    expect(matchNoun(surface, { text: 'moi' })).toEqual({ tier: 'exact', wordsMatched: 1 });
    expect(matchNoun(surface, { text: 'me' })).toBeNull();
  });

  it('does not let the self words name anyone but the observer', () => {
    const { world, bag, player } = worldWith(ENGLISH);
    expect(matchNoun(namingSurfaceOf(world, bag, player.id), { text: 'me' })).toBeNull();
  });

  it('derives name vocabulary with the stopwords it is handed, and with none when handed none', () => {
    expect(deriveNameVocabulary('the bag of holding', ENGLISH.nameStopwords)).toEqual(['bag', 'holding']);
    expect(deriveNameVocabulary('the bag of holding', [])).toEqual(['the', 'bag', 'of', 'holding']);
    expect(deriveNameVocabulary('le sac de voyage', FRENCH.nameStopwords)).toEqual(['sac', 'voyage']);
  });

  it('builds a surface\'s vocabulary with the surface\'s own stopwords', () => {
    const { world, bag, player } = worldWith(ENGLISH);
    const surface = namingSurfaceOf(world, bag, player.id);
    expect([...vocabularyOf(surface)]).toEqual(['bag', 'holding']);
    expect(matchNoun(surface, { text: 'bag of holding', articles: ['the'] })).toEqual({ tier: 'exact', wordsMatched: 2 });
    expect(matchNoun(surface, { text: 'holding' })).toEqual({ tier: 'words', wordsMatched: 1 });
  });

  it('stamps the player role\'s aliases from the self words it is handed, and moves them on a switch', () => {
    const { world, player } = worldWith(FRENCH);
    const other = world.createEntity('Benoît', EntityType.ACTOR);
    player.add(new IdentityTrait({ name: 'Alex' }));
    other.add(new IdentityTrait({ name: 'Benoît' }));
    addPlayerRoleVocabulary(player, FRENCH.selfWords);
    expect(player.getTrait(IdentityTrait)!.aliases).toEqual(expect.arrayContaining(['moi', 'moi-même']));
    movePlayerRoleVocabulary(player, other, FRENCH.selfWords);
    expect(player.getTrait(IdentityTrait)!.aliases).not.toContain('moi');
    expect(other.getTrait(IdentityTrait)!.aliases).toEqual(expect.arrayContaining(['moi', 'moi-même']));
  });
});
