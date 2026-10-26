/**
 * @file The parse-time gate asks the one noun matcher (ADR-385 D3, D4, D6)
 * @description Against a REAL WorldModel: a constrained slot admits the
 *   entities of its scope base that `matchNoun` names (no substring, so `ice`
 *   never passes through "dice"; an adjective admits); the admitted ids
 *   travel on the noun phrase as `scope`; a pronoun passes the same gate (a
 *   pronoun whose entity is outside the base fails the slot), and a list
 *   item may be a pronoun.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel, IFEntity, RoomTrait, ActorTrait, ContainerTrait, IdentityTrait } from '@sharpee/world-model';
import { type GrammarContext } from '@sharpee/if-domain';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '../src/english-parser';
import { GrammarScopeResolver } from '../src/grammar-scope-resolver';

/** English, handed to hand-built worlds as the language's words (ADR-387 D2). */
const ENGLISH_WORDS = { selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] };

describe('the gate asks the matcher (ADR-385 D3, D4, D6)', () => {
  let world: WorldModel;
  let parser: EnglishParser;
  let room: IFEntity;
  let player: IFEntity;
  let dice: IFEntity;
  let brassClock: IFEntity;
  let wallClock: IFEntity;
  let spool: IFEntity;
  let latchkey: IFEntity;
  let box: IFEntity;

  const thing = (name: string, identity: Partial<IdentityTrait> = {}): IFEntity => {
    const entity = world.createEntity(name, 'item');
    entity.add(new IdentityTrait({ name, ...identity }));
    return entity;
  };

  beforeEach(() => {
    world = new WorldModel();
    world.setLanguageWords(ENGLISH_WORDS);
    room = world.createEntity('Workshop', 'room');
    room.add(new RoomTrait());
    room.add(new ContainerTrait());
    player = world.createEntity('Alex', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());
    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);

    dice = thing('pair of dice', { aliases: ['dice'] });
    brassClock = thing('clock', { adjectives: ['brass'] });
    wallClock = thing('wall clock');
    spool = thing('spool');
    latchkey = thing('latchkey');
    box = thing('box');
    world.moveEntity(dice.id, player.id);
    world.moveEntity(brassClock.id, player.id);
    world.moveEntity(wallClock.id, room.id);
    world.moveEntity(latchkey.id, room.id);
    world.moveEntity(box.id, room.id);
    // the spool is unplaced

    parser = new EnglishParser(new EnglishLanguageProvider());
    parser.setWorldContext(world, player.id, room.id);
    parser.getStoryGrammar().define('wind :target').where('target', (s) => s.carried()).mapsTo('story.winding').build();
  });

  const remember = (entity: IFEntity) => parser.getPronounContextManager().registerEntity(entity.id, entity.name, world, 1);

  it('rejects a substring: `wind ice` with the dice held does not match the held-only rule', () => {
    expect(parser.parse('wind ice').success).toBe(false);
    expect(parser.parse('wind dice').success).toBe(true);
  });

  it('admits by adjective, as the validator does: `wind brass clock` and `wind brass`', () => {
    const full = parser.parse('wind brass clock');
    expect(full.success).toBe(true);
    const adjectiveOnly = parser.parse('wind brass');
    expect(adjectiveOnly.success).toBe(true);
  });

  it('records the admitted ids on the noun phrase: `wind clock` names only the held clock', () => {
    const result = parser.parse('wind clock');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.structure.directObject?.scope).toEqual([brassClock.id]);
  });

  it('leaves `scope` off a phrase from an unconstrained slot', () => {
    const result = parser.parse('take clock');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.structure.directObject?.scope).toBeUndefined();
  });

  it('a pronoun passes the gate: `wind it` with `it` the unplaced spool fails the slot', () => {
    remember(spool);
    expect(parser.parse('wind it').success).toBe(false);
  });

  it('a pronoun passes the gate: `wind it` with `it` the held clock matches', () => {
    remember(brassClock);
    const result = parser.parse('wind it');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.structure.directObject?.entityId).toBe(brassClock.id);
    expect(result.value.structure.directObject?.wasPronoun).toBe(true);
  });

  it('a list item may be a pronoun: `take it and the box`', () => {
    remember(latchkey);
    const result = parser.parse('take it and the box');
    expect(result.success).toBe(true);
    if (!result.success) return;
    const dobj = result.value.structure.directObject!;
    expect(dobj.isList).toBe(true);
    expect(dobj.items).toHaveLength(2);
    expect(dobj.items![0].entityId).toBe(latchkey.id);
    expect(dobj.items![1].text).toBe('box');
    expect(dobj.items![1].articles).toEqual(['the']);
  });

  it('findEntitiesByName tries the phrase with its articles restored, so "The Grail" matches `the grail`', () => {
    const grail = thing('The Grail');
    world.moveEntity(grail.id, room.id);
    const context: GrammarContext = { world, actorId: player.id, currentLocation: room.id, slots: new Map() };
    const constraint = { base: 'visible' as const, filters: [], traitFilters: [], explicitEntities: [] };
    const found = GrammarScopeResolver.findEntitiesByName({ text: 'grail', articles: ['the'] }, constraint, context);
    expect(found.map((e) => e.id)).toEqual([grail.id]);
  });
});
