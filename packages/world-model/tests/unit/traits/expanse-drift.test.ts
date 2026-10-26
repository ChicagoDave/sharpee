/**
 * The expanse's drift and geometry (ADR-376 D2, D6, D8, D10; Chord 4.0
 * Phase 13 Slice 2): floating things move one unit a random way each
 * interval at a pinned seed, never past an edge, washing up on a landmark;
 * the compass, distance and sight bands read cells the same at any size.
 * Each drift test asserts on the thing's trait position and location.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSeededRandom, type ChoicePoint, type RandomService } from '@sharpee/core';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { ExpanseTrait, isInsideExpanse } from '../../../src/traits/expanse/expanseTrait';
import { FloatingTrait } from '../../../src/traits/expanse/floatingTrait';
import { SightTrait } from '../../../src/traits/expanse/sightTrait';
import {
  COMPASS_HEADINGS,
  directionOf,
  distance,
  driftExpanse,
  headingVector,
  sightBandOf,
} from '../../../src/traits/expanse/expanseBehavior';
import { placeOf } from '../../../src/world/ExpansePlaceBehavior';

/** A RandomService over one seeded stream: `pick` is the only draw drift makes. */
function seededService(seed: number): RandomService & { points: string[] } {
  const stream = createSeededRandom(seed);
  const points: string[] = [];
  const refuse = () => { throw new Error('drift draws only through pick'); };
  return {
    points,
    pick<T>(p: ChoicePoint, items: readonly T[]): T {
      points.push(p.name);
      return items[stream.int(0, items.length - 1)];
    },
    chance: refuse,
    int: refuse,
    resolve: refuse as unknown as RandomService['resolve'],
  } as unknown as RandomService & { points: string[] };
}

describe('the expanse trait (ADR-376 D2)', () => {
  it('holds its size, refusing a landmark outside it and a drift under one turn', () => {
    expect(() => new ExpanseTrait({ width: 0, height: 5 })).toThrow(/size/);
    expect(() => new ExpanseTrait({ width: 5, height: 5, landmarks: { r1: { x: 5, y: 0 } } })).toThrow(/outside/);
    expect(() => new ExpanseTrait({ width: 5, height: 5, drift: 0 })).toThrow(/drift/);
    const t = new ExpanseTrait({ width: 1000, height: 500, landmarks: { r1: { x: 999, y: 499 } }, drift: 3, visibility: 80 });
    expect(t.turnsToDrift).toBe(3);
    expect(isInsideExpanse(t, { x: 1000, y: 0 })).toBe(false);
    expect(isInsideExpanse(t, { x: 999, y: 499 })).toBe(true);
  });

  it('the sight trait refuses a negative reach', () => {
    expect(() => new SightTrait({ sight: -1 })).toThrow(/sight/);
    expect(new SightTrait({ sight: 75 }).sight).toBe(75);
  });
});

describe('the compass over cells (D3, D6)', () => {
  it('x grows east and y grows north', () => {
    expect(headingVector('NORTH')).toEqual({ x: 0, y: 1 });
    expect(headingVector('SOUTHWEST')).toEqual({ x: -1, y: -1 });
    expect(headingVector('UP')).toBeUndefined();
  });

  it('names the nearest of eight directions, and none for the same cell', () => {
    const from = { x: 10, y: 10 };
    expect(directionOf(from, { x: 10, y: 15 })).toBe('NORTH');
    expect(directionOf(from, { x: 15, y: 15 })).toBe('NORTHEAST');
    expect(directionOf(from, { x: 15, y: 10 })).toBe('EAST');
    expect(directionOf(from, { x: 14, y: 6 })).toBe('SOUTHEAST');
    expect(directionOf(from, { x: 10, y: 0 })).toBe('SOUTH');
    expect(directionOf(from, { x: 5, y: 5 })).toBe('SOUTHWEST');
    expect(directionOf(from, { x: 0, y: 11 })).toBe('WEST');
    expect(directionOf(from, { x: 7, y: 13 })).toBe('NORTHWEST');
    expect(directionOf(from, from)).toBeUndefined();
    expect(COMPASS_HEADINGS).toHaveLength(8);
  });

  it('distance is straight-line and bands fall at thirds of the sight', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(sightBandOf(2, 6)).toBe('close-by');
    expect(sightBandOf(4, 6)).toBe('in-the-distance');
    expect(sightBandOf(6, 6)).toBe('on-the-horizon');
    expect(sightBandOf(6.1, 6)).toBeUndefined();
    expect(sightBandOf(10, 30)).toBe('close-by');
    expect(sightBandOf(20, 30)).toBe('in-the-distance');
  });
});

