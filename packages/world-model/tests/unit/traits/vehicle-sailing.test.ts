/**
 * Sailing on the open model (ADR-375 D2, D3, D5, D7; Chord 4.0 Phase 13
 * Slice 6): bearings in degrees with fractional positions, the pace by the
 * angle off the wind, irons, coming about, and the sails. Each test asserts
 * on the vehicle's location and the trait's fields, never on a copy.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { EnterableTrait } from '../../../src/traits/enterable/enterableTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { VehicleTrait, type VehicleOpenModel } from '../../../src/traits/vehicle/vehicleTrait';
import { ExpanseTrait } from '../../../src/traits/expanse/expanseTrait';
import { angleOffWind, bearingOf, headingVector } from '../../../src/traits/expanse/expanseBehavior';
import { Direction } from '../../../src/constants/directions';
import {
  comeAbout,
  furlSails,
  isUnderWay,
  makeSail,
  paceUnderSail,
  setSails,
  shortenSail,
  sendVehicle,
  startVehicle,
  stepVehicle,
  stopVehicle,
  turnHeading,
} from '../../../src/traits/vehicle/vehicleBehavior';

const TABLE = {
  bands: [
    { from: 0, to: 44, paces: [{ setting: null, pace: 'stopped' as const }] },
    { from: 45, to: 74, paces: [{ setting: null, pace: 4 }] },
    { from: 75, to: 119, paces: [{ setting: null, pace: 2 }] },
    { from: 120, to: 180, paces: [{ setting: null, pace: 1 }] },
  ],
  calm: 'stopped' as const,
};

const TABLE_WITH_SAILS = {
  bands: [
    { from: 0, to: 44, paces: [{ setting: 'furled', pace: 'stopped' as const }, { setting: 'reefed', pace: 'stopped' as const }, { setting: 'full', pace: 'stopped' as const }] },
    { from: 45, to: 74, paces: [{ setting: 'furled', pace: 'stopped' as const }, { setting: 'reefed', pace: 6 }, { setting: 'full', pace: 4 }] },
    { from: 75, to: 119, paces: [{ setting: 'furled', pace: 'stopped' as const }, { setting: 'reefed', pace: 3 }, { setting: 'full', pace: 2 }] },
    { from: 120, to: 180, paces: [{ setting: 'furled', pace: 6 }, { setting: 'reefed', pace: 2 }, { setting: 'full', pace: 1 }] },
  ],
  calm: 'stopped' as const,
};

describe('bearings (ADR-375 D2)', () => {
  it('a compass word names its bearing; a bearing has a sine and cosine vector; the angle off the wind runs 0 to 180', () => {
    expect(bearingOf(Direction.NORTHEAST)).toBe(45);
    expect(bearingOf(405)).toBe(45);
    expect(bearingOf(Direction.UP)).toBeUndefined();
    const east = headingVector(90)!;
    expect(east.x).toBeCloseTo(1);
    expect(east.y).toBeCloseTo(0);
    expect(angleOffWind(45, 45)).toBe(0);
    expect(angleOffWind(225, 45)).toBe(180);
    expect(angleOffWind(90, 45)).toBe(45);
    expect(angleOffWind(0, 45)).toBe(45);
    expect(angleOffWind(180, 45)).toBe(135);
  });
});

describe('a sailing vehicle (ADR-375 D3, D5, D7)', () => {
  let world: WorldModel;
  let sea: IFEntity;
  let port: IFEntity;
  let ship: IFEntity;

  function room(name: string): IFEntity {
    const r = world.createEntity(name, EntityType.ROOM);
    r.add(new RoomTrait({ exits: {} }));
    r.add(new IdentityTrait({ name }));
    return r;
  }

  function model(): VehicleOpenModel {
    return ship.get(VehicleTrait)!.model as VehicleOpenModel;
  }

  function build(sailing: typeof TABLE | typeof TABLE_WITH_SAILS, sails?: { settings: string[]; current: string }) {
    ship = world.createEntity('the Marigold', EntityType.ITEM);
    ship.add(new IdentityTrait({ name: 'the Marigold' }));
    ship.add(new ContainerTrait());
    ship.add(new EnterableTrait());
    ship.add(new VehicleTrait({ model: { kind: 'open', drive: 'player', pace: 1, stride: 1, sight: 8, sailing, position: { x: 20, y: 20 }, ...(sails ? { sails } : {}) }, commands: ['naval'] }));
    world.moveEntity(ship.id, sea.id);
  }

  beforeEach(() => {
    world = new WorldModel();
    port = room('Port Royal');
    sea = room('the Sargasso');
    sea.add(new ExpanseTrait({ width: 40, height: 40, landmarks: { [port.id]: { x: 3, y: 4 } }, wind: 45 }));
    build(TABLE);
  });

  it('turns by degrees under way or not, from north when it has no bearing yet; ahead goes on the bearing; heave to keeps it', () => {
    expect(turnHeading(ship, 15)).toBe(15);
    expect(turnHeading(ship, -30)).toBe(345);
    expect(isUnderWay(ship)).toBe(false);
    expect(startVehicle(world, ship)).toBe(true);
    expect(model()).toMatchObject({ heading: 345, underWay: true });
    expect(turnHeading(ship, 90)).toBe(75);
    expect(stopVehicle(ship)).toBe(true);
    expect(model()).toMatchObject({ heading: 75, underWay: false });
    expect(startVehicle(world, ship, Direction.SOUTH)).toBe(true);
    expect(model().heading).toBe(180);
  });

  it('runs before the wind a unit a turn along the bearing, with fractional coordinates', () => {
    turnHeading(ship, 225);
    startVehicle(world, ship);
    expect(paceUnderSail(world, ship)).toBe(1);
    expect(stepVehicle(world, ship)).toBeUndefined();
    const p = model().position!;
    expect(p.x).toBeCloseTo(20 - Math.SQRT1_2);
    expect(p.y).toBeCloseTo(20 - Math.SQRT1_2);
    expect(model().turnsToStep).toBe(1);
  });

  it('the pace follows the band: 45 off the wind makes a unit every four turns', () => {
    turnHeading(ship, 90);
    startVehicle(world, ship);
    expect(paceUnderSail(world, ship)).toBe(4);
    for (let i = 0; i < 3; i++) expect(stepVehicle(world, ship)).toBeUndefined();
    expect(model().position).toEqual({ x: 20, y: 20 });
    stepVehicle(world, ship);
    expect(model().position!.x).toBeCloseTo(21);
    expect(model().position!.y).toBeCloseTo(20);
  });

  it('a stopped band is irons, reported once; a turn out of it moves her again; a wind shift does too', () => {
    turnHeading(ship, 60);
    startVehicle(world, ship);
    expect(paceUnderSail(world, ship)).toBe('stopped');
    expect(stepVehicle(world, ship)).toEqual({ kind: 'in-irons' });
    expect(model()).toMatchObject({ inIrons: true, underWay: true, heading: 60, position: { x: 20, y: 20 } });
    expect(stepVehicle(world, ship)).toBeUndefined();
    expect(stepVehicle(world, ship)).toBeUndefined();
    turnHeading(ship, 40);
    expect(stepVehicle(world, ship)).toBeUndefined();
    expect(model().inIrons).toBe(false);
    // Band 45..74 at 55 off: a unit every four turns, armed on the turn she came out.
    expect(model().turnsToStep).toBe(3);
    turnHeading(ship, -40);
    expect(stepVehicle(world, ship)).toEqual({ kind: 'in-irons' });
    sea.get(ExpanseTrait)!.wind = 'calm';
    expect(stepVehicle(world, ship)).toBeUndefined();
    expect(model().inIrons).toBe(true);
    sea.get(ExpanseTrait)!.wind = 240;
    expect(stepVehicle(world, ship)).toBeUndefined();
    expect(model().inIrons).toBe(false);
  });

  it('a course under sail goes toward the cell at the band\'s pace, keeping the bearing for after', () => {
    turnHeading(ship, 225);
    expect(sendVehicle(world, ship, { x: 20, y: 23 })).toBe(true);
    // Bound north from (20,20): the course outranks the bearing for the step, and the pace is read for the bearing held.
    expect(model()).toMatchObject({ course: { x: 20, y: 23 }, heading: 225, underWay: true, inIrons: false, turnsToStep: 1 });
    stepVehicle(world, ship);
    expect(model().position).toEqual({ x: 20, y: 21 });
    stepVehicle(world, ship);
    expect(stepVehicle(world, ship)).toEqual({ kind: 'stopped' });
    expect(model()).toMatchObject({ position: { x: 20, y: 23 }, course: null, heading: 225, underWay: false });
  });

  it('comes about to the same angle on the other side of the wind, and refuses dead into or before it, or in a calm', () => {
    turnHeading(ship, 90);
    expect(comeAbout(world, ship)).toBe(0);
    expect(model().heading).toBe(0);
    expect(comeAbout(world, ship)).toBe(90);
    turnHeading(ship, -45);
    expect(comeAbout(world, ship)).toBe('cannot');
    turnHeading(ship, 180);
    expect(comeAbout(world, ship)).toBe('cannot');
    sea.get(ExpanseTrait)!.wind = 'calm';
    expect(comeAbout(world, ship)).toBe('no-wind');
    expect(model().heading).toBe(225);
  });

  it('a save under way restores bearing, fractional position and the countdown', () => {
    turnHeading(ship, 225);
    startVehicle(world, ship);
    stepVehicle(world, ship);
    const restored = new WorldModel();
    restored.loadJSON(world.toJSON());
    const again = restored.getEntity(ship.id)!.get(VehicleTrait)!.model as VehicleOpenModel;
    expect(again.heading).toBe(225);
    expect(again.underWay).toBe(true);
    expect(again.position!.x).toBeCloseTo(20 - Math.SQRT1_2);
    expect(again.sailing?.bands).toHaveLength(4);
    expect(restored.getEntity(sea.id)!.get(ExpanseTrait)!.wind).toBe(45);
  });

  describe('with sails (D7)', () => {
    beforeEach(() => {
      world = new WorldModel();
      port = room('Port Royal');
      sea = room('the Sargasso');
      sea.add(new ExpanseTrait({ width: 40, height: 40, landmarks: { [port.id]: { x: 3, y: 4 } }, wind: 45 }));
      build(TABLE_WITH_SAILS, { settings: ['furled', 'reefed', 'full'], current: 'furled' });
    });

    it('each setting has its pace in the band, taken from the next step; the words move one setting at a time', () => {
      turnHeading(ship, 225);
      startVehicle(world, ship);
      expect(paceUnderSail(world, ship)).toBe(6);
      expect(makeSail(ship)).toBe(true);
      expect(model().sails!.current).toBe('reefed');
      expect(paceUnderSail(world, ship)).toBe(2);
      expect(makeSail(ship)).toBe(true);
      expect(makeSail(ship)).toBe(false);
      expect(model().sails!.current).toBe('full');
      expect(paceUnderSail(world, ship)).toBe(1);
      expect(shortenSail(ship)).toBe(true);
      expect(model().sails!.current).toBe('reefed');
      expect(furlSails(ship)).toBe(true);
      expect(furlSails(ship)).toBe(false);
      expect(shortenSail(ship)).toBe(false);
      expect(setSails(ship, 'full')).toBe(true);
      expect(setSails(ship, 'bare')).toBe(false);
      expect(model().sails!.current).toBe('full');
    });

    it('furled on a beam reach she lies still but is not in irons; full and dead into the wind she is', () => {
      turnHeading(ship, 90);
      startVehicle(world, ship);
      expect(stepVehicle(world, ship)).toBeUndefined();
      expect(model()).toMatchObject({ inIrons: false, underWay: true, position: { x: 20, y: 20 } });
      setSails(ship, 'full');
      expect(stepVehicle(world, ship)).toBeUndefined();
      expect(model().turnsToStep).toBe(3);
      turnHeading(ship, -60);
      expect(stepVehicle(world, ship)).toEqual({ kind: 'in-irons' });
    });

    it('a change of setting sets the pace from the next step: the step already counting down keeps its pace', () => {
      turnHeading(ship, 225);
      setSails(ship, 'full');
      startVehicle(world, ship);
      expect(stepVehicle(world, ship)).toBeUndefined();
      expect(model().position!.y).toBeCloseTo(20 - Math.SQRT1_2);
      setSails(ship, 'reefed');
      // The step armed under full sail lands a turn later; the one after it takes reefed's two turns.
      expect(stepVehicle(world, ship)).toBeUndefined();
      expect(model().position!.y).toBeCloseTo(20 - 2 * Math.SQRT1_2);
      expect(model().turnsToStep).toBe(2);
      expect(stepVehicle(world, ship)).toBeUndefined();
      expect(model().position!.y).toBeCloseTo(20 - 2 * Math.SQRT1_2);
      expect(stepVehicle(world, ship)).toBeUndefined();
      expect(model().position!.y).toBeCloseTo(20 - 3 * Math.SQRT1_2);
    });
  });
});
