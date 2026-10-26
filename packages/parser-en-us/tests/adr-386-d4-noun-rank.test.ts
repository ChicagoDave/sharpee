/**
 * adr-386-d4-noun-rank.test.ts — every reading is ranked by its nouns
 * (ADR-386 D4, D5). Against a REAL WorldModel: each entity item of a reading
 * is named through the one matcher over everything in the world, and the
 * engine ranks every reading of every rule by `{ unnamed, named, exact }`
 * with ADR-384's keys between: two names beat one, a reading with an item
 * naming nothing loses across rules whatever its specificity, an exact name
 * beats the same name at the words tier within a rule, a pronoun and an all
 * phrase are names, a topic contributes nothing, and a rule's furthest
 * failure carries the rank of the items it consumed. The parser then lets a
 * verb-matched failure outrank the best reading only when it names strictly
 * more.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel, IFEntity, RoomTrait, ActorTrait, ContainerTrait, IdentityTrait } from '@sharpee/world-model';
import { PartOfSpeech, type GrammarContext, type Token } from '@sharpee/if-domain';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { EnglishParser } from '../src/english-parser';
import { PronounContextManager } from '../src/pronoun-context';
import { failureOutranking, type PartialMatchFailure } from '../src/parse-failure';

/** English, handed to hand-built worlds as the language's words (ADR-387 D2). */
const ENGLISH_WORDS = { selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] };

const tokens = (text: string): Token[] =>
  text.split(' ').map((word, index) => ({
    word,
    normalized: word.toLowerCase(),
    position: index * 6,
    candidates: word === 'all' ? [{ partOfSpeech: PartOfSpeech.SPECIAL, mapsTo: 'ALL', priority: 0 }] : []
  }));

