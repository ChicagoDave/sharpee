/**
 * adr-387-d6-phrase-words.test.ts — the list separators, the possessive and
 * the manner adverbs come from the provider (ADR-387 D6).
 *
 * The possessive is by person: the determiner table says whose each one is,
 * and the parser asks the provider which person the story addresses the actor
 * in. A provider with another conjunction or another adverb list changes the
 * parse with no code edit: the proof that these words have one home.
 */
import { describe, it, expect } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { WorldModel, EntityType, IdentityTrait } from '@sharpee/world-model';
import type { GrammarContext } from '@sharpee/if-domain';

/** English, addressing the actor in the first person. */
class FirstPersonProvider extends EnglishLanguageProvider {
  getNarrativePerson(): 'first' | 'second' | 'third' {
    return 'first';
  }
}

/** English whose list conjunction is `und`. */
class UndProvider extends EnglishLanguageProvider {
  getListSeparators(): string[] {
    return ['und', ','];
  }
}

/** English whose only manner adverb is `purple`. */
class PurpleMannerProvider extends EnglishLanguageProvider {
  getMannerAdverbs(): string[] {
    return ['purple'];
  }
}

function worldWithThings(provider: EnglishLanguageProvider, names: string[]) {
  const world = new WorldModel();
  world.setLanguageWords(provider.getLanguageWords());
  const room = world.createEntity('Room', EntityType.ROOM);
  const player = world.createEntity('you', EntityType.ACTOR);
  world.moveEntity(player.id, room.id);
  world.setPlayer(player.id);
  for (const name of names) {
    const thing = world.createEntity(name, EntityType.ITEM);
    thing.add(new IdentityTrait({ name, aliases: [name.split(' ').pop()!] }));
    world.moveEntity(thing.id, room.id);
  }
  return { world, room, player };
}

function parserOver(provider: EnglishLanguageProvider, names: string[]) {
  const parser = new EnglishParser(provider);
  const { world, room, player } = worldWithThings(provider, names);
  parser.setWorldContext(world, player.id, room.id);
  return parser;
}

const direct = (parser: EnglishParser, input: string) => {
  const result = parser.parse(input);
  expect(result.success, `${input}: ${result.success ? '' : result.error.messageId}`).toBe(true);
  return result.success ? result.value.structure.directObject! : undefined!;
};

describe('ADR-387 D6: the possessive is by person', () => {
  it('marks `your lantern` the actor\'s own in the default second-person voice, as `my lantern` is', () => {
    const parser = parserOver(new EnglishLanguageProvider(), ['brass lantern']);
    expect(direct(parser, 'take your lantern').ownedByActor).toBe(true);
    expect(direct(parser, 'take my lantern').ownedByActor).toBe(true);
  });

  it('leaves `her key` a determiner that narrows nothing', () => {
    const parser = parserOver(new EnglishLanguageProvider(), ['brass key']);
    const phrase = direct(parser, 'take her key');
    expect(phrase.determiners).toEqual(['her']);
    expect(phrase.ownedByActor).toBeUndefined();
  });

  it('in a first-person voice `your lantern` is someone else\'s and `my lantern` the actor\'s', () => {
    const parser = parserOver(new FirstPersonProvider(), ['brass lantern']);
    expect(direct(parser, 'take your lantern').ownedByActor).toBeUndefined();
    expect(direct(parser, 'take my lantern').ownedByActor).toBe(true);
  });
});

describe('ADR-387 D6: the list separators come from the provider', () => {
  it('makes `take sword und lantern` a list under a provider whose conjunction is `und`', () => {
    const parser = parserOver(new UndProvider(), ['sword', 'brass lantern']);
    const phrase = direct(parser, 'take sword und lantern');
    expect(phrase.isList).toBe(true);
    expect(phrase.items?.map((item) => item.text)).toEqual(['sword', 'lantern']);
  });

  it('keeps `, und` one separator and the comma a separator of its own', () => {
    const parser = parserOver(new UndProvider(), ['sword', 'brass lantern', 'rope']);
    expect(direct(parser, 'take sword, lantern, und rope').items?.map((item) => item.text)).toEqual(['sword', 'lantern', 'rope']);
    expect(direct(parser, 'take sword, lantern').items?.map((item) => item.text)).toEqual(['sword', 'lantern']);
  });
});

describe('ADR-387 D6: the manner adverbs come from the provider', () => {
  const context: GrammarContext = { world: null, actorId: 'player', currentLocation: 'test', slots: new Map() };
  const tokensOf = (words: string[]) => words.map((word, i) => ({ word, normalized: word, position: i * 8, candidates: [] }));

  function engineWithWalk(provider: EnglishLanguageProvider) {
    const engine = new EnglishGrammarEngine(provider);
    engine.createBuilder().define('walk :how').manner('how').mapsTo('test:walk').build();
    return engine;
  }

  it('reads `carefully` from the English table and not `purple`', () => {
    const engine = engineWithWalk(new EnglishLanguageProvider());
    const careful = engine.findMatches(tokensOf(['walk', 'carefully']), context);
    expect(careful).toHaveLength(1);
    expect(careful[0].slots.get('how')?.manner).toBe('carefully');
    expect(engine.findMatches(tokensOf(['walk', 'purple']), context)).toHaveLength(0);
  });

  it('reads `purple` and not `carefully` under a provider that lists only `purple`', () => {
    const engine = engineWithWalk(new PurpleMannerProvider());
    expect(engine.findMatches(tokensOf(['walk', 'purple']), context)[0]?.slots.get('how')?.manner).toBe('purple');
    expect(engine.findMatches(tokensOf(['walk', 'carefully']), context)).toHaveLength(0);
  });
});
