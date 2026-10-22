/**
 * Sight and visibility as one system (alignment fixes Phase 2: F2, F3, F8,
 * D14, D19). Each answer has one home and the readers ask it:
 *
 * - `placeOf` answers an open vehicle moored at a landmark with the
 *   landmark's row (F8), so sending it reads that answer;
 * - `seenFromAfar` is sight's own answer for examining (D14), from the
 *   landmark trait or the open model (D19);
 * - `VisibilityBehavior.blocksSight` is the one predicate for a closed,
 *   opaque container (F2);
 * - `canSee` and `getVisible` read `isDarkFor` (F3).
 *
 * Tests assert on the answers against world state they set, and on where
 * a sent vehicle is afterwards.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { EnterableTrait } from '../../../src/traits/enterable/enterableTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { NightVisionTrait } from '../../../src/traits/night-vision/nightVisionTrait';
import { VehicleTrait, type VehicleOpenModel } from '../../../src/traits/vehicle/vehicleTrait';
import { ExpanseTrait } from '../../../src/traits/expanse/expanseTrait';
import { FloatingTrait } from '../../../src/traits/expanse/floatingTrait';
import { LandmarkTrait } from '../../../src/traits/expanse/landmarkTrait';
import { sendVehicle } from '../../../src/traits/vehicle/vehicleBehavior';
import { placeOf, holderOf } from '../../../src/world/ExpansePlaceBehavior';
import { lookoutOf, seenFromAfar, sightingOf } from '../../../src/world/SightBehavior';
import { VisibilityBehavior } from '../../../src/world/VisibilityBehavior';

describe('an expanse with a moored vehicle', () => {
  let world: WorldModel;
  let ocean: IFEntity;
  let port: IFEntity;
  let isle: IFEntity;
  let sloop: IFEntity;
  let barge: IFEntity;
  let cask: IFEntity;
  let player: IFEntity;

  function room(name: string): IFEntity {
    const r = world.createEntity(name, EntityType.ROOM);
    r.add(new RoomTrait({ exits: {} }));
    r.add(new IdentityTrait({ name }));
    return r;
  }

  function vessel(name: string, at: IFEntity, position: { x: number; y: number } | null, seenFromAfar?: string): IFEntity {
    const v = world.createEntity(name, EntityType.ITEM);
    v.add(new IdentityTrait({ name }));
    v.add(new ContainerTrait());
    v.add(new EnterableTrait());
    v.add(new VehicleTrait({ model: { kind: 'open', drive: 'player', pace: 1, stride: 1, sight: 10, position, ...(seenFromAfar ? { seenFromAfar } : {}) } }));
    world.moveEntity(v.id, at.id);
    return v;
  }

  const model = (v: IFEntity) => v.get(VehicleTrait)!.model as VehicleOpenModel;

  beforeEach(() => {
    world = new WorldModel();
    port = room('Port');
    port.add(new LandmarkTrait({ sight: 8, seenFromAfar: 'harbour lights' }));
    isle = room('Isle');
    isle.add(new LandmarkTrait({ seenFromAfar: 'a green smudge' }));
    ocean = room('Ocean');
    ocean.add(new ExpanseTrait({ width: 30, height: 30, landmarks: { [port.id]: { x: 2, y: 2 }, [isle.id]: { x: 6, y: 2 } } }));
    sloop = vessel('sloop', port, null, 'a white sail');
    barge = vessel('barge', ocean, { x: 4, y: 2 }, 'a low black hull');
    cask = world.createEntity('cask', EntityType.ITEM);
    cask.add(new FloatingTrait({ position: { x: 5, y: 2 } }));
    world.moveEntity(cask.id, ocean.id);
    player = world.createEntity('player', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    world.moveEntity(player.id, sloop.id);
  });

  describe('placeOf (F8)', () => {
    it('answers a moored vehicle with its landmark\'s row, marked as the landmark', () => {
      expect(placeOf(world, sloop)).toMatchObject({ expanse: ocean, cell: { x: 2, y: 2 }, landmark: port });
      expect(placeOf(world, port)).toMatchObject({ expanse: ocean, cell: { x: 2, y: 2 }, landmark: port });
    });

    it('answers a vehicle under way with its own cell, unmarked', () => {
      const place = placeOf(world, barge)!;
      expect(place).toMatchObject({ expanse: ocean, cell: { x: 4, y: 2 } });
      expect(place.landmark).toBeUndefined();
    });

    it('answers nothing for a moored vehicle in a room that is no landmark', () => {
      const shed = room('Shed');
      world.moveEntity(sloop.id, shed.id);
      expect(placeOf(world, sloop)).toBeUndefined();
    });

    it('sending a moored vehicle departs from its landmark\'s row', () => {
      expect(sendVehicle(world, sloop, isle.id)).toBe(true);
      expect(world.getLocation(sloop.id)).toBe(ocean.id);
      expect(model(sloop).position).toEqual({ x: 2, y: 2 });
      expect(model(sloop)).toMatchObject({ underWay: true, course: { x: 6, y: 2 } });
    });

    it('a moored vehicle is seen as part of its room, not on its own', () => {
      world.moveEntity(player.id, barge.id);
      const lookout = lookoutOf(world, player)!;
      expect(sightingOf(world, lookout, sloop)).toBeUndefined();
      expect(sightingOf(world, lookout, port)).toMatchObject({ distance: 2 });
      expect(holderOf(world, sloop)?.id).toBe(port.id);
    });

    it('aboard a moored vehicle the looker has the landmark\'s outlook, not the vehicle\'s sight', () => {
      expect(lookoutOf(world, player)).toMatchObject({ cell: { x: 2, y: 2 }, sight: 8 });
    });
  });

  describe('seenFromAfar (D14, D19)', () => {
    it('gives a far landmark\'s line from its LandmarkTrait, and a far vehicle\'s from its model', () => {
      expect(seenFromAfar(world, player, isle)).toBe('a green smudge');
      expect(seenFromAfar(world, player, barge)).toBe('a low black hull');
    });

    it('gives nothing for the looker\'s own room, a floating thing, or a thing out of sight', () => {
      expect(seenFromAfar(world, player, port)).toBeUndefined();
      expect(seenFromAfar(world, player, cask)).toBeUndefined();
      port.get(LandmarkTrait)!.sight = 1;
      expect(seenFromAfar(world, player, isle)).toBeUndefined();
    });

    it('gives nothing for a thing at the looker\'s own cell, nor for one held inside another', () => {
      world.moveEntity(player.id, barge.id);
      const twin = vessel('twin', ocean, { x: 4, y: 2 }, 'a twin hull');
      expect(seenFromAfar(world, player, twin)).toBeUndefined();
      const lamp = world.createEntity('lamp', EntityType.ITEM);
      lamp.add(new IdentityTrait({ name: 'lamp' }));
      world.moveEntity(lamp.id, isle.id);
      expect(seenFromAfar(world, player, lamp)).toBeUndefined();
    });

    it('gives nothing to a looker in no expanse', () => {
      const inn = room('Inn');
      world.moveEntity(player.id, inn.id);
      expect(seenFromAfar(world, player, isle)).toBeUndefined();
    });
  });
});

describe('blocked sight and darkness, one definition each (F2, F3)', () => {
  let world: WorldModel;
  let cellar: IFEntity;
  let player: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    cellar = world.createEntity('Cellar', EntityType.ROOM);
    cellar.add(new RoomTrait({ exits: {}, requiresLight: true }));
    player = world.createEntity('player', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    world.moveEntity(player.id, cellar.id);
  });

  it('a closed opaque container blocks sight; open, transparent or lidless does not', () => {
    const chest = world.createEntity('chest', EntityType.CONTAINER);
    chest.add(new ContainerTrait());
    chest.add(new OpenableTrait({ isOpen: false }));
    expect(VisibilityBehavior.blocksSight(chest)).toBe(true);
    chest.get(OpenableTrait)!.isOpen = true;
    expect(VisibilityBehavior.blocksSight(chest)).toBe(false);

    const jar = world.createEntity('jar', EntityType.CONTAINER);
    jar.add(new ContainerTrait({ isTransparent: true }));
    jar.add(new OpenableTrait({ isOpen: false }));
    expect(VisibilityBehavior.blocksSight(jar)).toBe(false);

    const bowl = world.createEntity('bowl', EntityType.CONTAINER);
    bowl.add(new ContainerTrait());
    expect(VisibilityBehavior.blocksSight(bowl)).toBe(false);
  });

  it('in a room dark to the observer, only what they carry is seen; night vision sees the room\'s contents', () => {
    const crate = world.createEntity('crate', EntityType.ITEM);
    world.moveEntity(crate.id, cellar.id);
    const coin = world.createEntity('coin', EntityType.ITEM);
    world.moveEntity(coin.id, player.id);

    expect(VisibilityBehavior.isDarkFor(player, cellar, world)).toBe(true);
    expect(VisibilityBehavior.canSee(player, crate, world)).toBe(false);
    expect(VisibilityBehavior.canSee(player, coin, world)).toBe(true);
    expect(VisibilityBehavior.getVisible(player, world).map((e) => e.id)).not.toContain(crate.id);

    player.add(new NightVisionTrait());
    expect(VisibilityBehavior.isDarkFor(player, cellar, world)).toBe(false);
    expect(VisibilityBehavior.canSee(player, crate, world)).toBe(true);
    expect(VisibilityBehavior.getVisible(player, world).map((e) => e.id)).toContain(crate.id);
  });
});