describe('ADR-386 D4: readings are ranked by their nouns', () => {
  let world: WorldModel;
  let player: IFEntity;
  let room: IFEntity;
  let context: GrammarContext;
  let engine: EnglishGrammarEngine;

  const thing = (name: string, identity: Partial<IdentityTrait> = {}): IFEntity => {
    const entity = world.createEntity(name, 'item');
    entity.add(new IdentityTrait({ name, ...identity }));
    world.moveEntity(entity.id, room.id);
    return entity;
  };

  const spans = (input: string) =>
    engine.findMatches(tokens(input), context).map((m) => ({
      action: m.rule.action,
      slots: Object.fromEntries([...m.slots.entries()].map(([k, v]) => [k, v.tokens])),
      rank: m.nounRank
    }));

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
    context = { world, actorId: player.id, currentLocation: room.id, slots: new Map() };
    engine = new EnglishGrammarEngine(new EnglishLanguageProvider());
  });

  it('two names beat one: give old man coin reads as old man + coin (A1)', () => {
    thing('old man');
    thing('gold coin', { aliases: ['coin'] });
    engine.createBuilder().define('give :recipient :item').mapsTo('if.action.giving').build();
    expect(spans('give old man coin')).toEqual([
      { action: 'if.action.giving', slots: { recipient: [1, 2], item: [3] }, rank: { unnamed: 0, named: 2, exact: 2 } },
      { action: 'if.action.giving', slots: { recipient: [1], item: [2, 3] }, rank: { unnamed: 1, named: 1, exact: 0 } }
    ]);
  });

  it('fewer items naming nothing wins across rules, before definition order', () => {
    thing('lamp');
    const grammar = engine.createBuilder();
    grammar.define('take :item').mapsTo('if.action.taking').build();
    grammar.define('take :item :how').topic('how').mapsTo('story.taking_somehow').build();
    const [best, next] = spans('take lamp carefully');
    expect(best).toEqual({ action: 'story.taking_somehow', slots: { item: [1], how: [2] }, rank: { unnamed: 0, named: 1, exact: 1 } });
    expect(next).toEqual({ action: 'if.action.taking', slots: { item: [1, 2] }, rank: { unnamed: 1, named: 0, exact: 0 } });
  });

  it('within a rule, an exact name beats the same name at the words tier', () => {
    thing('brass lamp');
    thing('lamp');
    engine.createBuilder().define('give :recipient :item').mapsTo('if.action.giving').build();
    const [best, next] = spans('give brass lamp lamp');
    expect(best).toEqual({ action: 'if.action.giving', slots: { recipient: [1, 2], item: [3] }, rank: { unnamed: 0, named: 2, exact: 2 } });
    expect(next).toEqual({ action: 'if.action.giving', slots: { recipient: [1], item: [2, 3] }, rank: { unnamed: 0, named: 2, exact: 0 } });
  });

  it('a pronoun with a referent and an all phrase are each one exact name', () => {
    const lamp = thing('lamp');
    // The engine's own pronoun context (ADR-387 D4): built with it, no module global
    const manager = new PronounContextManager();
    engine = new EnglishGrammarEngine(new EnglishLanguageProvider(), undefined, manager);
    manager.registerEntity(lamp.id, 'lamp', world);
    engine.createBuilder().define('take :item').mapsTo('if.action.taking').build();
    expect(spans('take it')[0].rank).toEqual({ unnamed: 0, named: 1, exact: 1 });
    expect(spans('take all')[0].rank).toEqual({ unnamed: 0, named: 1, exact: 1 });
  });

  it('a topic contributes nothing and an item naming nothing is unnamed', () => {
    const grammar = engine.createBuilder();
    grammar.define('scan :word').topic('word').mapsTo('story.scanning').build();
    grammar.define('take :item').mapsTo('if.action.taking').build();
    expect(spans('scan shelves')[0].rank).toEqual({ unnamed: 0, named: 0, exact: 0 });
    expect(spans('take widget')[0].rank).toEqual({ unnamed: 1, named: 0, exact: 0 });
  });

  it('a list names each item and an exclusion is an item too', () => {
    thing('sword');
    thing('lantern');
    engine.createBuilder().define('take :item').mapsTo('if.action.taking').build();
    expect(spans('take sword and lantern')[0].rank).toEqual({ unnamed: 0, named: 2, exact: 2 });
    expect(spans('take sword and widget')[0].rank).toEqual({ unnamed: 1, named: 1, exact: 1 });
  });

  it('a gated item is named by its admitted ids', () => {
    const dice = thing('pair of dice', { aliases: ['dice'] });
    world.moveEntity(dice.id, player.id);
    thing('old man');
    engine.createBuilder().define('offer :recipient :item').where('item', (s) => s.carried()).mapsTo('story.offering').build();
    const [best] = spans('offer old man dice');
    expect(best.slots).toEqual({ recipient: [1, 2], item: [3] });
    expect(best.rank).toEqual({ unnamed: 0, named: 2, exact: 2 });
  });

  it("a rule's furthest failure carries the rank of the items it consumed (D5)", () => {
    thing('door');
    engine.createBuilder().define('unlock :target with :key').mapsTo('if.action.unlocking').build();
    expect(engine.findMatches(tokens('unlock door with'), context)).toHaveLength(0);
    const failure = engine.getLastFailures()[0];
    expect(failure.nounRank).toEqual({ unnamed: 0, named: 1, exact: 1 });
  });

  it('without a world the rank is neutral, so ADR-384 keys and search order decide as before', () => {
    const bare = new EnglishGrammarEngine(new EnglishLanguageProvider());
    bare.createBuilder().define('give :recipient :item').mapsTo('if.action.giving').build();
    const matches = bare.findMatches(tokens('give old man coin'), { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() });
    expect(matches.map((m) => m.nounRank)).toEqual([
      { unnamed: 0, named: 0, exact: 0 },
      { unnamed: 0, named: 0, exact: 0 }
    ]);
    expect(matches[0].slots.get('recipient')?.tokens).toEqual([1]);
  });
});

