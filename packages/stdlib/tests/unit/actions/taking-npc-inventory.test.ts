/**
 * taking-npc-inventory.test.ts — GH #313: an item another actor carries
 * resolves for `take` at VISIBLE scope and reaches the action's validate,
 * where the reach check refuses it (ADR-273 D4: another actor's inventory
 * is visible, not reachable) and the item stays put; with
 * OpenInventoryTrait on the holder the take succeeds and the item moves to
 * the taker. Assertions read the validation result and world location.
 */
import { describe, test, expect } from 'vitest';
import { takingAction } from '../../../src/actions/standard/taking';
import { IFActions } from '../../../src/actions/constants';
import { ScopeLevel } from '../../../src/scope';
import { ActorTrait, ContainerTrait, OpenInventoryTrait, type IFEntity } from '@sharpee/world-model';
import { createRealTestContext, setupBasicWorld, executeWithValidation, createCommand } from '../../test-utils';

function worldWithMonkey(openInventory: boolean) {
  const { world, player, room } = setupBasicWorld();
  const monkey = world.createEntity('monkey', 'actor');
  monkey.add(new ActorTrait());
  monkey.add(new ContainerTrait());
  if (openInventory) monkey.add(new OpenInventoryTrait());
  world.moveEntity(monkey.id, room.id);
  const necklace = world.createEntity('necklace', 'object');
  world.moveEntity(necklace.id, monkey.id);
  return { world, player, monkey, necklace };
}

describe('GH #313: taking from another actor’s inventory', () => {
  test('the action resolves its target at VISIBLE and prefers REACHABLE', () => {
    expect(takingAction.metadata.directObjectScope).toBe(ScopeLevel.VISIBLE);
    expect(takingAction.metadata.preferredScope).toBe(ScopeLevel.REACHABLE);
  });

  test('a carried item reaches validate and is refused as not reachable, staying with the holder', () => {
    const { world, monkey, necklace } = worldWithMonkey(false);
    const command = createCommand(IFActions.TAKING, { entity: necklace });
    const context = createRealTestContext(takingAction, world, command);

    const result = takingAction.validate(context);

    expect(result.valid).toBe(false);
    expect(String(result.error)).toContain('not_reachable');
    expect(world.getLocation(necklace.id)).toBe(monkey.id);
  });

  test('with OpenInventoryTrait on the holder the take succeeds and the item moves to the taker', () => {
    const { world, player, necklace } = worldWithMonkey(true);
    const command = createCommand(IFActions.TAKING, { entity: necklace });
    const context = createRealTestContext(takingAction, world, command);

    const events = executeWithValidation(takingAction, context);

    expect(events.some((e: IFEntity | { type: string }) => (e as { type: string }).type === 'if.event.taken')).toBe(true);
    expect(world.getLocation(necklace.id)).toBe(player.id);
  });
});
