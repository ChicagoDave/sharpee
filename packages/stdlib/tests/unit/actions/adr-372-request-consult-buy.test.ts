/**
 * Tests for the ADR-372 stdlib actions — asking_for, consulting, buying.
 *
 * Behavior Statement (asking_for):
 *   DOES    mutate nothing and report `if.event.asked_for` with the stock
 *           refusal `refused`; each slot names the other noun as its
 *           counterpart (D1).
 *   REJECTS asking oneself (`self`), a non-person (`not_actor`), a thing
 *           already held (`already_have`). Nothing moves either way.
 *
 * Behavior Statement (consulting):
 *   DOES    mutate nothing and report `if.event.consulted` with the stock
 *           `nothing_found`, reading the source from either seat.
 *   REJECTS an unreadable source (`not_consultable`), no topic (`no_topic`).
 *
 * Behavior Statement (buying):
 *   DOES    run the item's `if.action.buying` capability behavior, which owns
 *           the sale (here: move the item, lower a purse), and report its
 *           effects.
 *   REJECTS no `PurchasableTrait` (`not_for_sale`); a priced thing with no
 *           implementation (`not_for_sale`); the item already held
 *           (`already_have`); the behavior's own refusal (`cant_afford`).
 *           Nothing changes on a refusal.
 */

import { describe, test, expect } from 'vitest';
import {
  WorldModel,
  ActorTrait,
  ReadableTrait,
  PurchasableTrait,
  TraitType,
  type IFEntity,
} from '@sharpee/world-model';
import { askingForAction, askingForLifecycle } from '../../../src/actions/standard/asking_for';
import { consultingAction, consultingLifecycle } from '../../../src/actions/standard/consulting';
import { buyingAction } from '../../../src/actions/standard/buying';
import { interceptorConsultingActionIds } from '../../../src/actions/lifecycle/registry';
import { IFActions } from '../../../src/actions/constants';
import type { Action } from '../../../src/actions/enhanced-types';
import { runValidatePhase, runExecutePhase, runReportPhase, runBlockedPhase } from '../../../src/actions/lifecycle/phase-runner';
import { createRealTestContext, createCommand, setupBasicWorld, expectEvent } from '../../test-utils';

type Command = ReturnType<typeof createCommand>;

/** A command with a typed topic, as the parser's topic slot delivers it. */
function withTopic(command: Command, text: string): Command {
  (command as any).topic = { text };
  return command;
}

/** Drive the four phases as the executor does, attaching the validation result. */
function drive(action: Action, world: WorldModel, command: Command) {
  const context = createRealTestContext(action, world, command);
  const validation = runValidatePhase(action, context);
  (context as any).validationResult = validation;
  if (!validation.valid) {
    return { context, validation, events: runBlockedPhase(action, context, validation) };
  }
  runExecutePhase(action, context);
  return { context, validation, events: runReportPhase(action, context) };
}

/** A grocer in the room and a wrench on the counter. */
function grocerScene() {
  const { world, player, room } = setupBasicWorld();
  const grocer = world.createEntity('grocer', 'actor');
  grocer.add(new ActorTrait());
  world.moveEntity(grocer.id, room.id);
  const wrench = world.createEntity('wrench', 'object');
  world.moveEntity(wrench.id, room.id);
  return { world, player, room, grocer, wrench };
}

