/**
 * exact-out-of-scope.test.ts — GH #206: when the query names an entity
 * EXACTLY (its name or an alias) and that entity is out of scope, the
 * validator reports it as not found rather than silently resolving an
 * in-scope entity that merely shares a word ("attack thief" while the
 * thief is out of sight must never become an attack on the "thief knife").
 * With no exact candidate anywhere, the word tier still resolves as before.
 *
 * Tests synthesize parsed commands the way the vocabulary-resolution suite
 * does; assertions are on the resolution result.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { AuthorModel, EntityType, IFEntity, IParsedCommand, TraitType, WorldModel } from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/if-domain';
import { CommandValidator } from '../../../src/validation/command-validator';
import { StandardActionRegistry } from '../../../src/actions/registry';
import { examiningAction } from '../../../src/actions/standard/examining';

const mockLanguageProvider = {
  languageCode: 'en-US',
  getMessage: (id: string) => id,
  hasMessage: (_id: string) => true,
  getActionPatterns: (actionId: string) => (actionId === 'if.action.examining' ? ['examine', 'x'] : undefined),
  getActionHelp: () => undefined,
  getSupportedActions: () => ['if.action.examining'],
} as unknown as LanguageProvider;

function commandFor(rawText: string): IParsedCommand {
  const words = rawText.toLowerCase().split(/\s+/).filter(Boolean);
  return {
    rawInput: `x ${rawText}`,
    tokens: [],
    structure: {
      verb: { tokens: [0], text: 'x', head: 'x' },
      directObject: {
        tokens: words.map((_, i) => i + 1),
        text: rawText.toLowerCase(),
        head: words[words.length - 1],
        modifiers: words.slice(0, -1),
        articles: [],
        determiners: [],
        candidates: [rawText.toLowerCase()],
      },
    },
    pattern: 'VERB_NOUN',
    confidence: 1.0,
    action: 'if.action.examining',
  } as IParsedCommand;
}

describe('GH #206: an exact match out of scope is not displaced by a word match in scope', () => {
  let world: WorldModel;
  let author: AuthorModel;
  let player: IFEntity;
  let room: IFEntity;
  let elsewhere: IFEntity;
  let validator: CommandValidator;

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);
    player = author.createEntity('yourself', EntityType.ACTOR);
    room = author.createEntity('Treasure Room', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    elsewhere = author.createEntity('Cellar', EntityType.ROOM);
    elsewhere.add({ type: TraitType.ROOM });
    author.moveEntity(player.id, room.id);
    world.setPlayer(player.id);
    const stiletto = author.createEntity('nasty stiletto', EntityType.OBJECT);
    stiletto.add({ type: TraitType.IDENTITY, name: 'nasty stiletto', aliases: ['stiletto', 'thief knife'] });
    author.moveEntity(stiletto.id, player.id);
    const registry = new StandardActionRegistry();
    registry.setLanguageProvider(mockLanguageProvider);
    registry.register(examiningAction);
    validator = new CommandValidator(world, registry);
  });

  test('`x thief` with the thief out of sight resolves the thief (for the action to refuse by scope), not the knife', () => {
    const thief = author.createEntity('seedy-looking thief', EntityType.ACTOR);
    thief.add({ type: TraitType.IDENTITY, name: 'seedy-looking thief', aliases: ['thief'] });
    author.moveEntity(thief.id, elsewhere.id);

    const result = validator.validate(commandFor('thief'));

    expect(result.success).toBe(true);
    expect(result.success && result.value.directObject?.entity.id).toBe(thief.id);
  });

  test('an in-scope entity whose own name carries the head still resolves when a namesake is out of sight', () => {
    const rare = author.createEntity('rare stamp', EntityType.OBJECT);
    rare.add({ type: TraitType.IDENTITY, name: 'rare stamp' });
    author.moveEntity(rare.id, room.id);
    const other = author.createEntity('stamp', EntityType.OBJECT);
    other.add({ type: TraitType.IDENTITY, name: 'stamp', aliases: ['stamp'] });
    author.moveEntity(other.id, elsewhere.id);

    const result = validator.validate(commandFor('stamp'));

    expect(result.success).toBe(true);
    expect(result.success && result.value.directObject?.entity.name).toBe('rare stamp');
  });

  test('with no in-scope competitor at all, an out-of-sight exact match stays not found at validation', () => {
    const ball = author.createEntity('ball', EntityType.OBJECT);
    ball.add({ type: TraitType.IDENTITY, name: 'ball' });
    author.moveEntity(ball.id, elsewhere.id);

    const result = validator.validate(commandFor('ball'));

    expect(result.success).toBe(false);
    expect(!result.success && result.error.code).toBe('ENTITY_NOT_FOUND');
  });

  test('with no thief anywhere, `x thief` still resolves the knife by its word', () => {
    const result = validator.validate(commandFor('thief'));

    expect(result.success).toBe(true);
    expect(result.success && result.value.directObject?.entity.name).toBe('nasty stiletto');
  });
});
