/**
 * adr-387-d5-direction-table.test.ts — one direction table per language
 * (ADR-387 D5).
 *
 * The tokenizer's DIRECTION tag, the typed DIRECTION slot and going's
 * `extras.direction` all read the provider's table, so a word is a direction
 * everywhere or nowhere. A provider with other words changes every reader
 * with no code edit; `upward` is in no table and parses nowhere (Q-3).
 */
import { describe, it, expect } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { Direction, WorldModel, EntityType } from '@sharpee/world-model';
import { PartOfSpeech, SlotType, type DirectionVocabulary, type GrammarContext } from '@sharpee/if-domain';

/** English whose compass is Spanish. */
class SpanishCompassProvider extends EnglishLanguageProvider {
  getDirections(): DirectionVocabulary[] {
    return [
      { direction: Direction.NORTH, words: ['norte'], abbreviations: ['nt'] },
      { direction: Direction.SOUTH, words: ['sur'] },
    ];
  }
}

const context: GrammarContext = { world: null, actorId: 'player', currentLocation: 'test', slots: new Map() };

function parserOver(provider: EnglishLanguageProvider) {
  const parser = new EnglishParser(provider);
  const world = new WorldModel();
  world.setLanguageWords(provider.getLanguageWords());
  const room = world.createEntity('Room', EntityType.ROOM);
  const player = world.createEntity('you', EntityType.ACTOR);
  world.moveEntity(player.id, room.id);
  world.setPlayer(player.id);
  parser.setWorldContext(world, player.id, room.id);
  return parser;
}

describe('ADR-387 D5: the tokenizer and the DIRECTION slot agree by construction', () => {
  const provider = new EnglishLanguageProvider();
  const tableWords = provider.getDirections().flatMap((entry) => [...entry.words, ...(entry.abbreviations ?? [])]);
  const probes = [...tableWords, 'upward', 'upwards', 'downward', 'downwards', 'lamp', 'north-ish'];

  it('tags DIRECTION exactly the words the slot accepts, and both are the table', () => {
    const parser = new EnglishParser(provider);
    const engine = new EnglishGrammarEngine(provider);
    engine.createBuilder().define('go :dir').direction('dir').mapsTo('test:go').build();

    const tagged = probes.filter((word) => parser.tokenize(word)[0].candidates.some((c) => c.partOfSpeech === PartOfSpeech.DIRECTION));
    const accepted = probes.filter((word) => {
      const tokens = [{ word: 'go', normalized: 'go', position: 0, candidates: [] }, { word, normalized: word, position: 3, candidates: [] }];
      return engine.findMatches(tokens, context).length === 1;
    });
    expect(tagged.sort()).toEqual([...tableWords].sort());
    expect(accepted.sort()).toEqual([...tableWords].sort());
  });

  it('holds exactly the words the standard grammar accepts: no upward, downward or their -s forms', () => {
    expect(tableWords).toContain('inside');
    expect(tableWords).toContain('outside');
    expect(tableWords).not.toContain('upward');
    expect(tableWords).not.toContain('upwards');
    expect(tableWords).not.toContain('downward');
    expect(tableWords).not.toContain('downwards');
  });

  it('names each direction by world-model\'s constant', () => {
    expect(provider.getDirections().map((entry) => entry.direction).sort()).toEqual(Object.values(Direction).sort());
  });
});

describe('ADR-387 D5: going reads the table', () => {
  it('n and go northeast carry the Direction constant; upward stays unparsed', () => {
    const parser = parserOver(new EnglishLanguageProvider());
    const n = parser.parse('n');
    expect(n.success && n.value.extras?.direction).toBe(Direction.NORTH);
    const northeast = parser.parse('go northeast');
    expect(northeast.success && northeast.value.extras?.direction).toBe(Direction.NORTHEAST);
    const inside = parser.parse('inside');
    expect(inside.success && inside.value.extras?.direction).toBe(Direction.IN);
    expect(parser.parse('upward').success).toBe(false);
    expect(parser.parse('go upward').success).toBe(false);
  });

  it('a provider with another compass changes every reader with no code edit', () => {
    const provider = new SpanishCompassProvider();
    const parser = parserOver(provider);
    parser.getStoryGrammar().define('ir :dir').direction('dir').mapsTo('if.action.going').build();
    const norte = parser.parse('ir norte');
    expect(norte.success, JSON.stringify(norte)).toBe(true);
    expect(norte.success && norte.value.extras?.direction).toBe(Direction.NORTH);
    const nt = parser.parse('ir nt');
    expect(nt.success && nt.value.extras?.direction).toBe(Direction.NORTH);
    expect(parser.parse('ir north').success).toBe(false);
    expect(parser.tokenize('norte')[0].candidates.some((c) => c.partOfSpeech === PartOfSpeech.DIRECTION)).toBe(true);
    expect(parser.tokenize('north')[0].candidates.some((c) => c.partOfSpeech === PartOfSpeech.DIRECTION)).toBe(false);
  });

  it('extractDirectionValue reads the provider and returns the constant', () => {
    const provider = new EnglishLanguageProvider();
    const engine = new EnglishGrammarEngine(provider);
    engine.createBuilder().define('go :dir').direction('dir').mapsTo('test:go').build();
    const tokens = [{ word: 'go', normalized: 'go', position: 0, candidates: [] }, { word: 'SW', normalized: 'sw', position: 3, candidates: [] }];
    const match = engine.findMatches(tokens, context)[0];
    expect(match.slots.get('dir')?.slotType).toBe(SlotType.DIRECTION);
    expect(EnglishGrammarEngine.extractDirectionValue(match.slots.get('dir')!, provider)).toBe(Direction.SOUTHWEST);
  });
});
