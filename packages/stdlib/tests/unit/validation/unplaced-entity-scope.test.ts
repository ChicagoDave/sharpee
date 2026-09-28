/**
 * unplaced-entity-scope.test.ts — GH #374: an entity with no location is
 * out of scope for every action's item slot, and a carried entity that
 * answers to the same word wins resolution over it. Two garments both
 * called "dress" — one never placed (an escape dress moved offstage), one
 * in the player's hands — and `wear dress` must reach the carried one.
 *
 * Pins existing behavior: the scope resolver rates an unplaced entity
 * UNAWARE, and the validator resolves only in-scope candidates when one
 * exists. Tests synthesize parsed commands the way the exact-out-of-scope
 * suite does; assertions are on the resolution result and the scope level.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { AuthorModel, EntityType, IFEntity, IParsedCommand, TraitType, WorldModel } from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/if-domain';
import { CommandValidator } from '../../../src/validation/command-validator';
import { StandardActionRegistry } from '../../../src/actions/registry';
import { wearingAction } from '../../../src/actions/standard/wearing';
import { StandardScopeResolver } from '../../../src/scope/scope-resolver';
import { ScopeLevel } from '../../../src/scope/types';

const mockLanguageProvider = {
  languageCode: 'en-US',
  getMessage: (id: string) => id,
  hasMessage: (_id: string) => true,
  getActionPatterns: (actionId: string) => (actionId === 'if.action.wearing' ? ['wear', 'don'] : undefined),
  getActionHelp: () => undefined,
  getSupportedActions: () => ['if.action.wearing'],
} as unknown as LanguageProvider;

function wearCommand(rawText: string): IParsedCommand {
  const words = rawText.toLowerCase().split(/\s+/).filter(Boolean);
  return {
    rawInput: `wear ${rawText}`,
    tokens: [],
    structure: {
      verb: { tokens: [0], text: 'wear', head: 'wear' },
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
    action: 'if.action.wearing',
  } as IParsedCommand;
}

describe('GH #374: an unplaced entity never wins scope over a carried one', () => {
  let world: WorldModel;
  let author: AuthorModel;
  let player: IFEntity;
  let room: IFEntity;
  let escapeDress: IFEntity;
  let validator: CommandValidator;
  let scope: StandardScopeResolver;

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);
    player = author.createEntity('yourself', EntityType.ACTOR);
    room = author.createEntity('Bathroom', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    author.moveEntity(player.id, room.id);
    world.setPlayer(player.id);

    // Created and never placed: no location at all.
    escapeDress = author.createEntity('dress', EntityType.OBJECT);
    escapeDress.add({ type: TraitType.IDENTITY, name: 'dress', aliases: ['gown', 'green dress'] });
    escapeDress.add({ type: TraitType.WEARABLE });

    const registry = new StandardActionRegistry();
    registry.setLanguageProvider(mockLanguageProvider);
    registry.register(wearingAction);
    scope = new StandardScopeResolver(world);
    validator = new CommandValidator(world, registry, scope);
  });

  test('an entity with no location is UNAWARE to the player', () => {
    expect(world.getLocation(escapeDress.id)).toBeUndefined();
    expect(scope.getScope(player, escapeDress)).toBe(ScopeLevel.UNAWARE);
  });

  test('`wear dress` with a carried day dress aliased "dress" resolves the carried one', () => {
    const dayDress = author.createEntity('daydress', EntityType.OBJECT);
    dayDress.add({ type: TraitType.IDENTITY, name: 'daydress', aliases: ['dress', 'day dress'] });
    dayDress.add({ type: TraitType.WEARABLE });
    author.moveEntity(dayDress.id, player.id);

    const result = validator.validate(wearCommand('dress'));

    expect(result.success).toBe(true);
    expect(result.success && result.value.directObject?.entity.id).toBe(dayDress.id);
    expect(result.success && (result.value.directObject as { exactOutOfScope?: boolean }).exactOutOfScope).toBeUndefined();
  });

  test('`wear dress` with only the unplaced dress anywhere is not found', () => {
    const result = validator.validate(wearCommand('dress'));

    expect(result.success).toBe(false);
    expect(!result.success && result.error.code).toBe('ENTITY_NOT_FOUND');
  });

  test('`wear gown`, an alias only the unplaced dress carries, is not found even with the day dress in hand', () => {
    const dayDress = author.createEntity('daydress', EntityType.OBJECT);
    dayDress.add({ type: TraitType.IDENTITY, name: 'daydress', aliases: ['dress', 'day dress'] });
    dayDress.add({ type: TraitType.WEARABLE });
    author.moveEntity(dayDress.id, player.id);

    const result = validator.validate(wearCommand('gown'));

    expect(result.success).toBe(false);
    expect(!result.success && result.error.code).toBe('ENTITY_NOT_FOUND');
  });
});