describe('drift (D10)', () => {
  let world: WorldModel;
  let sea: IFEntity;
  let port: IFEntity;
  let cask: IFEntity;

  function room(name: string): IFEntity {
    const r = world.createEntity(name, EntityType.ROOM);
    r.add(new RoomTrait({ exits: {} }));
    r.add(new IdentityTrait({ name }));
    return r;
  }

  function floating(name: string, x: number, y: number): IFEntity {
    const t = world.createEntity(name, EntityType.ITEM);
    t.add(new IdentityTrait({ name }));
    t.add(new FloatingTrait({ position: { x, y } }));
    world.moveEntity(t.id, sea.id);
    return t;
  }

  beforeEach(() => {
    world = new WorldModel();
    port = room('Port Royal');
    sea = room('the Western Ocean');
    sea.add(new ExpanseTrait({ width: 10, height: 10, landmarks: { [port.id]: { x: 5, y: 5 } }, drift: 3 }));
    cask = floating('the cask', 2, 2);
  });

  it('moves every floating thing one unit a drawn way on the interval, deterministically at the seed', () => {
    const bottle = floating('the bottle', 8, 2);
    const ashore = world.createEntity('the oar', EntityType.ITEM);
    ashore.add(new FloatingTrait());
    world.moveEntity(ashore.id, sea.id);
    const random = seededService(42);
    expect(driftExpanse(world, sea, random)).toEqual([]);
    expect(sea.get(ExpanseTrait)!.turnsToDrift).toBe(2);
    expect(driftExpanse(world, sea, random)).toEqual([]);
    expect(cask.get(FloatingTrait)!.position).toEqual({ x: 2, y: 2 });
    const steps = driftExpanse(world, sea, random);
    expect(steps.map((s) => s.thingId)).toEqual([cask.id, bottle.id]);
    const step = steps[0];
    expect(step.kind).toBe('drifted');
    const vector = headingVector(step.heading)!;
    expect(cask.get(FloatingTrait)!.position).toEqual({ x: 2 + vector.x, y: 2 + vector.y });
    expect(world.getLocation(cask.id)).toBe(sea.id);
    const second = headingVector(steps[1].heading)!;
    expect(bottle.get(FloatingTrait)!.position).toEqual({ x: 8 + second.x, y: 2 + second.y });
    expect(ashore.get(FloatingTrait)!.position).toBeNull();
    expect(sea.get(ExpanseTrait)!.turnsToDrift).toBe(3);
    expect(random.points).toEqual([`vehicle.drift.${sea.id}`, `vehicle.drift.${sea.id}`]);

    const again = new WorldModel();
    const twin = new ExpanseTrait({ width: 10, height: 10, drift: 3 });
    const sea2 = again.createEntity('sea', EntityType.ROOM);
    sea2.add(new RoomTrait({ exits: {} }));
    sea2.add(twin);
    const cask2 = again.createEntity('cask', EntityType.ITEM);
    cask2.add(new FloatingTrait({ position: { x: 2, y: 2 } }));
    again.moveEntity(cask2.id, sea2.id);
    const random2 = seededService(42);
    driftExpanse(again, sea2, random2); driftExpanse(again, sea2, random2);
    const replay = driftExpanse(again, sea2, random2);
    expect(replay[0].heading).toBe(step.heading);
    expect(cask2.get(FloatingTrait)!.position).toEqual(cask.get(FloatingTrait)!.position);
  });

  it('an expanse without drift never moves anything', () => {
    sea.get(ExpanseTrait)!.drift = undefined;
    const random = seededService(1);
    for (let i = 0; i < 5; i++) expect(driftExpanse(world, sea, random)).toEqual([]);
    expect(cask.get(FloatingTrait)!.position).toEqual({ x: 2, y: 2 });
  });

  it('never drifts past an edge: the step is held and the thing stays', () => {
    const trait = sea.get(ExpanseTrait)!;
    trait.width = 1; trait.height = 1;
    cask.get(FloatingTrait)!.position = { x: 0, y: 0 };
    trait.turnsToDrift = 1;
    const [step] = driftExpanse(world, sea, seededService(7));
    expect(step.kind).toBe('held');
    expect(cask.get(FloatingTrait)!.position).toEqual({ x: 0, y: 0 });
    expect(world.getLocation(cask.id)).toBe(sea.id);
    expect(trait.turnsToDrift).toBe(3);
  });

  it('washes up: a drift into a landmark cell moves the thing into that room with no position', () => {
    const trait = sea.get(ExpanseTrait)!;
    // Every neighbour of the port is the port, so any draw washes up.
    trait.landmarks = {};
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const r = room(`shore ${dx},${dy}`);
      trait.landmarks[r.id] = { x: 5 + dx, y: 5 + dy };
    }
    cask.get(FloatingTrait)!.position = { x: 5, y: 5 };
    trait.turnsToDrift = 1;
    const [step] = driftExpanse(world, sea, seededService(3));
    expect(step.kind).toBe('washed-up');
    const roomId = (step as { roomId: string }).roomId;
    expect(world.getLocation(cask.id)).toBe(roomId);
    expect(cask.get(FloatingTrait)!.position).toBeNull();
    expect(placeOf(world, cask)).toBeUndefined();
    expect(trait.turnsToDrift).toBe(3);
  });

  it('actors out of their vehicle never drift (D9)', () => {
    const sailor = world.createEntity('sailor', EntityType.ACTOR);
    sailor.add(new ActorTrait());
    sailor.add(new FloatingTrait({ position: { x: 8, y: 8 } }));
    world.moveEntity(sailor.id, sea.id);
    sea.get(ExpanseTrait)!.turnsToDrift = 1;
    const steps = driftExpanse(world, sea, seededService(5));
    expect(steps.map((s) => s.thingId)).toEqual([cask.id]);
    expect(sailor.get(FloatingTrait)!.position).toEqual({ x: 8, y: 8 });
  });

  it('a floating thing and a landmark room both have a place; a thing ashore has none', () => {
    expect(placeOf(world, cask)).toMatchObject({ expanse: sea, cell: { x: 2, y: 2 } });
    expect(placeOf(world, port)).toMatchObject({ expanse: sea, cell: { x: 5, y: 5 } });
    world.moveEntity(cask.id, port.id);
    cask.get(FloatingTrait)!.position = null;
    expect(placeOf(world, cask)).toBeUndefined();
  });

  it('the drift interval survives a save', () => {
    const random = seededService(9);
    driftExpanse(world, sea, random);
    const restored = new WorldModel();
    restored.loadJSON(world.toJSON());
    const trait = restored.getEntity(sea.id)!.get(ExpanseTrait)!;
    expect(trait.turnsToDrift).toBe(2);
    expect(trait.landmarks[port.id]).toEqual({ x: 5, y: 5 });
    expect(restored.getEntity(cask.id)!.get(FloatingTrait)!.position).toEqual({ x: 2, y: 2 });
  });
});
