// packages/world-model/tests/unit/traits/noun-match.test.ts
//
// ADR-385 D1: one noun matcher. matchNoun decides whether a noun phrase
// names a naming surface, and how well (ADR-231 D3's tiers, unchanged);
// namingSurfaceOf builds the surface from the world (walls' per-side
// adjectives, the observer flag).

import { describe, it, expect } from 'vitest';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import {
  matchNoun,
  namingFormsOf,
  namingSurfaceOf,
  type NamingSurface
} from '../../../src/traits/identity/noun-match';
import { WorldModel } from '../../../src/world/WorldModel';
import { AuthorModel } from '../../../src/world/AuthorModel';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { EntityType } from '../../../src/entities/entity-types';

/** English, handed in as the language's words (ADR-387 D2); world-model holds none. */
const WORDS = { selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] };

const surface = (over: Partial<NamingSurface> = {}): NamingSurface => ({
  name: 'brass key',
  aliases: [],
  adjectives: [],
  writtenForms: [],
  workedOutForms: [],
  type: 'item',
  isObserver: false,
  words: WORDS,
  ...over
});

const query = (text: string, articles: string[] = []) => ({ text, articles });

describe('matchNoun (ADR-385 D1, ADR-231 D3 tiers)', () => {
  it('matches the whole name at the exact tier', () => {
    expect(matchNoun(surface(), query('brass key'))).toEqual({ tier: 'exact', wordsMatched: 2, workedOutWords: 0 });
  });

  it('matches a whole alias or the type at the exact tier', () => {
    const s = surface({ aliases: ['latchkey'] });
    expect(matchNoun(s, query('latchkey'))).toEqual({ tier: 'exact', wordsMatched: 1, workedOutWords: 0 });
    expect(matchNoun(s, query('item'))).toEqual({ tier: 'exact', wordsMatched: 1, workedOutWords: 0 });
  });

  it('matches at the words tier when every content word is in the vocabulary', () => {
    expect(matchNoun(surface(), query('key'))).toEqual({ tier: 'words', wordsMatched: 1, workedOutWords: 0 });
    expect(matchNoun(surface({ aliases: ['old key'] }), query('old brass'))).toEqual({ tier: 'words', wordsMatched: 2, workedOutWords: 0 });
  });

  it('counts adjectives in the words-tier vocabulary', () => {
    expect(matchNoun(surface({ name: 'key', adjectives: ['rusty'] }), query('rusty key'))).toEqual({ tier: 'words', wordsMatched: 2, workedOutWords: 0 });
  });

  it('disqualifies when any content word matches nothing', () => {
    expect(matchNoun(surface(), query('brass sword'))).toBeNull();
    expect(matchNoun(surface(), query('ice'))).toBeNull();
  });

  it('gives more matched words to the more specific phrase within a tier', () => {
    const two = matchNoun(surface({ name: 'small brass key' }), query('brass key'))!;
    const one = matchNoun(surface({ name: 'small brass key' }), query('key'))!;
    expect(two.tier).toBe('words');
    expect(two.wordsMatched).toBeGreaterThan(one.wordsMatched);
  });

  it('tries the phrase with its leading articles restored first, so a name beginning with one matches exactly', () => {
    const grail = surface({ name: 'The Grail' });
    expect(matchNoun(grail, query('grail', ['the']))).toEqual({ tier: 'exact', wordsMatched: 1, workedOutWords: 0 });
    expect(matchNoun(surface({ name: 'grail' }), query('grail', ['the']))).toEqual({ tier: 'exact', wordsMatched: 1, workedOutWords: 0 });
  });

  it('names the observer by the self words, and nothing else by them', () => {
    expect(matchNoun(surface({ name: 'Alex', isObserver: true }), query('myself'))).toEqual({ tier: 'exact', wordsMatched: 1, workedOutWords: 0 });
    expect(matchNoun(surface({ name: 'Alex', isObserver: false }), query('myself'))).toBeNull();
  });

  it('matches nothing for an empty phrase', () => {
    expect(matchNoun(surface(), query('  '))).toBeNull();
  });
});

