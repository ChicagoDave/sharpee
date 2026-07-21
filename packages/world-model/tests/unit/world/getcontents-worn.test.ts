/**
 * getcontents-worn.test.ts — ADR-247: getContents() includes worn items
 * unconditionally (the filter option is deleted), and getCarriedAndWorn()
 * is the carried/worn partition. Covers the ADR's acceptance-criteria
 * categories: worn item appears in contents / visible contents, and the
 * partition classifies correctly (save/restore is in trait-rehydration.test).
 */
import { describe, it, expect } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { VisibilityBehavior } from '../../../src/world/VisibilityBehavior';
import { TraitType } from '../../../src/traits/trait-types';
import { WearableTrait } from '../../../src/traits/wearable/wearableTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import '../../../src/traits/implementations';

function worldWithDressedPlayer() {
  const world = new WorldModel();
  const room = world.createEntity('Room', 'room');
  room.add({ type: TraitType.ROOM });
  const player = world.createEntity('player', 'actor');
  player.add(new ActorTrait());
  player.add(new ContainerTrait());
  world.setPlayer(player.id);
  world.moveEntity(player.id, room.id);

  const cloak = world.createEntity('cloak', 'object');
  cloak.add(new WearableTrait({ isWorn: true, wornBy: player.id }));
  world.moveEntity(cloak.id, player.id);

  const lamp = world.createEntity('lamp', 'object');
  world.moveEntity(lamp.id, player.id);

  return { world, room, player, cloak, lamp };
}

describe('ADR-247: getContents includes worn items', () => {
  it('returns worn AND held items — no filter option', () => {
    const { world, player, cloak, lamp } = worldWithDressedPlayer();
    const ids = world.getContents(player.id).map(e => e.id);
    expect(ids).toContain(cloak.id);
    expect(ids).toContain(lamp.id);
  });

  it('a worn item appears in visible contents (LOOK/EXAMINE path)', () => {
    const { world, player, cloak } = worldWithDressedPlayer();
    const visibleIds = VisibilityBehavior.getVisibleContents(player, world).map(e => e.id);
    expect(visibleIds).toContain(cloak.id);
  });
});

describe('ADR-247: getCarriedAndWorn partition', () => {
  it('splits worn from held', () => {
    const { world, player, cloak, lamp } = worldWithDressedPlayer();
    const { carried, worn } = world.getCarriedAndWorn(player.id);
    expect(worn.map(e => e.id)).toEqual([cloak.id]);
    expect(carried.map(e => e.id)).toEqual([lamp.id]);
  });

  it('worn is empty for a holder with no wearables', () => {
    const { world, player, cloak, lamp } = worldWithDressedPlayer();
    // Take the cloak off — now nothing is worn.
    (cloak.get(TraitType.WEARABLE) as WearableTrait).isWorn = false;
    const { carried, worn } = world.getCarriedAndWorn(player.id);
    expect(worn).toEqual([]);
    expect(carried.map(e => e.id).sort()).toEqual([cloak.id, lamp.id].sort());
  });
});
