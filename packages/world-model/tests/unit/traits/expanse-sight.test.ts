/**
 * Sight in an expanse (ADR-376 D6, D7, D9; Chord 4.0 Phase 13 Slice 2): where
 * a looker looks from, how far, through what, and what each sighting says.
 * Pure reads over the traits; each test asserts on the answer the actions
 * and scope will consume.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { EnterableTrait } from '../../../src/traits/enterable/enterableTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { VehicleTrait, type VehicleOpenMovement } from '../../../src/traits/vehicle/vehicleTrait';
import { ExpanseTrait } from '../../../src/traits/expanse/expanseTrait';
import { FloatingTrait } from '../../../src/traits/expanse/floatingTrait';
import { SightTrait } from '../../../src/traits/expanse/sightTrait';
import { LandmarkTrait, type ILandmarkData } from '../../../src/traits/expanse/landmarkTrait';
import { inSight, lookoutOf, sightingOf, sightOf } from '../../../src/world/SightBehavior';

describe('sight in an expanse (ADR-376 D6)', () => {
  let world: WorldModel;
  let ocean: IFEntity;
  let portRoyal: IFEntity;
  let azores: IFEntity;
  let marigold: IFEntity;
  let player: IFEntity;
  let telescope: IFEntity;

  /** A room; given landmark data, it carries the landmark's trait (its outlook). */
  function room(name: string, landmark?: ILandmarkData): IFEntity {
    const r = world.createEntity(name, EntityType.ROOM);
    r.add(new RoomTrait({ exits: {} }));
    r.add(new IdentityTrait({ name }));
    if (landmark) r.add(new LandmarkTrait(landmark));
    return r;
  }

  function ship(name: string, x: number, y: number, sight: number): IFEntity {
    const v = world.createEntity(name, EntityType.ITEM);
    v.add(new IdentityTrait({ name }));
    v.add(new ContainerTrait());
    v.add(new EnterableTrait());
    v.add(new VehicleTrait({ movement: { kind: 'open', drive: 'player', pace: 1, stride: 10, sight, position: { x, y } } }));
    world.moveEntity(v.id, ocean.id);
    return v;
  }

  beforeEach(() => {
    world = new WorldModel();
    portRoyal = room('Port Royal', { sight: 20 });
    azores = room('the Azores');
    ocean = room('the Western Ocean');
    ocean.add(new ExpanseTrait({ width: 1000, height: 500, landmarks: { [portRoyal.id]: { x: 40, y: 250 }, [azores.id]: { x: 610, y: 300 } } }));
    marigold = ship('the Marigold', 560, 300, 30);
    player = world.createEntity('player', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    world.moveEntity(player.id, marigold.id);
    telescope = world.createEntity('the brass telescope', EntityType.ITEM);
    telescope.add(new SightTrait({ sight: 75 }));
    world.moveEntity(telescope.id, marigold.id);
  });

  it('aboard, the lookout is the vehicle cell with its sight', () => {
    expect(lookoutOf(world, player)).toMatchObject({ expanse: ocean, cell: { x: 560, y: 300 }, sight: 30 });
  });

  it('a landmark fifty units off is out of sight to the eye and on the horizon through the telescope', () => {
    const lookout = lookoutOf(world, player)!;
    expect(sightingOf(world, lookout, azores)).toBeUndefined();
    expect(inSight(world, player, azores)).toBe(false);
    expect(sightingOf(world, lookout, azores, telescope)).toMatchObject({ distance: 50, band: 'in-the-distance', direction: 'EAST' });
    expect(inSight(world, player, azores, telescope)).toBe(true);
  });

  it('bands follow the sight in use: the same landmark closer is in the distance, then close by', () => {
    const model = marigold.get(VehicleTrait)!.movement as VehicleOpenMovement;
    model.position = { x: 590, y: 300 };
    expect(sightingOf(world, lookoutOf(world, player)!, azores)).toMatchObject({ distance: 20, band: 'in-the-distance' });
    model.position = { x: 605, y: 300 };
    expect(sightingOf(world, lookoutOf(world, player)!, azores)).toMatchObject({ distance: 5, band: 'close-by', direction: 'EAST' });
  });

  it('the expanse visibility caps the eye and the instrument alike', () => {
    ocean.get(ExpanseTrait)!.visibility = 5;
    const lookout = lookoutOf(world, player)!;
    expect(sightOf(lookout)).toBe(5);
    expect(sightOf(lookout, telescope)).toBe(5);
    expect(sightingOf(world, lookout, azores, telescope)).toBeUndefined();
  });

  it('another open vehicle and a floating thing are sighted the same way, with a direction', () => {
    const sloop = ship('the sloop', 560, 320, 10);
    const cask = world.createEntity('the cask', EntityType.ITEM);
    cask.add(new FloatingTrait({ position: { x: 555, y: 295 } }));
    world.moveEntity(cask.id, ocean.id);
    const lookout = lookoutOf(world, player)!;
    expect(sightingOf(world, lookout, sloop)).toMatchObject({ distance: 20, band: 'in-the-distance', direction: 'NORTH' });
    expect(sightingOf(world, lookout, cask)).toMatchObject({ band: 'close-by', direction: 'SOUTHWEST' });
    cask.get(FloatingTrait)!.position = { x: 500, y: 300 };
    expect(sightingOf(world, lookout, cask)).toBeUndefined();
  });

  it('a thing in another expanse or in no expanse is never sighted', () => {
    const pond = room('the pond');
    pond.add(new ExpanseTrait({ width: 5, height: 5 }));
    const duck = world.createEntity('duck', EntityType.ITEM);
    duck.add(new FloatingTrait({ position: { x: 1, y: 1 } }));
    world.moveEntity(duck.id, pond.id);
    const lookout = lookoutOf(world, player)!;
    expect(sightingOf(world, lookout, duck)).toBeUndefined();
    expect(sightingOf(world, lookout, telescope)).toBeUndefined();
  });

  it('out of the vehicle, the player looks from their own cell with the sight of the vehicle beside them (D9)', () => {
    world.moveEntity(player.id, ocean.id);
    player.add(new FloatingTrait({ position: { x: 560, y: 300 } }));
    expect(lookoutOf(world, player)).toMatchObject({ cell: { x: 560, y: 300 }, sight: 30 });
    (marigold.get(VehicleTrait)!.movement as VehicleOpenMovement).position = { x: 570, y: 300 };
    expect(lookoutOf(world, player)).toMatchObject({ cell: { x: 560, y: 300 }, sight: 0 });
    expect(sightingOf(world, lookoutOf(world, player)!, marigold)).toBeUndefined();
  });

  it('a landmark room with sight looks out over the expanse; one without sees nothing of it', () => {
    world.moveEntity(player.id, portRoyal.id);
    (marigold.get(VehicleTrait)!.movement as VehicleOpenMovement).position = { x: 55, y: 250 };
    const harbour = lookoutOf(world, player)!;
    expect(harbour).toMatchObject({ cell: { x: 40, y: 250 }, sight: 20 });
    expect(sightingOf(world, harbour, marigold)).toMatchObject({ distance: 15, band: 'on-the-horizon', direction: 'EAST' });
    expect(sightingOf(world, harbour, portRoyal)).toBeUndefined();
    expect(sightingOf(world, harbour, azores)).toBeUndefined();

    world.moveEntity(player.id, azores.id);
    expect(lookoutOf(world, player)).toMatchObject({ sight: 0 });
    expect(inSight(world, player, marigold)).toBe(false);
  });

  it('aboard an open vehicle at a landmark, the looker has the landmark room\'s outlook (GH #612)', () => {
    // At a landmark the vehicle holds no position (D5): the Marigold lies
    // in Port Royal, the player still aboard her.
    (marigold.get(VehicleTrait)!.movement as VehicleOpenMovement).position = null;
    world.moveEntity(marigold.id, portRoyal.id);
    const skiff = ship('the skiff', 55, 250, 5);
    expect(lookoutOf(world, player)).toMatchObject({ cell: { x: 40, y: 250 }, sight: 20 });
    expect(sightingOf(world, lookoutOf(world, player)!, skiff)).toMatchObject({ distance: 15, band: 'on-the-horizon', direction: 'EAST' });
    expect(inSight(world, player, skiff)).toBe(true);
    // Moored at a landmark without `sight:`, the vehicle's own sight does not apply either.
    world.moveEntity(marigold.id, azores.id);
    expect(lookoutOf(world, player)).toMatchObject({ sight: 0 });
    expect(inSight(world, player, skiff)).toBe(false);
  });

  it('a player in an ordinary room has no lookout', () => {
    const inn = room('the inn');
    world.moveEntity(player.id, inn.id);
    expect(lookoutOf(world, player)).toBeUndefined();
    expect(inSight(world, player, marigold)).toBe(false);
  });
});
