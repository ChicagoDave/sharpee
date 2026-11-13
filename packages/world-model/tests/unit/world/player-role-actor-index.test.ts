/**
 * player-role-actor-index.test.ts — the player-role lookup scans actors only,
 * through an index that is never stale (ADR-390 D1, ADR-348).
 *
 * The world stores no holder: `playerCharacter` reads each actor's role flag
 * on every call. What it no longer does is ask every entity in the world
 * whether it is an actor. These tests pin both halves: a lookup touches no
 * entity without the actor trait, and the index behind it still finds an
 * actor added by hand, a flag flipped by hand, and the actors of a world
 * that was just loaded.
 *
 * Owner context: world-model test suite.
 */
import { describe, expect, it, vi } from 'vitest';
import { ActorTrait, IdentityTrait, WorldModel, type IFEntity } from '../../../src';

function worldWithPlayer(): { world: WorldModel; player: IFEntity; things: IFEntity[] } {
  const world = new WorldModel();
  const room = world.createEntity('hall', 'room');
  const player = world.createEntity('player', 'actor');
  player.add(new ActorTrait({ isPlayable: true }));
  world.moveEntity(player.id, room.id);
  world.setPlayer(player.id);
  const things = ['lamp', 'rug', 'vase'].map((name) => {
    const thing = world.createEntity(name, 'item');
    thing.add(new IdentityTrait({ name }));
    world.moveEntity(thing.id, room.id);
    return thing;
  });
  return { world, player, things: [room, ...things] };
}

describe('the player-role lookup', () => {
  it('reads no entity that carries no actor trait', () => {
    const { world, player, things } = worldWithPlayer();
    expect(world.playerCharacter.id).toBe(player.id);
    const spies = things.flatMap((thing) => [vi.spyOn(thing, 'has'), vi.spyOn(thing, 'get')]);
    for (let read = 0; read < 5; read++) {
      expect(world.playerCharacter.id).toBe(player.id);
      expect(world.hasPlayerCharacter).toBe(true);
    }
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('finds an actor added by hand after the world was built, and reads a hand-flipped flag live', () => {
    const { world, player } = worldWithPlayer();
    expect(world.playerCharacter.id).toBe(player.id);

    // A second actor, its trait added after the index was built.
    const guard = world.createEntity('guard', 'item');
    expect(world.playerCharacter.id).toBe(player.id);
    const guardActor = new ActorTrait({ isPlayable: true });
    guard.add(guardActor);
    world.changePlayer(guard.id);
    expect(world.playerCharacter.id).toBe(guard.id);
    expect((player.get('actor') as ActorTrait).isPlayer).toBe(false);

    // The flag flipped by hand, with no call the world could observe: the next read sees it.
    guardActor.isPlayer = false;
    expect(world.hasPlayerCharacter).toBe(false);
    expect(() => world.playerCharacter).toThrow('No actor holds the player role yet');
    (player.get('actor') as ActorTrait).isPlayer = true;
    expect(world.playerCharacter.id).toBe(player.id);

    // Two flags by hand: the invariant's error still names both holders.
    guardActor.isPlayer = true;
    expect(() => world.playerCharacter).toThrow(/The player role has 2 holders/);
  });

  it('finds an actor whose trait was written past add(), and forgets one whose trait was removed', () => {
    const { world, player } = worldWithPlayer();
    const ghost = world.createEntity('ghost', 'item');
    expect(world.playerCharacter.id).toBe(player.id);
    const ghostActor = new ActorTrait({ isPlayable: true });
    ghostActor.isPlayer = true;
    ghost.traits.set(ghostActor.type as Parameters<typeof ghost.traits.set>[0], ghostActor);
    expect(() => world.playerCharacter).toThrow(/The player role has 2 holders/);
    ghost.remove('actor');
    expect(world.playerCharacter.id).toBe(player.id);
  });

  it('forgets an actor removed from the world', () => {
    const { world, player } = worldWithPlayer();
    expect(world.hasPlayerCharacter).toBe(true);
    world.removeEntity(player.id);
    expect(world.hasPlayerCharacter).toBe(false);
  });

  it('forgets every actor when the world is cleared', () => {
    const { world } = worldWithPlayer();
    expect(world.hasPlayerCharacter).toBe(true);
    world.clear();
    expect(world.hasPlayerCharacter).toBe(false);
  });

  it('finds an actor built before the index and put into the world after it, with no trait written in between', () => {
    const { world, player } = worldWithPlayer();
    const other = new WorldModel();
    const visitor = other.createEntity('visitor', 'actor');
    const visitorActor = new ActorTrait({ isPlayable: true });
    visitorActor.isPlayer = true;
    visitor.add(visitorActor);
    // The index is built now, after every trait write above.
    expect(world.playerCharacter.id).toBe(player.id);
    world.getDataStore().entities.set('visitor-in-this-world', visitor);
    expect(() => world.playerCharacter).toThrow(/The player role has 2 holders/);
  });

  it('a load rebuilds the index: the holder is the loaded world\'s entity, not the one it replaced', () => {
    const { world, player } = worldWithPlayer();
    const saved = world.toJSON();
    const guard = world.createEntity('guard', 'actor');
    guard.add(new ActorTrait({ isPlayable: true }));
    world.changePlayer(guard.id);
    expect(world.playerCharacter.id).toBe(guard.id);

    world.loadJSON(saved);
    const holder = world.playerCharacter;
    expect(holder.id).toBe(player.id);
    expect(holder).toBe(world.getEntity(player.id));
    expect(holder).not.toBe(player);
    expect(world.getEntity(guard.id)).toBeUndefined();
  });
});
