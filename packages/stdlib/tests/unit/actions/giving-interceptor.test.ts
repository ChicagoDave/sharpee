/**
 * Giving action — ADR-118 interceptor hooks (ADR-228 Phase 5 wiring).
 *
 * giving.ts was never wired for interceptors: per the ADR-118 hook audit
 * the item side was fully dead (no validate-phase block possible) and the
 * only story seam was the recipient's execute-phase-only ADR-090
 * capability behavior. These tests pin the new contract: preValidate veto
 * (nothing transferred), BOTH slots consulted in D3-B order (item first)
 * with symmetric seedData, postExecute after the standard transfer,
 * postReport emit/override, and the no-interceptor passthrough.
 */

import { describe, test, expect } from 'vitest';
import { givingAction } from '../../../src/actions/standard/giving';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, IFEntity } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  createCommand,
} from '../../test-utils';

const setup = () => {
  const { world, player, room } = setupBasicWorld();
  const coin = world.createEntity('gold coin', 'object');
  // Benign trait used purely as the item-side interceptor registration key.
  coin.add({ type: TraitType.READABLE, text: '' } as any);
  world.moveEntity(coin.id, player.id); // carried
  const npc = world.createEntity('old sailor', 'actor');
  npc.add({ type: TraitType.ACTOR });
  world.moveEntity(npc.id, room.id);
  return { world, player, room, coin, npc };
};

const drive = (world: WorldModel, item: IFEntity, recipient: IFEntity) => {
  const context = createRealTestContext(
    givingAction,
    world,
    createCommand(IFActions.GIVING, { entity: item, secondEntity: recipient, preposition: 'to' })
  );
  const validation = givingAction.validate(context);
  if (!validation.valid) {
    return { context, validation, events: givingAction.blocked(context, validation) };
  }
  givingAction.execute(context);
  return { context, validation, events: givingAction.report(context) };
};

describe('Giving interceptor hooks (ADR-118)', () => {
  test('recipient preValidate veto blocks the give — nothing is transferred', () => {
    const { world, player, coin, npc } = setup();
    world.registerActionInterceptor(TraitType.ACTOR, IFActions.GIVING, {
      preValidate() {
        return { valid: false, error: 'test.refuses_gift' };
      },
    });

    const { validation, events } = drive(world, coin, npc);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.refuses_gift');
    // THE state assertion: the coin was NOT transferred.
    expect(world.getLocation(coin.id)).toBe(player.id);
    expect(events.some(e => (e.data as any)?.blocked)).toBe(true);
  });

  test('item-side preValidate veto also blocks (previously fully-dead slot)', () => {
    const { world, player, coin, npc } = setup();
    world.registerActionInterceptor(TraitType.READABLE, IFActions.GIVING, {
      preValidate(_entity, _w, _actorId, sharedData) {
        // Symmetric seedData: the item side knows the recipient.
        expect(sharedData.recipientId).toBe(npc.id);
        return { valid: false, error: 'test.item_refuses_to_leave' };
      },
    });

    const { validation } = drive(world, coin, npc);

    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('test.item_refuses_to_leave');
    expect(world.getLocation(coin.id)).toBe(player.id);
  });

  test('both slots fire postExecute after the transfer, item (direct object) first (ADR-228 D3-B)', () => {
    const { world, coin, npc } = setup();
    const fired: string[] = [];
    world.registerActionInterceptor(TraitType.READABLE, IFActions.GIVING, {
      postExecute(entity, w, _actorId, sharedData) {
        fired.push('item');
        expect(entity.id).toBe(coin.id);
        expect(sharedData.recipientId).toBe(npc.id);
        // Standard transfer already happened (hook runs post-execute).
        expect(w.getLocation(coin.id)).toBe(npc.id);
      },
    });
    world.registerActionInterceptor(TraitType.ACTOR, IFActions.GIVING, {
      postExecute(entity, w, _actorId, sharedData) {
        fired.push('recipient');
        expect(entity.id).toBe(npc.id);
        // Symmetric seedData: the recipient side knows the item.
        expect(sharedData.itemId).toBe(coin.id);
        w.setStateValue('sailor.received_coin', true);
      },
    });

    drive(world, coin, npc);

    // THE critical assertions: actual state plus published order.
    expect(world.getLocation(coin.id)).toBe(npc.id);
    expect(world.getStateValue('sailor.received_coin')).toBe(true);
    expect(fired).toEqual(['item', 'recipient']);
  });

  test('postReport emit appends events and override rewrites the given messageId', () => {
    const { world, coin, npc } = setup();
    world.registerActionInterceptor(TraitType.ACTOR, IFActions.GIVING, {
      postReport() {
        return {
          override: { messageId: 'sailor.pockets_the_coin' },
          emit: [{ type: 'sailor.thanks', payload: { messageId: 'sailor.tips_hat' } }],
        };
      },
    });

    const { events } = drive(world, coin, npc);

    const given = events.find(e => e.type === 'if.event.given')!;
    expect((given.data as any).messageId).toBe('sailor.pockets_the_coin');
    expect(events.some(e => e.type === 'sailor.thanks')).toBe(true);
  });

  test('no interceptor: behavior unchanged, standard given event and transfer', () => {
    const { world, coin, npc } = setup();

    const { validation, events } = drive(world, coin, npc);

    expect(validation.valid).toBe(true);
    expect(world.getLocation(coin.id)).toBe(npc.id);
    const given = events.find(e => e.type === 'if.event.given')!;
    expect((given.data as any).messageId).toBe('if.action.giving.given');
  });
});
