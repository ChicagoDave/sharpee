/**
 * Sight as scope, reach as the cell, and the player in the expanse (ADR-376
 * D6, D9, D10; Chord 4.0 Phase 13 Slice 4): `canSee`, `getVisible` and
 * `canReach` across an expanse, the actor leaving and boarding an open
 * vehicle there, and what the expanse makes of a thing dropped into it.
 * Each test asserts on the world's own answers and on trait fields.
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
import { VehicleTrait, type VehicleOpenModel } from '../../../src/traits/vehicle/vehicleTrait';
import { ExpanseTrait } from '../../../src/traits/expanse/expanseTrait';
import { FloatingTrait } from '../../../src/traits/expanse/floatingTrait';
import { VisibilityBehavior } from '../../../src/world/VisibilityBehavior';
import { ReachabilityBehavior } from '../../../src/world/ReachabilityBehavior';
import { boardFromExpanse, leaveVehicleIntoExpanse, stepVehicle, startVehicle } from '../../../src/traits/vehicle/vehicleBehavior';
import { clearFloatingPosition, receiveInExpanse } from '../../../src/traits/expanse/expanseBehavior';
import { holderOf } from '../../../src/world/ExpansePlaceBehavior';
import { LandmarkTrait, type ILandmarkData } from '../../../src/traits/expanse/landmarkTrait';

describe('scope in an expanse (ADR-376 D6, D10)', () => {
  let world: WorldModel;
  let ocean: IFEntity;
  let port: IFEntity;
  let azores: IFEntity;
  let marigold: IFEntity;
  let sloop: IFEntity;
  let lamp: IFEntity;
  let cask: IFEntity;
  let player: IFEntity;

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
    v.add(new VehicleTrait({ model: { kind: 'open', drive: 'player', pace: 1, stride: 1, sight, position: { x, y } }, commands: ['compass'] }));
    world.moveEntity(v.id, ocean.id);
    return v;
  }

  beforeEach(() => {
    world = new WorldModel();
    port = room('Port Royal', { sight: 20 });
    azores = room('the Azores');
    ocean = room('the Western Ocean');
    ocean.add(new ExpanseTrait({ width: 100, height: 100, landmarks: { [port.id]: { x: 10, y: 50 }, [azores.id]: { x: 60, y: 50 } }, drift: 3 }));
    marigold = ship('the Marigold', 40, 50, 30);
    sloop = ship('the sloop', 65, 50, 10);
    lamp = world.createEntity('lamp', EntityType.ITEM);
    world.moveEntity(lamp.id, sloop.id);
    cask = world.createEntity('the cask', EntityType.ITEM);
    cask.add(new FloatingTrait({ position: { x: 42, y: 50 } }));
    world.moveEntity(cask.id, ocean.id);
    player = world.createEntity('player', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    world.moveEntity(player.id, marigold.id);
    world.setPlayer(player.id);
  });

  it('aboard, a landmark, a ship, a floating thing and what the ship holds are seen only within sight', () => {
    // From (40,50) with sight 30: the Azores at 20 and the cask at 2 are in sight; the sloop at 25 is too, its lamp with it.
    expect(VisibilityBehavior.canSee(player, azores, world)).toBe(true);
    expect(VisibilityBehavior.canSee(player, cask, world)).toBe(true);
    expect(VisibilityBehavior.canSee(player, sloop, world)).toBe(true);
    expect(VisibilityBehavior.canSee(player, port, world)).toBe(true);
    expect(VisibilityBehavior.canSee(player, marigold, world)).toBe(true);
    (sloop.get(VehicleTrait)!.model as VehicleOpenModel).position = { x: 80, y: 50 };
    expect(VisibilityBehavior.canSee(player, sloop, world)).toBe(false);
    expect(VisibilityBehavior.canSee(player, lamp, world)).toBe(false);
    cask.get(FloatingTrait)!.position = { x: 90, y: 90 };
    expect(VisibilityBehavior.canSee(player, cask, world)).toBe(false);
    (marigold.get(VehicleTrait)!.model as VehicleOpenModel).sight = 5;
    expect(VisibilityBehavior.canSee(player, azores, world)).toBe(false);
    expect(VisibilityBehavior.canSee(player, port, world)).toBe(false);
  });

  it('getVisible lists the landmarks and things in sight from the ship, and the ships from a landmark with sight', () => {
    const fromShip = VisibilityBehavior.getVisible(player, world).map((e) => e.id);
    expect(fromShip).toContain(azores.id);
    expect(fromShip).toContain(port.id);
    expect(fromShip).toContain(cask.id);
    expect(fromShip).toContain(sloop.id);

    world.moveEntity(player.id, port.id);
    (marigold.get(VehicleTrait)!.model as VehicleOpenModel).position = { x: 25, y: 50 };
    const fromPort = VisibilityBehavior.getVisible(player, world).map((e) => e.id);
    expect(fromPort).toContain(marigold.id);
    expect(fromPort).not.toContain(sloop.id);
    expect(VisibilityBehavior.canSee(player, marigold, world)).toBe(true);
    expect(VisibilityBehavior.canSee(player, port, world)).toBe(true);

    world.moveEntity(player.id, azores.id);
    expect(VisibilityBehavior.canSee(player, sloop, world)).toBe(false);
    expect(VisibilityBehavior.getVisible(player, world).map((e) => e.id)).not.toContain(sloop.id);
  });

  it('reach is the cell: a floating thing is reachable from a ship in its cell and from nowhere else', () => {
    expect(ReachabilityBehavior.canReach(player, cask, world)).toBe(false);
    cask.get(FloatingTrait)!.position = { x: 40, y: 50 };
    expect(ReachabilityBehavior.canReach(player, cask, world)).toBe(true);
    expect(ReachabilityBehavior.canReach(player, sloop, world)).toBe(false);
    expect(ReachabilityBehavior.canReach(player, lamp, world)).toBe(false);
    (sloop.get(VehicleTrait)!.model as VehicleOpenModel).position = { x: 40, y: 50 };
    expect(ReachabilityBehavior.canReach(player, sloop, world)).toBe(true);
  });

  it('holderOf climbs to the positioned thing', () => {
    expect(holderOf(world, lamp)?.id).toBe(sloop.id);
    expect(holderOf(world, player)?.id).toBe(marigold.id);
    expect(holderOf(world, cask)?.id).toBe(cask.id);
    expect(holderOf(world, azores)?.id).toBe(azores.id);
    const inn = room('the inn');
    expect(holderOf(world, inn)).toBeUndefined();
  });
});

describe('the player out of the vehicle, and things overboard (ADR-376 D9, D10)', () => {
  let world: WorldModel;
  let belt: IFEntity;
  let platform: IFEntity;
  let skiff: IFEntity;
  let player: IFEntity;

  function room(name: string): IFEntity {
    const r = world.createEntity(name, EntityType.ROOM);
    r.add(new RoomTrait({ exits: {} }));
    r.add(new IdentityTrait({ name }));
    return r;
  }

  function model(): VehicleOpenModel {
    return skiff.get(VehicleTrait)!.model as VehicleOpenModel;
  }

  beforeEach(() => {
    world = new WorldModel();
    platform = room('the Platform');
    belt = room('the Belt');
    belt.add(new ExpanseTrait({ width: 20, height: 20, landmarks: { [platform.id]: { x: 3, y: 3 } }, drift: 2 }));
    skiff = world.createEntity('the skiff', EntityType.ITEM);
    skiff.add(new IdentityTrait({ name: 'the skiff' }));
    skiff.add(new ContainerTrait());
    skiff.add(new EnterableTrait());
    skiff.add(new VehicleTrait({ model: { kind: 'open', drive: 'player', pace: 1, stride: 1, sight: 6, position: { x: 5, y: 5 } }, commands: ['compass'] }));
    world.moveEntity(skiff.id, belt.id);
    player = world.createEntity('player', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    world.moveEntity(player.id, skiff.id);
  });

  it('leaving puts the actor in the expanse at the vehicle cell; the machine holds; boarding drops the position and it resumes', () => {
    startVehicle(world, skiff, 'EAST');
    expect(leaveVehicleIntoExpanse(world, player, skiff)).toBe(true);
    expect(world.getLocation(player.id)).toBe(belt.id);
    expect(player.get(FloatingTrait)!.position).toEqual({ x: 5, y: 5 });
    expect(stepVehicle(world, skiff)).toBeUndefined();
    expect(model().position).toEqual({ x: 5, y: 5 });
    expect(boardFromExpanse(player)).toBe(true);
    expect(player.get(FloatingTrait)!.position).toBeNull();
    world.moveEntity(player.id, skiff.id);
    stepVehicle(world, skiff);
    expect(model().position).toEqual({ x: 6, y: 5 });
    expect(boardFromExpanse(player)).toBe(false);
  });

  it('leaving a vehicle at a landmark or out of any expanse is not the expanse\'s business', () => {
    world.moveEntity(skiff.id, platform.id);
    model().position = null;
    expect(leaveVehicleIntoExpanse(world, player, skiff)).toBe(false);
    expect(world.getLocation(player.id)).toBe(skiff.id);
    expect(player.get(FloatingTrait)).toBeUndefined();
  });

  it('a floating thing received by the expanse floats at the cell; anything else is lost offstage', () => {
    const cask = world.createEntity('the cask', EntityType.ITEM);
    cask.add(new FloatingTrait());
    world.moveEntity(cask.id, skiff.id);
    const anchor = world.createEntity('the anchor', EntityType.ITEM);
    world.moveEntity(anchor.id, skiff.id);
    expect(receiveInExpanse(world, cask, belt.id, { x: 5, y: 5 })).toBe('floats');
    expect(world.getLocation(cask.id)).toBe(belt.id);
    expect(cask.get(FloatingTrait)!.position).toEqual({ x: 5, y: 5 });
    expect(receiveInExpanse(world, anchor, belt.id, { x: 5, y: 5 })).toBe('lost');
    expect(world.getLocation(anchor.id)).toBeUndefined();
    expect(clearFloatingPosition(cask)).toBe(true);
    expect(cask.get(FloatingTrait)!.position).toBeNull();
    expect(clearFloatingPosition(cask)).toBe(false);
    expect(clearFloatingPosition(anchor)).toBe(false);
  });
});
