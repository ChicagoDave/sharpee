/**
 * adr-387-d4-two-parsers.test.ts — two EnglishParser instances in one process
 * share nothing (ADR-387 D4): each owns its pronoun context and its
 * vocabulary registry. The parser review's step 7 Phase 1 measured the
 * contamination this test turns into a floor: before the move, constructing
 * the second parser emptied the first's vocabulary (a story verb registered
 * on A vanished) and A's `it` resolved through B's referents.
 */
import { describe, it, expect } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { WorldModel, EntityType, IdentityTrait, type IFEntity } from '@sharpee/world-model';

/** A world with one named thing; `spares` extra entities first, so two worlds' ids differ. */
function worldWith(itemName: string, spares = 0) {
  const world = new WorldModel();
  world.setLanguageWords(new EnglishLanguageProvider().getLanguageWords());
  const room = world.createEntity('Room', EntityType.ROOM);
  const player = world.createEntity('you', EntityType.ACTOR);
  for (let i = 0; i < spares; i++) world.createEntity(`spare ${i}`, EntityType.ITEM);
  const item = world.createEntity(itemName, EntityType.ITEM);
  item.add(new IdentityTrait({ name: itemName, aliases: [itemName] }));
  world.moveEntity(player.id, room.id);
  world.moveEntity(item.id, room.id);
  world.setPlayer(player.id);
  return { world, room, player, item };
}

function parserOver(place: { world: WorldModel; room: IFEntity; player: IFEntity }) {
  const parser = new EnglishParser(new EnglishLanguageProvider());
  parser.setWorldContext(place.world, place.player.id, place.room.id);
  return parser;
}

const direct = (parser: EnglishParser, input: string) => {
  const result = parser.parse(input);
  return result.success ? result.value.structure.directObject : undefined;
};

describe('ADR-387 D4: two parsers in one process share nothing', () => {
  it('each parser keeps its own pronoun referents', () => {
    const a = worldWith('lamp');
    const b = worldWith('sword', 2);
    expect(a.item.id).not.toBe(b.item.id);
    const parserA = parserOver(a);
    parserA.registerPronounEntity(a.item.id, 'lamp');
    const parserB = parserOver(b);
    parserB.registerPronounEntity(b.item.id, 'sword');

    expect(direct(parserA, 'drop it')?.entityId).toBe(a.item.id);
    expect(direct(parserB, 'drop it')?.entityId).toBe(b.item.id);
    expect(parserA.getPronounContextManager()).not.toBe(parserB.getPronounContextManager());
  });

  it('a story verb registered on one parser is unknown to the other, and survives the other\'s construction', () => {
    const a = worldWith('lamp');
    const parserA = parserOver(a);
    parserA.registerVerbs([{ actionId: 'story.action.frobbing', verbs: ['frob'], pattern: 'VERB_NOUN' }]);
    parserA.getStoryGrammar().define('frob :target').mapsTo('story.action.frobbing').build();
    const chainBefore = parserA.parseChain('take lamp, frob lamp').map((r) => (r.success ? r.value.action : r.error.code));
    expect(chainBefore).toEqual(['if.action.taking', 'story.action.frobbing']);

    const b = worldWith('sword');
    const parserB = parserOver(b);

    // A's registry is untouched by B's construction: the chain still splits at the verb
    const chainAfter = parserA.parseChain('take lamp, frob lamp').map((r) => (r.success ? r.value.action : r.error.code));
    expect(chainAfter).toEqual(['if.action.taking', 'story.action.frobbing']);
    expect(parserA.getVocabularyRegistry().hasWord('frob', 'verb')).toBe(true);
    // B never learned A's verb
    expect(parserB.getVocabularyRegistry().hasWord('frob', 'verb')).toBe(false);
    expect(parserB.parse('frob sword').success).toBe(false);
    expect(parserA.getVocabularyRegistry()).not.toBe(parserB.getVocabularyRegistry());
  });
});
