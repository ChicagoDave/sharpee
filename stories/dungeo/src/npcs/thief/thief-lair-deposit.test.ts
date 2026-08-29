/**
 * The thief's lair deposit (MDL ROBBER, act1.254:1078-1099; ADR-328 D5):
 * at his lair with the player absent, the thief drops every carried
 * treasure, concealed, and opens the egg. This is authorial mutation the
 * behavior performs directly (no standard action says "drop, concealed"),
 * so it is pinned here on world state.
 *
 * REAL-PATH: real WorldModel, the real thief entity, the real behavior's
 * `onTurn`; the acting seams (`act`/`narrate`) are guards that must not be
 * reached — a deposit turn acts nothing.
 */

import { describe, it, expect } from 'vitest';
import {
  WorldModel,
  EntityType,
  ActorTrait,
  ContainerTrait,
  IdentityTrait,
  OpenableTrait,
  RoomTrait,
  type IFEntity,
} from '@sharpee/world-model';
import type { NpcContext } from '@sharpee/stdlib';
import { createFixtureRandomService } from '../../test-support/fixture-random-service';
import { TreasureTrait, EggTrait } from '../../traits';
import { createThief } from './thief-entity';
import { thiefBehavior } from './thief-behavior';

function room(world: WorldModel, name: string): IFEntity {
  const r = world.createEntity(name, EntityType.ROOM);
  r.add(new RoomTrait());
  r.add(new ContainerTrait());
  return r;
}

function treasure(world: WorldModel, name: string, holder: IFEntity): IFEntity {
  const t = world.createEntity(name, EntityType.OBJECT);
  t.add(new IdentityTrait({ name }));
  t.add(new TreasureTrait({ trophyCaseValue: 5 }));
  world.moveEntity(t.id, holder.id);
  return t;
}

function stage(playerAtLair: boolean) {
  const world = new WorldModel();
  const lair = room(world, 'Treasure Room');
  const elsewhere = room(world, 'Cellar');
  const player = world.createEntity('yourself', EntityType.ACTOR);
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait());
  world.moveEntity(player.id, playerAtLair ? lair.id : elsewhere.id);
  world.setPlayer(player.id);

  const thief = createThief(world, lair.id);
  world.moveEntity(thief.id, lair.id);
  const jewel = treasure(world, 'jewel', thief);
  const egg = treasure(world, 'jeweled egg', thief);
  egg.add(new OpenableTrait({ isOpen: false }));
  egg.add(new EggTrait());

  const context: NpcContext = {
    npc: thief,
    world,
    random: createFixtureRandomService(1),
    turnCount: 1,
    playerLocation: world.getLocation(player.id)!,
    npcLocation: lair.id,
    npcInventory: world.getContents(thief.id),
    playerVisible: playerAtLair,
    getEntitiesInRoom: () => world.getContents(lair.id),
    getAvailableExits: () => [],
    act: () => { throw new Error('a deposit turn acts nothing'); },
    narrate: () => { throw new Error('a deposit turn narrates nothing'); },
  };
  return { world, lair, thief, jewel, egg, context };
}

describe("the thief's lair deposit (MDL ROBBER; ADR-328 D5)", () => {
  it('at the lair with the player gone, every treasure lands concealed and the egg opens', () => {
    const { world, lair, thief, jewel, egg, context } = stage(false);
    thief.attributes.thiefEngrossed = true;

    thiefBehavior.onTurn(context);

    expect(world.getLocation(jewel.id)).toBe(lair.id);
    expect(world.getLocation(egg.id)).toBe(lair.id);
    expect(jewel.get(IdentityTrait)!.concealed).toBe(true);
    expect(egg.get(IdentityTrait)!.concealed).toBe(true);
    expect(egg.get(OpenableTrait)!.isOpen).toBe(true);
    expect(egg.get(EggTrait)!.hasBeenOpened).toBe(true);
    expect(thief.attributes.thiefEngrossed).toBe(false);
  });

  it('with the player watching, nothing is deposited', () => {
    const { world, thief, jewel, egg, context } = stage(true);
    // The player is at the lair: the thief keeps his loot (and, this turn,
    // would stalk/steal — those acts are refused by the guard, which is the
    // point of the assertion below).
    context.act = () => ({ success: false, events: [] });
    context.narrate = () => undefined;

    thiefBehavior.onTurn(context);

    expect(world.getLocation(jewel.id)).toBe(thief.id);
    expect(world.getLocation(egg.id)).toBe(thief.id);
    expect(egg.get(OpenableTrait)!.isOpen).toBe(false);
  });
});