describe('matchNoun over forms (ADR-409 D3, D4)', () => {
  it('matches a written form as a whole phrase at the exact tier, and its words at the words tier', () => {
    const cacti = surface({ name: 'cacti', writtenForms: ['cactus'] });
    expect(matchNoun(cacti, query('cactus'))).toEqual({ tier: 'exact', wordsMatched: 1, workedOutWords: 0 });
    const smokers = surface({ name: 'bee smokers', writtenForms: ['bee smoker'] });
    expect(matchNoun(smokers, query('smoker'))).toEqual({ tier: 'words', wordsMatched: 1, workedOutWords: 0 });
  });

  it('matches a worked-out form at the words tier only, counting the words only it supplied', () => {
    const candles = surface({ name: 'brass candles', workedOutForms: ['brass candle'] });
    expect(matchNoun(candles, query('candle'))).toEqual({ tier: 'words', wordsMatched: 1, workedOutWords: 1 });
    // The whole worked-out phrase is still the words tier, and `brass` is written.
    expect(matchNoun(candles, query('brass candle'))).toEqual({ tier: 'words', wordsMatched: 2, workedOutWords: 1 });
    expect(matchNoun(candles, query('brass candles'))).toEqual({ tier: 'exact', wordsMatched: 2, workedOutWords: 0 });
  });

  it('counts a word the author also wrote as written, not worked out', () => {
    const jars = surface({ name: 'jars', aliases: ['jar'], workedOutForms: ['jar'] });
    expect(matchNoun(jars, query('jar'))).toEqual({ tier: 'exact', wordsMatched: 1, workedOutWords: 0 });
  });

  it('matches nothing by a form the surface does not carry', () => {
    expect(matchNoun(surface({ name: 'candles' }), query('candle'))).toBeNull();
  });

  it('gives the written `buttons` a fully written match and the worked-out ones a worked-out match', () => {
    const panel = surface({ name: 'control panel', aliases: ['brass buttons'] });
    const red = surface({ name: 'red button', workedOutForms: ['red buttons'] });
    const blue = surface({ name: 'blue button', workedOutForms: ['blue buttons'] });
    expect(matchNoun(panel, query('buttons'))).toEqual({ tier: 'words', wordsMatched: 1, workedOutWords: 0 });
    expect(matchNoun(red, query('buttons'))).toEqual({ tier: 'words', wordsMatched: 1, workedOutWords: 1 });
    expect(matchNoun(blue, query('buttons'))).toEqual({ tier: 'words', wordsMatched: 1, workedOutWords: 1 });
  });
});

describe('namingFormsOf (ADR-409 D3)', () => {
  it('sorts a worked-out name form and the aka forms onto the worked-out list', () => {
    expect(
      namingFormsOf({
        name: 'jars',
        singular: 'jar',
        plural: 'jars',
        origin: 'worked-out',
        akaForms: [{ word: 'crocks', form: 'crock' }]
      })
    ).toEqual({ writtenForms: [], workedOutForms: ['jar', 'crock'] });
  });

  it('sorts a written name form onto the written list, and leaves aka forms worked out', () => {
    expect(
      namingFormsOf({
        name: 'cacti',
        singular: 'cactus',
        plural: 'cacti',
        origin: 'written',
        akaForms: [{ word: 'succulents', form: 'succulent' }]
      })
    ).toEqual({ writtenForms: ['cactus'], workedOutForms: ['succulent'] });
  });

  it('reads an unset origin as written, and adds nothing for a form equal to the name', () => {
    expect(namingFormsOf({ name: 'goose', plural: 'geese' })).toEqual({ writtenForms: ['geese'], workedOutForms: [] });
    expect(namingFormsOf({ name: 'sheep', singular: 'sheep', plural: 'sheep' })).toEqual({ writtenForms: [], workedOutForms: [] });
    expect(namingFormsOf({ name: 'lamp' })).toEqual({ writtenForms: [], workedOutForms: [] });
  });
});