describe('ADR-386 D5: a failure outranks a reading only when it names more', () => {
  const failure = (named: number, matchedVerb: string | undefined, progress: number): PartialMatchFailure => ({
    pattern: 'unlock :target with :key',
    action: 'if.action.unlocking',
    progress,
    tokensConsumed: 3,
    literalSpecificity: 2,
    tier: 'standard',
    definitionIndex: 0,
    nounRank: { unnamed: 0, named, exact: named },
    reason: 'NOT_ENOUGH_TOKENS',
    matchedVerb
  });

  it('the best verb-matched failure wins when it names strictly more than the reading', () => {
    const winner = failure(1, 'unlock', 0.9);
    expect(failureOutranking([failure(0, 'unlock', 0.75), winner], { unnamed: 1, named: 0, exact: 0 })).toBe(winner);
  });

  it('the best failure is still chosen by verb and progress first: a lesser failure naming more does not win', () => {
    const furthest = failure(0, 'unlock', 0.9);
    expect(failureOutranking([furthest, failure(1, 'unlock', 0.75)], { unnamed: 1, named: 0, exact: 0 })).toBeUndefined();
  });

  it('a failure naming as many as the reading, or more without the verb, does not', () => {
    expect(failureOutranking([failure(1, 'unlock', 0.75)], { unnamed: 1, named: 1, exact: 1 })).toBeUndefined();
    expect(failureOutranking([failure(2, undefined, 0.75)], { unnamed: 1, named: 0, exact: 0 })).toBeUndefined();
    expect(failureOutranking([], { unnamed: 1, named: 0, exact: 0 })).toBeUndefined();
  });

  it('a reading with nothing unresolved is never outranked, a literal line with no items included', () => {
    expect(failureOutranking([failure(1, 'cut', 0.75)], { unnamed: 0, named: 0, exact: 0 })).toBeUndefined();
    expect(failureOutranking([failure(2, 'give', 0.75)], { unnamed: 0, named: 1, exact: 1 })).toBeUndefined();
  });

  describe('through the parser, against the standard grammar and a real world', () => {
    let world: WorldModel;
    let parser: EnglishParser;

    beforeEach(() => {
        world = new WorldModel();
      world.setLanguageWords(ENGLISH_WORDS);
      const room = world.createEntity('Workshop', 'room');
      room.add(new RoomTrait());
      room.add(new ContainerTrait());
      const player = world.createEntity('Alex', 'actor');
      player.add(new ActorTrait());
      player.add(new ContainerTrait());
      world.moveEntity(player.id, room.id);
      world.setPlayer(player.id);
      const place = (name: string, identity: Partial<IdentityTrait>, holder: IFEntity) => {
        const entity = world.createEntity(name, 'item');
        entity.add(new IdentityTrait({ name, ...identity }));
        world.moveEntity(entity.id, holder.id);
      };
      place('door', {}, room);
      place('iron key', { aliases: ['key'] }, player);
      place('old man', {}, room);
      place('gold coin', { aliases: ['coin'] }, player);
      parser = new EnglishParser(new EnglishLanguageProvider());
      parser.setWorldContext(world, player.id, room.id);
    });

    it('unlock door with asks for the key: the failure that consumed the door names more than the reading that took door with (A6)', () => {
      const result = parser.parse('unlock door with');
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe('MISSING_INDIRECT');
    });

    it('take widget and look at sky reach the validator: no failure names more than nothing', () => {
      const widget = parser.parse('take widget');
      expect(widget.success).toBe(true);
      if (widget.success) expect(widget.value.structure.directObject?.text).toBe('widget');
      const sky = parser.parse('look at sky');
      expect(sky.success).toBe(true);
      if (sky.success) expect(sky.value.action).toBe('if.action.examining');
    });

    it('a story literal line whose word is also a name is not outranked by a slotted failure that consumed it', () => {
      parser.getStoryGrammar().define('cut myself').mapsTo('story.cutting_myself').build();
      const result = parser.parse('cut myself');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value.action).toBe('story.cutting_myself');
    });

    it('give old man coin parses as the old man and the coin (A1)', () => {
      const result = parser.parse('give old man coin');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.structure.indirectObject?.text).toBe('old man');
      expect(result.value.structure.directObject?.text).toBe('coin');
    });
  });
});