describe('askingForAction (ADR-372 D3)', () => {
  test('is wired: two slots, each naming the other noun as its counterpart', () => {
    expect(interceptorConsultingActionIds.has(IFActions.ASKING_FOR)).toBe(true);
    const { world, grocer, wrench } = grocerScene();
    const context = createRealTestContext(askingForAction, world, createCommand(IFActions.ASKING_FOR, { entity: grocer, secondEntity: wrench, preposition: 'for' }));
    const [recipient, item] = askingForLifecycle.slots;
    expect(recipient.counterpart!(context)?.id).toBe(wrench.id);
    expect(item.counterpart!(context)?.id).toBe(grocer.id);
  });

  test('an unauthored request speaks the stock refusal and moves nothing', () => {
    const { world, room, grocer, wrench } = grocerScene();
    const { validation, events } = drive(askingForAction, world, createCommand(IFActions.ASKING_FOR, { entity: grocer, secondEntity: wrench, preposition: 'for' }));
    expect(validation.valid).toBe(true);
    expectEvent(events, 'if.event.asked_for', { messageId: `${IFActions.ASKING_FOR}.refused`, recipientId: grocer.id, itemId: wrench.id });
    expect(world.getLocation(wrench.id)).toBe(room.id);
  });

  test('asking a thing that is not a person refuses not_actor', () => {
    const { world, room, wrench } = grocerScene();
    const crate = world.createEntity('crate', 'object');
    world.moveEntity(crate.id, room.id);
    const { validation, events } = drive(askingForAction, world, createCommand(IFActions.ASKING_FOR, { entity: crate, secondEntity: wrench, preposition: 'for' }));
    expect(validation.error).toBe('not_actor');
    expectEvent(events, 'if.event.ask_for_blocked', { messageId: `${IFActions.ASKING_FOR}.not_actor` });
    expect(world.getLocation(wrench.id)).toBe(room.id);
  });

  test('asking oneself refuses self', () => {
    const { world, player, wrench } = grocerScene();
    const { validation } = drive(askingForAction, world, createCommand(IFActions.ASKING_FOR, { entity: player, secondEntity: wrench, preposition: 'for' }));
    expect(validation.error).toBe('self');
  });

  test('asking for a thing already held refuses already_have and it stays held', () => {
    const { world, player, grocer, wrench } = grocerScene();
    world.moveEntity(wrench.id, player.id);
    const { validation } = drive(askingForAction, world, createCommand(IFActions.ASKING_FOR, { entity: grocer, secondEntity: wrench, preposition: 'for' }));
    expect(validation.error).toBe('already_have');
    expect(world.getLocation(wrench.id)).toBe(player.id);
  });
});

describe('consultingAction (ADR-372 D4)', () => {
  function directoryScene() {
    const { world, room } = setupBasicWorld();
    const directory = world.createEntity('station directory', 'object');
    directory.add(new ReadableTrait({ text: 'KEPLER STATION' }));
    world.moveEntity(directory.id, room.id);
    return { world, room, directory };
  }

  test('is wired: one source slot seeded with the topic', () => {
    expect(interceptorConsultingActionIds.has(IFActions.CONSULTING)).toBe(true);
    const { world, directory } = directoryScene();
    const context = createRealTestContext(consultingAction, world, withTopic(createCommand(IFActions.CONSULTING, { entity: directory }), 'plumbing'));
    expect(consultingLifecycle.slots.map((s) => s.id)).toEqual(['source']);
    expect(consultingLifecycle.slots[0].seedData!(context, directory)).toMatchObject({ topic: 'plumbing' });
  });

  test('an unmatched topic speaks nothing_found', () => {
    const { world, directory } = directoryScene();
    const { validation, events } = drive(consultingAction, world, withTopic(createCommand(IFActions.CONSULTING, { entity: directory }), 'plumbing'));
    expect(validation.valid).toBe(true);
    expectEvent(events, 'if.event.consulted', { messageId: `${IFActions.CONSULTING}.nothing_found`, sourceId: directory.id, topic: 'plumbing' });
  });

  test('the topic-first form reads the source from the indirect seat', () => {
    const { world, directory } = directoryScene();
    const command = withTopic(createCommand(IFActions.CONSULTING), 'vance');
    (command as any).indirectObject = { entity: directory, parsed: { text: directory.name } };
    const { validation, events } = drive(consultingAction, world, command);
    expect(validation.valid).toBe(true);
    expectEvent(events, 'if.event.consulted', { sourceId: directory.id, topic: 'vance' });
  });

  test('an unreadable source refuses not_consultable', () => {
    const { world, room } = setupBasicWorld();
    const rock = world.createEntity('rock', 'object');
    world.moveEntity(rock.id, room.id);
    const { validation, events } = drive(consultingAction, world, withTopic(createCommand(IFActions.CONSULTING, { entity: rock }), 'vance'));
    expect(validation.error).toBe('not_consultable');
    expectEvent(events, 'if.event.consult_blocked', { messageId: `${IFActions.CONSULTING}.not_consultable` });
  });

  test('no topic refuses no_topic', () => {
    const { world, directory } = directoryScene();
    const { validation } = drive(consultingAction, world, createCommand(IFActions.CONSULTING, { entity: directory }));
    expect(validation.error).toBe('no_topic');
  });
});

