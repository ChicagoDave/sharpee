/**
 * Dialogue-selector socket tests (ADR-310 D15; contracts.md §5)
 *
 * The conversation actions consult the world's registered selector for
 * NPCs carrying CharacterModelTrait, emit its selection in place of the
 * default message, and fall through unchanged in every other case
 * (ADR-310 D7: no model, no change).
 */

import { describe, test, expect } from 'vitest';
import {
  WorldModel,
  AuthorModel,
  EntityType,
  TraitType,
  CharacterModelTrait,
  type DialogueSelector,
  type ConversationIntent,
  type DialogueSelectionContext,
  type IFEntity,
} from '@sharpee/world-model';
import { askingAction } from '../../../src/actions/standard/asking';
import { tellingAction } from '../../../src/actions/standard/telling';
import { talkingAction } from '../../../src/actions/standard/talking';
import { IFActions } from '../../../src/actions/constants';
import { createRealTestContext, createCommand } from '../../test-utils';

function setupPersonWorld(withCharacterModel: boolean) {
  const world = new WorldModel();
  const author = new AuthorModel(world.getDataStore(), world);
  const player = author.createEntity('yourself', EntityType.ACTOR);
  const room = author.createEntity('Hermitage', EntityType.ROOM);
  room.add({ type: TraitType.ROOM });
  author.moveEntity(player.id, room.id);
  world.setPlayer(player.id);
  const hermit = author.createEntity('hermit', EntityType.ACTOR);
  hermit.add({ type: TraitType.ACTOR });
  if (withCharacterModel) hermit.add(new CharacterModelTrait({}));
  author.moveEntity(hermit.id, room.id);
  return { world, player, room, hermit };
}

function runAsk(world: WorldModel, hermit: IFEntity, topicText: string) {
  const command = createCommand(IFActions.ASKING, { entity: hermit, preposition: 'about' });
  command.topic = { text: topicText };
  const context = createRealTestContext(askingAction, world, command);
  expect(askingAction.validate(context).valid).toBe(true);
  askingAction.execute(context);
  return askingAction.report(context).find(e => e.type === 'if.event.asked')!;
}

describe('conversation actions × the dialogue-selector socket (ADR-310 D15)', () => {
  test('ASK emits the selection for a modeled NPC and hands the selector the intent', () => {
    const { world, player, hermit } = setupPersonWorld(true);
    const seen: Array<{ npc: string; intent: ConversationIntent; ctx: DialogueSelectionContext }> = [];
    const selector: DialogueSelector = (npc, intent, ctx) => {
      seen.push({ npc: npc.id, intent, ctx });
      return { handled: true, messageId: 'character.conversation.hermit-answers', params: { flavor: 'gruff' } };
    };
    world.registerDialogueSelector(selector);

    const asked = runAsk(world, hermit, 'the weather');

    expect((asked.data as any).messageId).toBe('character.conversation.hermit-answers');
    expect((asked.data as any).params.flavor).toBe('gruff');
    // Default params survive the merge
    expect((asked.data as any).params.topic).toBe('the weather');
    expect(seen).toHaveLength(1);
    expect(seen[0].npc).toBe(hermit.id);
    expect(seen[0].intent).toEqual({ type: 'ask', text: 'the weather', topicEntityId: undefined });
    expect(seen[0].ctx.speakerId).toBe(player.id);
    expect(seen[0].ctx.world).toBe(world);
  });

  test('ASK: unmodeled NPC never reaches the selector — default unchanged (D7)', () => {
    const { world, hermit } = setupPersonWorld(false);
    let consulted = false;
    world.registerDialogueSelector(() => {
      consulted = true;
      return { handled: true, messageId: 'never.this' };
    });

    const asked = runAsk(world, hermit, 'the weather');

    expect(consulted).toBe(false);
    expect((asked.data as any).messageId).toBe('if.action.asking.unknown_topic');
  });

  test('ASK: no registered selector — default unchanged', () => {
    const { world, hermit } = setupPersonWorld(true);
    const asked = runAsk(world, hermit, 'the weather');
    expect((asked.data as any).messageId).toBe('if.action.asking.unknown_topic');
  });

  test('ASK: an unhandled selection falls through to the default', () => {
    const { world, hermit } = setupPersonWorld(true);
    world.registerDialogueSelector(() => ({ handled: false }));

    const asked = runAsk(world, hermit, 'the weather');

    expect((asked.data as any).messageId).toBe('if.action.asking.unknown_topic');
  });

  test('TELL consults with a tell intent', () => {
    const { world, hermit } = setupPersonWorld(true);
    const intents: ConversationIntent[] = [];
    world.registerDialogueSelector((_npc, intent) => {
      intents.push(intent);
      return { handled: true, messageId: 'character.conversation.hermit-listens' };
    });

    const command = createCommand(IFActions.TELLING, { entity: hermit, preposition: 'about' });
    command.topic = { text: 'the murder' };
    const context = createRealTestContext(tellingAction, world, command);
    expect(tellingAction.validate(context).valid).toBe(true);
    tellingAction.execute(context);
    const told = tellingAction.report(context).find(e => e.type === 'if.event.told')!;

    expect(intents[0].type).toBe('tell');
    expect((told.data as any).messageId).toBe('character.conversation.hermit-listens');
  });

  test('TALK TO consults with a talk-to intent and emits the unprefixed selection', () => {
    const { world, hermit } = setupPersonWorld(true);
    world.registerDialogueSelector((_npc, intent) =>
      intent.type === 'talk-to'
        ? { handled: true, messageId: 'character.conversation.greeting' }
        : undefined,
    );

    const command = createCommand(IFActions.TALKING, { entity: hermit });
    const context = createRealTestContext(talkingAction, world, command);
    expect(talkingAction.validate(context).valid).toBe(true);
    talkingAction.execute(context);
    const talked = talkingAction.report(context).find(e => e.type === 'if.event.talked')!;

    expect((talked.data as any).messageId).toBe('character.conversation.greeting');
  });

  test('ASK appends the selection\'s author-channel events to its report (ADR-318 D11)', () => {
    const { world, hermit } = setupPersonWorld(true);
    world.registerDialogueSelector(() => ({
      handled: true,
      messageId: 'character.conversation.hermit-answers',
      authorEvents: [{
        id: 'a1', type: 'character.author.ledger_mint', timestamp: 0,
        entities: { actor: hermit.id },
        data: { audience: 'player', factId: 'the-killer', claimedValue: 'nobody' },
      }],
    }));

    const command = createCommand(IFActions.ASKING, { entity: hermit, preposition: 'about' });
    command.topic = { text: 'the crime' };
    const context = createRealTestContext(askingAction, world, command);
    expect(askingAction.validate(context).valid).toBe(true);
    askingAction.execute(context);
    const events = askingAction.report(context);

    const mint = events.find(e => e.type === 'character.author.ledger_mint')!;
    expect(mint).toBeDefined();
    expect((mint.data as any).factId).toBe('the-killer');
  });

  test('registration is idempotent last-wins on the world instance (ADR-208 idiom)', () => {
    const world = new WorldModel();
    const first: DialogueSelector = () => ({ handled: true, messageId: 'first' });
    const second: DialogueSelector = () => ({ handled: true, messageId: 'second' });
    world.registerDialogueSelector(first);
    world.registerDialogueSelector(second);
    expect(world.getDialogueSelector()).toBe(second);
  });
});
