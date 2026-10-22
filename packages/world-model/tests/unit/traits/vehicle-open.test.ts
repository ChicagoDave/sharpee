/**
 * The open movement model (ADR-376 D3, D5, D8, D9, D10; Chord 4.0 Phase 13
 * Slice 2): a vehicle with a position in an expanse, stepped along a heading
 * or toward a course, its path walked cell by cell. Each test asserts on the
 * vehicle's location and the trait's fields, never on a copy.
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
import {
  edgePhraseOf,
  isUnderWay,
  sendVehicle,
  startVehicle,
  stepVehicle,
  stopVehicle,
} from '../../../src/traits/vehicle/vehicleBehavior';

describe('the open model (ADR-376)', () => {
  let world: WorldModel;
  let belt: IFEntity;
  let platform: IFEntity;
  let derelict: IFEntity;
  let skiff: IFEntity;
  let player: IFEntity;

  function room(name: string, data: ConstructorParameters<typeof RoomTrait>[0] = {}): IFEntity {
    const r = world.createEntity(name, EntityType.ROOM);
    r.add(new RoomTrait({ exits: {}, ...data }));
    r.add(new IdentityTrait({ name }));
    return r;
  }

  function openVehicle(name: string, at: IFEntity, overrides: Partial<VehicleOpenModel> = {}): IFEntity {
    const v = world.createEntity(name, EntityType.ITEM);
    v.add(new IdentityTrait({ name }));
    v.add(new ContainerTrait());
    v.add(new EnterableTrait());
    v.add(new VehicleTrait({
      model: { kind: 'open', drive: 'player', pace: 1, stride: 1, sight: 6, position: { x: 3, y: 4 }, ...overrides },
      commands: ['compass', 'coordinates'],
    }));
    world.moveEntity(v.id, at.id);
    return v;
  }

  function model(v: IFEntity): VehicleOpenModel {
    return v.get(VehicleTrait)!.model as VehicleOpenModel;
  }

  function tick(v: IFEntity, turns: number) {
    let last;
    for (let i = 0; i < turns; i++) last = stepVehicle(world, v);
    return last;
  }

  beforeEach(() => {
    world = new WorldModel();
    platform = room('the Mining Platform');
    derelict = room('the Derelict');
    belt = room('the Belt');
    belt.add(new ExpanseTrait({
      width: 20,
      height: 20,
      landmarks: { [platform.id]: { x: 3, y: 3 }, [derelict.id]: { x: 14, y: 9 } },
    }));
    skiff = openVehicle('the skiff', belt);
    player = world.createEntity('player', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    world.moveEntity(player.id, skiff.id);
  });

  describe('the trait', () => {
    it('refuses a heading and a course together, and a stride under one', () => {
      expect(() => new VehicleTrait({ model: { kind: 'open', drive: 'player', pace: 1, stride: 0, sight: 1 } })).toThrow(/stride/);
      expect(() => new VehicleTrait({ model: { kind: 'open', drive: 'player', pace: 1, stride: 1, sight: 1, heading: 'EAST', course: { x: 1, y: 1 } } })).toThrow(/heading or a course/);
    });

    it('starts at rest with its position and no edge', () => {
      const m = model(skiff);
      expect(m.position).toEqual({ x: 3, y: 4 });
      expect(m.heading).toBeNull();
      expect(m.course).toBeNull();
      expect(m.atEdge).toBeNull();
      expect(isUnderWay(skiff)).toBe(false);
    });
  });

  describe('steering by heading (D3)', () => {
    it('start takes one of the eight headings and steps a stride along it every pace turns', () => {
      expect(startVehicle(world, skiff, 'EAST')).toBe(true);
      expect(isUnderWay(skiff)).toBe(true);
      expect(model(skiff).heading).toBe('EAST');
      expect(stepVehicle(world, skiff)).toBeUndefined();
      expect(model(skiff).position).toEqual({ x: 4, y: 4 });
      expect(world.getLocation(skiff.id)).toBe(belt.id);
    });

    it('refuses a word that is not a compass heading and a missing heading', () => {
      expect(startVehicle(world, skiff, 'UP')).toBe(false);
      expect(startVehicle(world, skiff)).toBe(false);
      expect(model(skiff).heading).toBeNull();
    });

    it('a diagonal heading advances both axes by the stride', () => {
      startVehicle(world, skiff, 'NORTHEAST');
      stepVehicle(world, skiff);
      expect(model(skiff).position).toEqual({ x: 4, y: 5 });
    });

    it('a pace of three steps on the third turn only', () => {
      model(skiff).pace = 3;
      startVehicle(world, skiff, 'NORTH');
      expect(stepVehicle(world, skiff)).toBeUndefined();
      expect(stepVehicle(world, skiff)).toBeUndefined();
      expect(model(skiff).position).toEqual({ x: 3, y: 4 });
      stepVehicle(world, skiff);
      expect(model(skiff).position).toEqual({ x: 3, y: 5 });
    });

    it('stop clears the heading and keeps the position', () => {
      startVehicle(world, skiff, 'EAST');
      stepVehicle(world, skiff);
      expect(stopVehicle(skiff)).toBe(true);
      expect(isUnderWay(skiff)).toBe(false);
      expect(model(skiff).position).toEqual({ x: 4, y: 4 });
      expect(stepVehicle(world, skiff)).toBeUndefined();
      expect(model(skiff).position).toEqual({ x: 4, y: 4 });
    });
  });

  describe('the driving statements set the state (D3, D5)', () => {
    it('start and send set turnsToStep to the pace at once', () => {
      model(skiff).pace = 4;
      startVehicle(world, skiff, 'EAST');
      expect(model(skiff).turnsToStep).toBe(4);
      stopVehicle(skiff);
      sendVehicle(world, skiff, { x: 9, y: 9 });
      expect(model(skiff).turnsToStep).toBe(4);
      tick(skiff, 3);
      expect(model(skiff).position).toEqual({ x: 3, y: 4 });
      stepVehicle(world, skiff);
      expect(model(skiff).position).toEqual({ x: 4, y: 5 });
    });

    it('stop on a course clears the course and the countdown, keeping the position', () => {
      sendVehicle(world, skiff, derelict.id);
      stepVehicle(world, skiff);
      expect(stopVehicle(skiff)).toBe(true);
      expect(model(skiff).course).toBeNull();
      expect(model(skiff).heading).toBeNull();
      expect(model(skiff).turnsToStep).toBe(0);
      expect(model(skiff).position).toEqual({ x: 4, y: 5 });
    });

    it('start and send are refused for a vehicle in no expanse, changing nothing', () => {
      const shed = room('the Shed');
      world.moveEntity(skiff.id, shed.id);
      model(skiff).position = null;
      expect(startVehicle(world, skiff, 'EAST')).toBe(false);
      expect(sendVehicle(world, skiff, { x: 1, y: 1 })).toBe(false);
      expect(model(skiff).heading).toBeNull();
      expect(model(skiff).course).toBeNull();
      expect(model(skiff).position).toBeNull();
      expect(world.getLocation(skiff.id)).toBe(shed.id);
    });
  });

  describe('steering by course (D3)', () => {
    it('runs diagonally until one axis matches, then straight, and stops on the target cell', () => {
      expect(sendVehicle(world, skiff, { x: 8, y: 7 })).toBe(true);
      expect(model(skiff).course).toEqual({ x: 8, y: 7 });
      expect(model(skiff).heading).toBeNull();
      tick(skiff, 3);
      expect(model(skiff).position).toEqual({ x: 6, y: 7 });
      stepVehicle(world, skiff);
      expect(model(skiff).position).toEqual({ x: 7, y: 7 });
      expect(stepVehicle(world, skiff)).toEqual({ kind: 'stopped' });
      expect(model(skiff).position).toEqual({ x: 8, y: 7 });
      expect(model(skiff).course).toBeNull();
      expect(model(skiff).turnsToStep).toBe(0);
      expect(isUnderWay(skiff)).toBe(false);
    });

    it('never overshoots: a wide stride lands exactly on the target', () => {
      model(skiff).stride = 10;
      sendVehicle(world, skiff, { x: 6, y: 1 });
      expect(stepVehicle(world, skiff)).toEqual({ kind: 'stopped' });
      expect(model(skiff).position).toEqual({ x: 6, y: 1 });
    });

    it('refuses a cell outside the expanse and a room that is not a landmark', () => {
      const elsewhere = room('Elsewhere');
      expect(sendVehicle(world, skiff, { x: 20, y: 0 })).toBe(false);
      expect(sendVehicle(world, skiff, elsewhere.id)).toBe(false);
      expect(model(skiff).course).toBeNull();
    });

    it('a course drops a heading, and a heading drops a course', () => {
      startVehicle(world, skiff, 'EAST');
      sendVehicle(world, skiff, derelict.id);
      expect(model(skiff).heading).toBeNull();
      expect(model(skiff).course).toEqual({ x: 14, y: 9 });
      startVehicle(world, skiff, 'WEST');
      expect(model(skiff).course).toBeNull();
      expect(model(skiff).heading).toBe('WEST');
    });
  });

  describe('arrival at a landmark (D3, D5)', () => {
    it('a course for a landmark ends in its room with no position, carrying the player', () => {
      sendVehicle(world, skiff, derelict.id);
      const result = tick(skiff, 11);
      expect(result).toEqual({ kind: 'arrived', roomId: derelict.id });
      expect(world.getLocation(skiff.id)).toBe(derelict.id);
      expect(model(skiff).position).toBeNull();
      expect(model(skiff).course).toBeNull();
      expect(model(skiff).atEdge).toBeNull();
      expect(model(skiff).turnsToStep).toBe(0);
      expect(world.getContainingRoom(player.id)?.id).toBe(derelict.id);
    });

    it('a heading whose path crosses a landmark arrives there too, at rest, with its occupants', () => {
      const lamp = world.createEntity('lamp', EntityType.ITEM);
      world.moveEntity(lamp.id, skiff.id);
      startVehicle(world, skiff, 'SOUTH');
      expect(stepVehicle(world, skiff)).toEqual({ kind: 'arrived', roomId: platform.id });
      expect(world.getLocation(skiff.id)).toBe(platform.id);
      expect(model(skiff).position).toBeNull();
      expect(model(skiff).heading).toBeNull();
      expect(model(skiff).turnsToStep).toBe(0);
      expect(world.getContainingRoom(player.id)?.id).toBe(platform.id);
      expect(world.getContainingRoom(lamp.id)?.id).toBe(platform.id);
    });

    it('a stride wider than the landmark cell still arrives on the step whose path crosses it', () => {
      model(skiff).stride = 5;
      model(skiff).position = { x: 14, y: 2 };
      startVehicle(world, skiff, 'NORTH');
      stepVehicle(world, skiff);
      expect(model(skiff).position).toEqual({ x: 14, y: 7 });
      expect(stepVehicle(world, skiff)).toEqual({ kind: 'arrived', roomId: derelict.id });
      expect(world.getLocation(skiff.id)).toBe(derelict.id);
    });

    it('leaving a landmark on start takes its row as the starting point and moves into the expanse', () => {
      world.moveEntity(skiff.id, platform.id);
      model(skiff).position = null;
      expect(startVehicle(world, skiff, 'EAST')).toBe(true);
      expect(world.getLocation(skiff.id)).toBe(belt.id);
      expect(world.getContainingRoom(player.id)?.id).toBe(belt.id);
      expect(model(skiff).position).toEqual({ x: 3, y: 3 });
      stepVehicle(world, skiff);
      expect(model(skiff).position).toEqual({ x: 4, y: 3 });
    });

    it('leaving a landmark on send does the same', () => {
      world.moveEntity(skiff.id, derelict.id);
      model(skiff).position = null;
      expect(sendVehicle(world, skiff, platform.id)).toBe(true);
      expect(world.getLocation(skiff.id)).toBe(belt.id);
      expect(model(skiff).position).toEqual({ x: 14, y: 9 });
    });

    it('a vehicle moved somewhere that is no expanse stops when stepped', () => {
      const shed = room('the Shed');
      startVehicle(world, skiff, 'EAST');
      world.moveEntity(skiff.id, shed.id);
      expect(stepVehicle(world, skiff)).toEqual({ kind: 'stopped' });
      expect(isUnderWay(skiff)).toBe(false);
    });
  });

  describe('edges (D8)', () => {
    it('a step past an edge stops at the last cell inside, once', () => {
      model(skiff).position = { x: 10, y: 18 };
      model(skiff).stride = 5;
      startVehicle(world, skiff, 'NORTH');
      expect(stepVehicle(world, skiff)).toEqual({ kind: 'edge', side: 'NORTH' });
      expect(model(skiff).position).toEqual({ x: 10, y: 19 });
      expect(model(skiff).atEdge).toBe('NORTH');
      expect(model(skiff).heading).toBeNull();
      expect(model(skiff).course).toBeNull();
      expect(model(skiff).turnsToStep).toBe(0);
      expect(isUnderWay(skiff)).toBe(false);
      expect(stepVehicle(world, skiff)).toBeUndefined();
      expect(model(skiff).position).toEqual({ x: 10, y: 19 });
      expect(model(skiff).atEdge).toBe('NORTH');
    });

    it('an edge\'s phrase is the blocked-exit line for its side, asked each time; an unwritten or empty one is none', () => {
      expect(edgePhraseOf(world, belt, 'NORTH')).toBeUndefined();
      let asked = 0;
      world.registerEvaluator(`exit.message.${belt.id}.NORTH`, () => (++asked % 2 ? 'Ice closes the way north.' : 'The ice groans.'));
      world.registerEvaluator(`exit.message.${belt.id}.SOUTH`, () => '');
      expect(edgePhraseOf(world, belt, 'NORTH')).toBe('Ice closes the way north.');
      expect(edgePhraseOf(world, belt, 'NORTH')).toBe('The ice groans.');
      expect(edgePhraseOf(world, belt, 'SOUTH')).toBeUndefined();
      expect(edgePhraseOf(world, belt, 'EAST')).toBeUndefined();
    });

    it('the south and west edges stop a course the same way, including a diagonal crossing mid-path', () => {
      model(skiff).position = { x: 2, y: 2 };
      model(skiff).stride = 5;
      startVehicle(world, skiff, 'SOUTHWEST');
      expect(stepVehicle(world, skiff)).toEqual({ kind: 'edge', side: 'SOUTH' });
      expect(model(skiff).position).toEqual({ x: 0, y: 0 });
      expect(model(skiff).atEdge).toBe('SOUTH');
      expect(startVehicle(world, skiff, 'SOUTHEAST')).toBe(false);
      expect(startVehicle(world, skiff, 'WEST')).toBe(true);
      expect(stepVehicle(world, skiff)).toEqual({ kind: 'edge', side: 'WEST' });
      expect(model(skiff).atEdge).toBe('WEST');
      expect(startVehicle(world, skiff, 'NORTHWEST')).toBe(false);
      expect(startVehicle(world, skiff, 'NORTH')).toBe(true);
    });

    it('an unwritten edge stops the same way with no phrase key', () => {
      model(skiff).position = { x: 19, y: 10 };
      startVehicle(world, skiff, 'EAST');
      expect(stepVehicle(world, skiff)).toEqual({ kind: 'edge', side: 'EAST' });
      expect(model(skiff).position).toEqual({ x: 19, y: 10 });
    });

    it('at an edge, a heading with any component toward it is refused until the vehicle steps away', () => {
      model(skiff).position = { x: 10, y: 19 };
      model(skiff).atEdge = 'NORTH';
      expect(startVehicle(world, skiff, 'NORTH')).toBe(false);
      expect(startVehicle(world, skiff, 'NORTHEAST')).toBe(false);
      expect(sendVehicle(world, skiff, { x: 12, y: 19 })).toBe(true);
      stopVehicle(skiff);
      expect(startVehicle(world, skiff, 'EAST')).toBe(true);
      stepVehicle(world, skiff);
      expect(model(skiff).atEdge).toBeNull();
      expect(startVehicle(world, skiff, 'NORTH')).toBe(true);
    });

    it('a course whose first leg heads into the edge is refused', () => {
      model(skiff).position = { x: 10, y: 19 };
      model(skiff).atEdge = 'NORTH';
      expect(sendVehicle(world, skiff, { x: 12, y: 19 })).toBe(true);
      stopVehicle(skiff);
      model(skiff).atEdge = 'EAST';
      expect(sendVehicle(world, skiff, { x: 12, y: 19 })).toBe(false);
    });
  });

  describe('alongside a floating thing (D10)', () => {
    let cask: IFEntity;

    beforeEach(() => {
      cask = world.createEntity('the cask', EntityType.ITEM);
      cask.add(new IdentityTrait({ name: 'the cask' }));
      cask.add(new FloatingTrait({ position: { x: 6, y: 4 } }));
      world.moveEntity(cask.id, belt.id);
    });

    it('the step whose path crosses its cell stops there, with a stride wider than the cell', () => {
      model(skiff).stride = 5;
      startVehicle(world, skiff, 'EAST');
      expect(stepVehicle(world, skiff)).toEqual({ kind: 'alongside', thingId: cask.id });
      expect(model(skiff).position).toEqual({ x: 6, y: 4 });
      expect(model(skiff).heading).toBeNull();
      expect(model(skiff).atEdge).toBeNull();
      expect(model(skiff).turnsToStep).toBe(0);
      expect(isUnderWay(skiff)).toBe(false);
      expect(world.getContainingRoom(player.id)?.id).toBe(belt.id);
      expect(world.getLocation(cask.id)).toBe(belt.id);
    });

    it('a course past the cask also stops alongside and drops the course', () => {
      sendVehicle(world, skiff, { x: 9, y: 4 });
      tick(skiff, 2);
      expect(model(skiff).position).toEqual({ x: 5, y: 4 });
      expect(stepVehicle(world, skiff)).toEqual({ kind: 'alongside', thingId: cask.id });
      expect(model(skiff).course).toBeNull();
    });
  });

  describe('the player out of the vehicle (D9)', () => {
    it('the machine holds while an actor with a floating position shares the cell, and resumes when they board', () => {
      startVehicle(world, skiff, 'EAST');
      world.moveEntity(player.id, belt.id);
      player.add(new FloatingTrait({ position: { x: 3, y: 4 } }));
      expect(stepVehicle(world, skiff)).toBeUndefined();
      expect(stepVehicle(world, skiff)).toBeUndefined();
      expect(model(skiff).position).toEqual({ x: 3, y: 4 });
      expect(model(skiff).turnsToStep).toBe(1);
      expect(isUnderWay(skiff)).toBe(true);
      player.get(FloatingTrait)!.position = null;
      world.moveEntity(player.id, skiff.id);
      stepVehicle(world, skiff);
      expect(model(skiff).position).toEqual({ x: 4, y: 4 });
    });

    it('an actor out at another cell does not hold it', () => {
      startVehicle(world, skiff, 'EAST');
      const other = world.createEntity('other', EntityType.ACTOR);
      other.add(new ActorTrait());
      other.add(new FloatingTrait({ position: { x: 9, y: 9 } }));
      world.moveEntity(other.id, belt.id);
      stepVehicle(world, skiff);
      expect(model(skiff).position).toEqual({ x: 4, y: 4 });
    });
  });

  describe('the machine state survives a save (D5)', () => {
    it('a voyage restored mid-course keeps its course, position and pace and still arrives', () => {
      model(skiff).pace = 2;
      sendVehicle(world, skiff, derelict.id);
      tick(skiff, 5);
      expect(model(skiff).position).toEqual({ x: 5, y: 6 });

      const restored = new WorldModel();
      restored.loadJSON(world.toJSON());
      const again = restored.getEntity(skiff.id)!;
      const m = again.get(VehicleTrait)!.model as VehicleOpenModel;
      expect(m.kind).toBe('open');
      expect(m.position).toEqual({ x: 5, y: 6 });
      expect(m.course).toEqual({ x: 14, y: 9 });
      expect(m.turnsToStep).toBe(1);
      expect(restored.getEntity(belt.id)!.get(ExpanseTrait)!.landmarks[derelict.id]).toEqual({ x: 14, y: 9 });

      let result;
      for (let i = 0; i < 17; i++) result = stepVehicle(restored, again);
      expect(result).toEqual({ kind: 'arrived', roomId: derelict.id });
      expect(restored.getLocation(skiff.id)).toBe(derelict.id);
      expect(m.position).toBeNull();
    });

    it('a restored edge stop still refuses the heading toward it', () => {
      model(skiff).position = { x: 10, y: 19 };
      startVehicle(world, skiff, 'NORTH');
      stepVehicle(world, skiff);
      const restored = new WorldModel();
      restored.loadJSON(world.toJSON());
      const again = restored.getEntity(skiff.id)!;
      expect((again.get(VehicleTrait)!.model as VehicleOpenModel).atEdge).toBe('NORTH');
      expect(startVehicle(restored, again, 'NORTHWEST')).toBe(false);
    });
  });
});
