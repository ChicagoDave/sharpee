/**
 * adr-386-d6-list-separators.test.ts — `and` and a comma separate list items
 * as readings, never as hard splits (ADR-386 D6). The tokenizer gives a
 * comma its own token; inside an entity slot the consumer admits the list
 * reading split at `and`, `,` and `, and` and the single-item reading across
 * them, and the noun rank (D4) decides: `salt and pepper shaker` is one exact
 * item unless a salt exists too; `sword, lantern` is a list of two. A
 * separator with no item after it closes no item and belongs to no extent. A
 * topic keeps the typed text. `parseChain`'s comma-then-verb rule stands.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel, IFEntity, RoomTrait, ActorTrait, ContainerTrait, IdentityTrait } from '@sharpee/world-model';
import { vocabularyRegistry } from '@sharpee/if-domain';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '../src/english-parser';

/** English, handed to hand-built worlds as the language's words (ADR-387 D2). */
const ENGLISH_WORDS = { selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] };

describe('ADR-386 D6: list separators', () => {
  let world: WorldModel;
  let parser: EnglishParser;
  let room: IFEntity;

  const thing = (name: string, identity: Partial<IdentityTrait> = {}): IFEntity => {
    const entity = world.createEntity(name, 'item');
    entity.add(new IdentityTrait({ name, ...identity }));
    world.moveEntity(entity.id, room.id);
    return entity;
  };

  beforeEach(() => {
    vocabularyRegistry.clear();
    world = new WorldModel();
    world.setLanguageWords(ENGLISH_WORDS);
    room = world.createEntity('Workshop', 'room');
    room.add(new RoomTrait());
    room.add(new ContainerTrait());
    const player = world.createEntity('Alex', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());
    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);
    thing('sword');
    thing('brass lantern', { aliases: ['lantern'] });
    thing('rope');
    thing('salt and pepper shaker', { aliases: ['shaker'] });
    parser = new EnglishParser(new EnglishLanguageProvider());
    parser.setWorldContext(world, player.id, room.id);
  });

  const direct = (input: string) => {
    const result = parser.parse(input);
    expect(result.success, `${input}: ${result.success ? '' : result.error.message}`).toBe(true);
    return result.success ? result.value.structure.directObject! : undefined!;
  };

  describe('the tokenizer', () => {
    it('gives a comma its own token, positions kept, and no token text ends in a comma', () => {
      const tokens = parser.tokenize('take sword, lantern');
      expect(tokens.map((t) => t.word)).toEqual(['take', 'sword', ',', 'lantern']);
      expect(tokens.map((t) => t.position)).toEqual([0, 5, 10, 12]);
      expect(parser.tokenize('take sword ,lantern').map((t) => t.word)).toEqual(['take', 'sword', ',', 'lantern']);
    });

    it('a comma inside quotes stays in the quoted token', () => {
      expect(parser.tokenize('say "hello, world"').map((t) => t.word)).toEqual(['say', '"hello, world"']);
    });
  });

  describe('inside an entity slot', () => {
    it('a comma separates two items (A7)', () => {
      const phrase = direct('take sword, lantern');
      expect(phrase.isList).toBe(true);
      expect(phrase.items?.map((item) => item.text)).toEqual(['sword', 'lantern']);
    });

    it('`and` and `, and` separate items too', () => {
      expect(direct('take sword and lantern').items?.map((item) => item.text)).toEqual(['sword', 'lantern']);
      expect(direct('take sword, lantern, and rope').items?.map((item) => item.text)).toEqual(['sword', 'lantern', 'rope']);
    });

    it('a name that holds `and` is one exact item, not two words-tier items (A7)', () => {
      const phrase = direct('take salt and pepper shaker');
      expect(phrase.isList).toBeUndefined();
      expect(phrase.text).toBe('salt and pepper shaker');
    });

    it('with a separate salt the same words are two items, because two names beat one', () => {
      thing('salt');
      const phrase = direct('take salt and pepper shaker');
      expect(phrase.isList).toBe(true);
      expect(phrase.items?.map((item) => item.text)).toEqual(['salt', 'pepper shaker']);
    });

    it('a trailing separator closes no item: `take coin and` yields no item whose text is `coin and`', () => {
      thing('gold coin', { aliases: ['coin'] });
      const result = parser.parse('take coin and');
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe('INVALID_SYNTAX');
    });

    it('a doubled or leading separator is no extent either', () => {
      expect(parser.parse('take sword and and lantern').success).toBe(false);
      expect(parser.parse('take , sword').success).toBe(false);
    });

    it('an all phrase splits its exclusions at the separators', () => {
      const result = parser.parse('take all but sword, lantern');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.structure.directObject?.isAll).toBe(true);
      expect(result.value.excluded?.map((item) => item.text)).toEqual(['sword', 'lantern']);
    });
  });

  describe('text slots and command chains', () => {
    it('a topic keeps the typed text across a comma', () => {
      parser.getStoryGrammar().define('plot :destination').topic('destination').mapsTo('story.plotting').build();
      const result = parser.parse('plot 14, 6');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value.topic?.text).toBe('14, 6');
    });

    it('a comma followed by a verb still separates commands; one followed by a noun does not', () => {
      expect(parser.parseChain('take sword, drop sword')).toHaveLength(2);
      const chain = parser.parseChain('take sword, lantern');
      expect(chain).toHaveLength(1);
      expect(chain[0].success).toBe(true);
    });
  });
});
