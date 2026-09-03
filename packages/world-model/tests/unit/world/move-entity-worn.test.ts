/**
 * move-entity-worn.test.ts — GH #334: worn is a fact about location. An item
 * is worn only while it sits directly in its wearer, so `moveEntity` off the
 * wearer clears `worn`/`wornBy` at the one mutation point — an authorial
 * `move`, a put into a container, and an offstage move alike. A move that
 * keeps the location, or an unworn wearable arriving in an actor, leaves
 * the flag untouched. Every assertion reads the trait and the
 * carried/worn partition back from the world.
 */
import { describe, it, expect } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { TraitType } from '../../../src/traits/trait-types';
import { WearableTrait } from '../../../src/traits/wearable/wearableTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import '../../../src/traits/implementations';

function worldWithWornCloak() {
  const world = new WorldModel();
  const room = world.createEntity('Room', 'room');
  room.add({ type: TraitType.ROOM });
  const player = world.createEntity('player', 'actor');
  player.add(new ActorTrait());
  player.add(new ContainerTrait());
  world.setPlayer(player.id);
  world.moveEntity(player.id, room.id);

  const satchel = world.createEntity('satchel', 'container');
  satchel.add(new ContainerTrait());
  world.moveEntity(satchel.id, player.id);

  const cloak = world.createEntity('cloak', 'object');
  cloak.add(new WearableTrait({ isWorn: true, wornBy: player.id }));
  world.moveEntity(cloak.id, player.id);

  const wearable = () => cloak.get(TraitType.WEARABLE) as WearableTrait;
  return { world, room, player, satchel, cloak, wearable };
}

describe('GH #334: moveEntity clears the worn flag when a worn item leaves its wearer', () => {
  it('an authorial move to a room unwears the item', () => {
    const { world, room, player, cloak, wearable } = worldWithWornCloak();
    expect(wearable().worn).toBe(true);

    expect(world.moveEntity(cloak.id, room.id)).toBe(true);

    expect(world.getLocation(cloak.id)).toBe(room.id);
    expect(wearable().worn).toBe(false);
    expect(wearable().wornBy).toBeUndefined();
    expect(world.getCarriedAndWorn(player.id).worn).toEqual([]);
  });

  it('a put into a carried container unwears the item (the satchel case)', () => {
    const { world, satchel, player, cloak, wearable } = worldWithWornCloak();

    world.moveEntity(cloak.id, satchel.id);

    expect(world.getLocation(cloak.id)).toBe(satchel.id);
    expect(wearable().worn).toBe(false);
    expect(wearable().wornBy).toBeUndefined();
    // Taking it back leaves it carried, not worn.
    world.moveEntity(cloak.id, player.id);
    expect(world.getCarriedAndWorn(player.id).carried.map((e) => e.id)).toContain(cloak.id);
    expect(world.getCarriedAndWorn(player.id).worn).toEqual([]);
  });

  it('an offstage move unwears the item', () => {
    const { world, cloak, wearable } = worldWithWornCloak();

    world.moveEntity(cloak.id, null);

    expect(world.getLocation(cloak.id)).toBeUndefined();
    expect(wearable().worn).toBe(false);
  });

  it('a move that keeps the wearer as the location leaves the flag alone', () => {
    const { world, player, cloak, wearable } = worldWithWornCloak();

    world.moveEntity(cloak.id, player.id);

    expect(wearable().worn).toBe(true);
    expect(wearable().wornBy).toBe(player.id);
  });

  it('an unworn wearable arriving in an actor stays unworn', () => {
    const { world, room, player } = worldWithWornCloak();
    const hat = world.createEntity('hat', 'object');
    hat.add(new WearableTrait());
    world.moveEntity(hat.id, room.id);

    world.moveEntity(hat.id, player.id);

    expect((hat.get(TraitType.WEARABLE) as WearableTrait).worn).toBe(false);
    expect(world.getCarriedAndWorn(player.id).carried.map((e) => e.id)).toContain(hat.id);
  });
});
