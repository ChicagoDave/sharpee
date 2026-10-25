// packages/world-model/tests/unit/traits/noun-match.test.ts
//
// ADR-385 D1: one noun matcher. matchNoun decides whether a noun phrase
// names a naming surface, and how well (ADR-231 D3's tiers, unchanged);
// namingSurfaceOf builds the surface from the world (walls' per-side
// adjectives, the observer flag).

import { describe, it, expect } from 'vitest';
import {
  matchNoun,
  namingSurfaceOf,
  type NamingSurface
} from '../../../src/traits/identity/noun-match';
import { WorldModel } from '../../../src/world/WorldModel';
import { AuthorModel } from '../../../src/world/AuthorModel';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { EntityType } from '../../../src/entities/entity-types';

const surface = (over: Partial<NamingSurface> = {}): NamingSurface => ({
  name: 'brass key',
  aliases: [],
  adjectives: [],
  type: 'item',
  isObserver: false,
  ...over
});

const query = (text: string, articles: string[] = []) => ({ text, articles });

describe('matchNoun (ADR-385 D1, ADR-231 D3 tiers)', () => {
  it('matches the whole name at the exact tier', () => {
    expect(matchNoun(surface(), query('brass key'))).toEqual({ tier: 'exact', wordsMatched: 2 });
  });

  it('matches a whole alias or the type at the exact tier', () => {
    const s = surface({ aliases: ['latchkey'] });
    expect(matchNoun(s, query('latchkey'))).toEqual({ tier: 'exact', wordsMatched: 1 });
    expect(matchNoun(s, query('item'))).toEqual({ tier: 'exact', wordsMatched: 1 });
  });

  it('matches at the words tier when every content word is in the vocabulary', () => {
    expect(matchNoun(surface(), query('key'))).toEqual({ tier: 'words', wordsMatched: 1 });
    expect(matchNoun(surface({ aliases: ['old key'] }), query('old brass'))).toEqual({ tier: 'words', wordsMatched: 2 });
  });

  it('counts adjectives in the words-tier vocabulary', () => {
    expect(matchNoun(surface({ name: 'key', adjectives: ['rusty'] }), query('rusty key'))).toEqual({ tier: 'words', wordsMatched: 2 });
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
    expect(matchNoun(grail, query('grail', ['the']))).toEqual({ tier: 'exact', wordsMatched: 1 });
    expect(matchNoun(surface({ name: 'grail' }), query('grail', ['the']))).toEqual({ tier: 'exact', wordsMatched: 1 });
  });

  it('names the observer by the self words, and nothing else by them', () => {
    expect(matchNoun(surface({ name: 'Alex', isObserver: true }), query('myself'))).toEqual({ tier: 'exact', wordsMatched: 1 });
    expect(matchNoun(surface({ name: 'Alex', isObserver: false }), query('myself'))).toBeNull();
  });

  it('matches nothing for an empty phrase', () => {
    expect(matchNoun(surface(), query('  '))).toBeNull();
  });
});

describe('namingSurfaceOf (ADR-385 D1)', () => {
  const build = () => {
    const world = new WorldModel();
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
      type: 'item',
      isObserver: false
    });
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
