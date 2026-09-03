/**
 * self-words.test.ts — the self words ("me", "myself", "yourself") name
 * whoever holds the player role (ADR-327), whatever that entity is called.
 * Before this, they matched only a player literally named "yourself" with
 * those aliases, so a Chord story whose player is Alex answered
 * `examine yourself` with "You can't see any such thing." (GH #231's
 * cloak-of-darkness suite).
 *
 * Tests synthesize parsed commands the way the vocabulary-resolution suite
 * does; assertions are on the resolved entity.
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

describe('the self words name the current player (ADR-327)', () => {
  let world: WorldModel;
  let author: AuthorModel;
  let player: IFEntity;
  let validator: CommandValidator;

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);
    const room = author.createEntity('Foyer', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    player = author.createEntity('Alex', EntityType.ACTOR);
    player.add({ type: TraitType.IDENTITY, name: 'Alex', properName: true });
    player.add({ type: TraitType.ACTOR });
    author.moveEntity(player.id, room.id);
    world.setPlayer(player.id);
    const registry = new StandardActionRegistry();
    registry.setLanguageProvider(mockLanguageProvider);
    registry.register(examiningAction);
    validator = new CommandValidator(world, registry);
  });

  test.each(['yourself', 'me', 'myself', 'self'])('`x %s` resolves a player named Alex', (word) => {
    const result = validator.validate(commandFor(word));

    expect(result.success).toBe(true);
    expect(result.success && result.value.directObject?.entity.id).toBe(player.id);
  });

  test('a self word never resolves a non-player entity', () => {
    const other = author.createEntity('Mara', EntityType.ACTOR);
    other.add({ type: TraitType.IDENTITY, name: 'Mara', properName: true });
    other.add({ type: TraitType.ACTOR });
    author.moveEntity(other.id, world.getLocation(player.id)!);

    const result = validator.validate(commandFor('yourself'));

    expect(result.success && result.value.directObject?.entity.id).toBe(player.id);
  });
});