describe('namingSurfaceOf (ADR-385 D1)', () => {
  const build = () => {
    const world = new WorldModel();
    world.setLanguageWords(WORDS);
    const author = new AuthorModel(world.getDataStore(), world);
    const room = (name: string) => {
      const r = author.createEntity(name, EntityType.ROOM);
      r.add({ type: TraitType.ROOM });
      return r;
    };
    const parlor = room('Parlor');
    const library = room('Library');
    const kitchen = room('Kitchen');
    const player = author.createEntity('yourself', EntityType.ACTOR);
    author.moveEntity(player.id, parlor.id);
    player.add(new ActorTrait({ isPlayable: true }));
    world.setPlayer(player.id);
    return { world, author, parlor, library, kitchen, player };
  };

  it('reads the name, aliases, adjectives and type from the entity', () => {
    const { world, author, player } = build();
    const key = author.createEntity('brass key', EntityType.ITEM);
    key.add(new IdentityTrait({ name: 'brass key', aliases: ['latchkey'], adjectives: ['shiny'] }));
    expect(namingSurfaceOf(world, key, player.id)).toEqual({
      name: 'brass key',
      aliases: ['latchkey'],
      adjectives: ['shiny'],
      writtenForms: [],
      workedOutForms: [],
      type: 'item',
      isObserver: false,
      words: WORDS
    });
  });

  it('puts the trait forms a Chord thing carries on the surface (ADR-409 D3)', () => {
    const { world, author, player } = build();
    const jars = author.createEntity('jars', EntityType.ITEM);
    jars.add(
      new IdentityTrait({
        name: 'jars',
        aliases: ['crocks'],
        singular: 'jar',
        plural: 'jars',
        nameFormOrigin: 'worked-out',
        akaForms: [{ word: 'crocks', form: 'crock' }]
      })
    );
    const surface = namingSurfaceOf(world, jars, player.id);
    expect(surface.writtenForms).toEqual([]);
    expect(surface.workedOutForms).toEqual(['jar', 'crock']);
    expect(matchNoun(surface, query('jar'))).toEqual({ tier: 'words', wordsMatched: 1, workedOutWords: 1 });
    expect(matchNoun(surface, query('crock'))).toEqual({ tier: 'words', wordsMatched: 1, workedOutWords: 1 });
  });

  it('answers to the plural a TypeScript author set on IdentityTrait, as written (ADR-409 AC-4)', () => {
    const { world, author, player } = build();
    const goose = author.createEntity('goose', EntityType.ITEM);
    goose.add(new IdentityTrait({ name: 'goose', plural: 'geese' }));
    const surface = namingSurfaceOf(world, goose, player.id);
    expect(surface.writtenForms).toEqual(['geese']);
    expect(matchNoun(surface, query('geese'))).toEqual({ tier: 'exact', wordsMatched: 1, workedOutWords: 0 });
  });

  it('flags the observer', () => {
    const { world, player } = build();
    expect(namingSurfaceOf(world, player, player.id).isObserver).toBe(true);
  });

  it('gives a wall the adjective of the side facing the observer, and none from elsewhere', () => {
    const { world, author, parlor, library, kitchen, player } = build();
    const wall = world.createWall({
      between: [parlor, library],
      sides: { [parlor.id]: { adjective: 'oak' }, [library.id]: { adjective: 'brick' } }
    });
    expect(namingSurfaceOf(world, wall, player.id).adjectives).toEqual(['oak']);
    author.moveEntity(player.id, library.id);
    expect(namingSurfaceOf(world, wall, player.id).adjectives).toEqual(['brick']);
    author.moveEntity(player.id, kitchen.id);
    expect(namingSurfaceOf(world, wall, player.id).adjectives).toEqual([]);
  });
});