describe('buyingAction (ADR-372 D5)', () => {
  const PURSE = 'test.purse.credits';

  /** A ration bar priced at 3 credits, and a purse behavior registered on the trait. */
  function stallScene(purse: number) {
    const { world, player, room } = setupBasicWorld();
    world.setStateValue(PURSE, purse);
    const bar = world.createEntity('ration bar', 'object');
    bar.add(new PurchasableTrait({ price: 3, currency: 'credits' }));
    world.moveEntity(bar.id, room.id);
    world.registerCapabilityBehavior(TraitType.PURCHASABLE, IFActions.BUYING, {
      validate: (_e: IFEntity, w: WorldModel, _a: string, shared: Record<string, unknown>) =>
        (w.getStateValue(PURSE) as number) >= (shared.price as number)
          ? { valid: true }
          : { valid: false, error: 'if.action.buying.cant_afford' },
      execute: (e: IFEntity, w: WorldModel, actorId: string, shared: Record<string, unknown>) => {
        w.setStateValue(PURSE, (w.getStateValue(PURSE) as number) - (shared.price as number));
        w.moveEntity(e.id, actorId);
      },
      report: () => [{ type: 'if.event.bought', payload: { messageId: 'if.action.buying.bought' } }],
      blocked: (_e: IFEntity, _w: WorldModel, _a: string, error: string) => [{ type: 'if.event.buy_blocked', payload: { messageId: error } }],
    } as any);
    return { world, player, room, bar };
  }

  test('is wired', () => {
    expect(interceptorConsultingActionIds.has(IFActions.BUYING)).toBe(true);
  });

  test('a registered behavior is dispatched to: the item moves and the purse drops by the price', () => {
    const { world, player, room, bar } = stallScene(10);
    expect(world.getLocation(bar.id)).toBe(room.id);
    const { validation, events } = drive(buyingAction, world, createCommand(IFActions.BUYING, { entity: bar }));
    expect(validation.valid).toBe(true);
    expect(world.getLocation(bar.id)).toBe(player.id);
    expect(world.getStateValue(PURSE)).toBe(7);
    expectEvent(events, 'if.event.bought', { messageId: 'if.action.buying.bought' });
  });

  test('short of the price: the behavior refuses cant_afford and neither the item nor the purse changes', () => {
    const { world, room, bar } = stallScene(2);
    const { validation } = drive(buyingAction, world, createCommand(IFActions.BUYING, { entity: bar }));
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('if.action.buying.cant_afford');
    expect(world.getLocation(bar.id)).toBe(room.id);
    expect(world.getStateValue(PURSE)).toBe(2);
  });

  test('an unpriced thing refuses not_for_sale', () => {
    const { world, room } = setupBasicWorld();
    const gong = world.createEntity('brass gong', 'object');
    world.moveEntity(gong.id, room.id);
    const { validation, events } = drive(buyingAction, world, createCommand(IFActions.BUYING, { entity: gong }));
    expect(validation.error).toBe('not_for_sale');
    expectEvent(events, 'if.event.buy_blocked', { messageId: `${IFActions.BUYING}.not_for_sale` });
  });

  test('a priced thing with no implementation is not for sale either', () => {
    const { world, room } = setupBasicWorld();
    const flask = world.createEntity('flask', 'object');
    flask.add(new PurchasableTrait({ price: 4, currency: 'credits' }));
    world.moveEntity(flask.id, room.id);
    const { validation } = drive(buyingAction, world, createCommand(IFActions.BUYING, { entity: flask }));
    expect(validation.error).toBe('not_for_sale');
    expect(world.getLocation(flask.id)).toBe(room.id);
  });

  test('buying a thing already held refuses already_have and the purse is untouched', () => {
    const { world, player, bar } = stallScene(10);
    world.moveEntity(bar.id, player.id);
    const { validation } = drive(buyingAction, world, createCommand(IFActions.BUYING, { entity: bar }));
    expect(validation.error).toBe('already_have');
    expect(world.getStateValue(PURSE)).toBe(10);
  });
});
