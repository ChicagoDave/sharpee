/**
 * preferredScope disambiguation (platform-issue-sweep Phase 6/10).
 *
 * Dropping resolves at VISIBLE (so `again` after a successful drop reaches
 * the action's own not_held refusal instead of a parse-level "can't see any
 * such thing"), but declares `preferredScope: CARRIED` so the classic
 * preference survives: "drop book" with the black book in hand and a
 * guidebook on the floor means the carried one — this exact ambiguity broke
 * the dungeo walkthrough chain when the scope was first widened without the
 * preference.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  AuthorModel,
  EntityType,
  IFEntity,
  IParsedCommand,
  TraitType,
  WorldModel
} from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/if-domain';

import { CommandValidator } from '../../../src/validation/command-validator';
import { StandardActionRegistry } from '../../../src/actions/registry';
import { droppingAction } from '../../../src/actions/standard/dropping';

const mockLanguageProvider = {
  languageCode: 'en-US',
  getMessage: (id: string) => id,
  hasMessage: (_id: string) => true,
  getActionPatterns: (actionId: string) =>
    actionId === 'if.action.dropping' ? ['drop', 'discard'] : undefined,
  getActionHelp: () => undefined,
  getSupportedActions: () => ['if.action.dropping']
} as unknown as LanguageProvider;

function dropCommand(rawText: string): IParsedCommand {
  const words = rawText.toLowerCase().split(/\s+/).filter(Boolean);
  const head = words[words.length - 1];

  return {
    rawInput: `drop ${rawText}`,
    tokens: [],
    structure: {
      verb: { tokens: [0], text: 'drop', head: 'drop' },
      directObject: {
        tokens: words.map((_, i) => i + 1),
        text: rawText.toLowerCase(),
        head,
        modifiers: words.slice(0, -1),
        articles: [],
        determiners: [],
        candidates: [rawText.toLowerCase()]
      }
    },
    pattern: 'VERB_NOUN',
    confidence: 1.0,
    action: 'if.action.dropping'
  } as IParsedCommand;
}

describe('CommandValidator — preferredScope disambiguation (Phase 6/10)', () => {
  let world: WorldModel;
  let author: AuthorModel;
  let player: IFEntity;
  let room: IFEntity;
  let validator: CommandValidator;

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);

    player = author.createEntity('yourself', EntityType.ACTOR);
    room = author.createEntity('Test Room', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    author.moveEntity(player.id, room.id);
    world.setPlayer(player.id);

    const registry = new StandardActionRegistry();
    registry.setLanguageProvider(mockLanguageProvider);
    registry.register(droppingAction);
    validator = new CommandValidator(world, registry);
  });

  function makeBook(name: string, where: IFEntity, aliases: string[] = []): IFEntity {
    const book = author.createEntity(name, EntityType.OBJECT);
    book.add({ type: TraitType.IDENTITY, name, aliases });
    author.moveEntity(book.id, where.id);
    return book;
  }

  test('"drop book" prefers the carried book over one on the floor', () => {
    // Mirrors the dungeo chain break: black book carried, guidebook (alias
    // "book") on the floor — a genuine word-level tie.
    const carried = makeBook('black book', player);
    makeBook('guidebook', room, ['tour book']);

    const result = validator.validate(dropCommand('book'));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.directObject?.entity.id).toBe(carried.id);
    }
  });

  test('"drop book" with nothing carried still resolves the visible book (not_held speaks downstream)', () => {
    const floorBook = makeBook('guidebook', room, ['tour book']);

    const result = validator.validate(dropCommand('book'));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.directObject?.entity.id).toBe(floorBook.id);
    }
  });

  test('two carried books still ask (the preference never guesses among equals)', () => {
    makeBook('black book', player);
    makeBook('blue book', player);

    const result = validator.validate(dropCommand('book'));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('AMBIGUOUS_ENTITY');
    }
  });
});
