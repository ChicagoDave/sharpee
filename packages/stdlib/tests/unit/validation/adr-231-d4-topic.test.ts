/**
 * Topic entity-first resolution (ADR-231 D4) pinning tests.
 *
 * A conversation topic is first-class free text — `IValidatedCommand.topic`
 * = `{ text, entity? }` — resolved entity-first against VISIBLE scope,
 * quietly: an in-scope match carries its EntityId, anything else falls
 * back to the verbatim text. These tests pin:
 *
 * - THE rejection test named by the ADR: a free-text topic naming no
 *   in-scope entity does NOT scope-reject — validation succeeds with
 *   `{ text, entity: undefined }` and asking produces its normal
 *   `unknown_topic` response, never ENTITY_NOT_FOUND;
 * - an in-scope topic carries the resolved EntityId;
 * - an out-of-scope entity name and a tied (ambiguous) topic both fall
 *   back to text — a topic never triggers a disambiguation prompt;
 * - asking/telling report the topic text verbatim (`params.topic`) and
 *   surface `topicEntityId` for interceptors.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CommandValidator } from '../../../src/validation/command-validator';
import { StandardActionRegistry } from '../../../src/actions/registry';
import { AuthorModel, WorldModel, IFEntity, TraitType, EntityType } from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/if-domain';
import { askingAction } from '../../../src/actions/standard/asking';
import { tellingAction } from '../../../src/actions/standard/telling';
import { IFActions } from '../../../src/actions/constants';
import {
  createRealTestContext,
  createCommand,
  parseCommand
} from '../../test-utils';

describe('CommandValidator topic resolution (ADR-231 D4)', () => {
  let world: WorldModel;
  let author: AuthorModel;
  let player: IFEntity;
  let room: IFEntity;
  let hermit: IFEntity;
  let validator: CommandValidator;

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);

    player = author.createEntity('yourself', EntityType.ACTOR);
    room = author.createEntity('Hermitage', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    author.moveEntity(player.id, room.id);
    world.setPlayer(player.id);

    hermit = author.createEntity('hermit', EntityType.ACTOR);
    hermit.add({ type: TraitType.ACTOR });
    author.moveEntity(hermit.id, room.id);

    const registry = new StandardActionRegistry();
    const mockLanguageProvider = {
      languageCode: 'en-US',
      getMessage: (id: string) => id,
      hasMessage: () => true,
      getActionPatterns: (actionId: string) => {
        const patterns: Record<string, string[]> = {
          'if.action.asking': ['ask'],
          'if.action.telling': ['tell']
        };
        return patterns[actionId];
      },
      getActionHelp: () => undefined,
      getSupportedActions: () => ['if.action.asking', 'if.action.telling']
    };
    registry.setLanguageProvider(mockLanguageProvider as unknown as LanguageProvider);
    registry.register(askingAction);
    registry.register(tellingAction);

    validator = new CommandValidator(world, registry);
  });

  test('THE rejection test: a free-text topic naming nothing in scope does NOT scope-reject', () => {
    const parsed = parseCommand('ask hermit about the weather', world);
    expect(parsed).not.toBeNull();
    expect(parsed!.topic).toEqual({ text: 'the weather' });

    const result = validator.validate(parsed!);

    // The pin: validation SUCCEEDS — never ENTITY_NOT_FOUND /
    // "You can't see any such thing" for a topic.
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.actionId).toBe('if.action.asking');
      expect(result.value.topic).toBeDefined();
      expect(result.value.topic!.text).toBe('the weather');
      expect(result.value.topic!.entity).toBeUndefined();
      // The recipient resolved normally.
      expect(result.value.directObject?.entity.id).toBe(hermit.id);
    }
  });

  test('an in-scope entity topic carries the resolved EntityId', () => {
    const gull = author.createEntity('gull', EntityType.ACTOR);
    gull.add({ type: TraitType.ACTOR });
    author.moveEntity(gull.id, room.id);

    const parsed = parseCommand('ask hermit about the gull', world);
    expect(parsed).not.toBeNull();

    const result = validator.validate(parsed!);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.topic!.text).toBe('the gull');
      expect(result.value.topic!.entity).toBe(gull.id);
    }
  });

  test('an out-of-scope entity name falls back to text (no rejection, no entity)', () => {
    const otherRoom = author.createEntity('Cave', EntityType.ROOM);
    otherRoom.add({ type: TraitType.ROOM });
    const dragon = author.createEntity('dragon', EntityType.ACTOR);
    dragon.add({ type: TraitType.ACTOR });
    author.moveEntity(dragon.id, otherRoom.id);

    const parsed = parseCommand('ask hermit about dragon', world);
    expect(parsed).not.toBeNull();

    const result = validator.validate(parsed!);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.topic!.text).toBe('dragon');
      expect(result.value.topic!.entity).toBeUndefined();
    }
  });

  test('a tied topic match falls back to text — topics never disambiguate', () => {
    const redBird = author.createEntity('red bird', EntityType.OBJECT);
    const blueBird = author.createEntity('blue bird', EntityType.OBJECT);
    author.moveEntity(redBird.id, room.id);
    author.moveEntity(blueBird.id, room.id);

    const parsed = parseCommand('ask hermit about bird', world);
    expect(parsed).not.toBeNull();

    const result = validator.validate(parsed!);

    // No AMBIGUOUS_ENTITY prompt, no failure — quiet text fallback.
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.topic!.text).toBe('bird');
      expect(result.value.topic!.entity).toBeUndefined();
    }
  });

  test('telling resolves its topic the same way', () => {
    const parsed = parseCommand('tell hermit about the tides', world);
    expect(parsed).not.toBeNull();

    const result = validator.validate(parsed!);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.actionId).toBe('if.action.telling');
      expect(result.value.topic).toEqual({ text: 'the tides' });
    }
  });
});

describe('asking/telling report the first-class topic (ADR-231 D4)', () => {
  const setupPersonWorld = () => {
    const world = new WorldModel();
    const author = new AuthorModel(world.getDataStore(), world);
    const player = author.createEntity('yourself', EntityType.ACTOR);
    const room = author.createEntity('Hermitage', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    author.moveEntity(player.id, room.id);
    world.setPlayer(player.id);
    const hermit = author.createEntity('hermit', EntityType.ACTOR);
    hermit.add({ type: TraitType.ACTOR });
    author.moveEntity(hermit.id, room.id);
    return { world, player, room, hermit };
  };

  test('ASKING: free-text topic produces the normal unknown_topic response with verbatim text', () => {
    const { world, hermit } = setupPersonWorld();

    const command = createCommand(IFActions.ASKING, { entity: hermit, preposition: 'about' });
    command.topic = { text: 'the weather' };
    const context = createRealTestContext(askingAction, world, command);

    // Full valid path — the free-text topic never blocks the action.
    const validation = askingAction.validate(context);
    expect(validation.valid).toBe(true);

    askingAction.execute(context);
    const events = askingAction.report(context);
    const asked = events.find(e => e.type === 'if.event.asked')!;
    expect(asked).toBeDefined();
    expect((asked.data as any).messageId).toBe('if.action.asking.unknown_topic');
    // Verbatim topic text renders through params.
    expect((asked.data as any).params.topic).toBe('the weather');
    expect((asked.data as any).topicEntityId).toBeUndefined();
  });

  test('ASKING: an entity-resolved topic surfaces topicEntityId for interceptors', () => {
    const { world, room, hermit } = setupPersonWorld();
    const author = new AuthorModel(world.getDataStore(), world);
    const lantern = author.createEntity('lantern', EntityType.OBJECT);
    author.moveEntity(lantern.id, room.id);

    const command = createCommand(IFActions.ASKING, { entity: hermit, preposition: 'about' });
    command.topic = { text: 'lantern', entity: lantern.id };
    const context = createRealTestContext(askingAction, world, command);

    expect(askingAction.validate(context).valid).toBe(true);
    askingAction.execute(context);
    const events = askingAction.report(context);
    const asked = events.find(e => e.type === 'if.event.asked')!;
    expect((asked.data as any).topicEntityId).toBe(lantern.id);
    expect((asked.data as any).params.topic).toBe('lantern');
  });

  test('TELLING: an entity-resolved topic surfaces topicEntityId for interceptors', () => {
    const { world, room, hermit } = setupPersonWorld();
    const author = new AuthorModel(world.getDataStore(), world);
    const lantern = author.createEntity('lantern', EntityType.OBJECT);
    author.moveEntity(lantern.id, room.id);

    const command = createCommand(IFActions.TELLING, { entity: hermit, preposition: 'about' });
    command.topic = { text: 'lantern', entity: lantern.id };
    const context = createRealTestContext(tellingAction, world, command);

    expect(tellingAction.validate(context).valid).toBe(true);
    tellingAction.execute(context);
    const events = tellingAction.report(context);
    const told = events.find(e => e.type === 'if.event.told')!;
    expect((told.data as any).topicEntityId).toBe(lantern.id);
    expect((told.data as any).params.topic).toBe('lantern');
  });

  test('TELLING: free-text topic produces the normal not_interested response with verbatim text', () => {
    const { world, hermit } = setupPersonWorld();

    const command = createCommand(IFActions.TELLING, { entity: hermit, preposition: 'about' });
    command.topic = { text: 'the ancient stone door' };
    const context = createRealTestContext(tellingAction, world, command);

    const validation = tellingAction.validate(context);
    expect(validation.valid).toBe(true);

    tellingAction.execute(context);
    const events = tellingAction.report(context);
    const told = events.find(e => e.type === 'if.event.told')!;
    expect(told).toBeDefined();
    expect((told.data as any).messageId).toBe('if.action.telling.not_interested');
    expect((told.data as any).params.topic).toBe('the ancient stone door');
    expect((told.data as any).topicEntityId).toBeUndefined();
  });
});
