/**
 * Tests for isInRegion() and getRegionCrossings() (ADR-149 Phase 2).
 *
 * A room is in at most one region and regions do not nest (ADR-360 D5), so
 * membership is the room's own region and a move crosses at most one boundary
 * each way. Covers: direct membership, same-region moves, no-region rooms,
 * dangling region ids, nonexistent entities, non-room entities.
 * Owner context: @sharpee/world-model — region queries
 */

import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { EntityType } from '../../../src/entities/entity-types';
import { WorldModel } from '../../../src/world/WorldModel';

/** A room assigned to a region, or to none when regionId is omitted. */
function room(world: WorldModel, name: string, regionId?: string): string {
  const entity = world.createEntity(name, EntityType.ROOM);
  entity.add(new RoomTrait());
  if (regionId) world.assignRoom(entity.id, regionId);
  return entity.id;
}

describe('WorldModel — isInRegion()', () => {
  let world: WorldModel;
  let cellar: string;
  let coalRoom: string;
  let limbo: string;

  beforeEach(() => {
    world = new WorldModel();
    world.createRegion('reg-underground', { name: 'Underground' });
    world.createRegion('reg-coal-mine', { name: 'Coal Mine' });
    world.createRegion('reg-forest', { name: 'Forest' });

    cellar = room(world, 'Cellar', 'reg-underground');
    coalRoom = room(world, 'Coal Room', 'reg-coal-mine');
    limbo = room(world, 'Limbo');
  });

  it('should return true for the room\'s own region', () => {
    expect(world.isInRegion(cellar, 'reg-underground')).toBe(true);
  });

  it('should return false for any other region — membership does not carry to another region', () => {
    expect(world.isInRegion(coalRoom, 'reg-coal-mine')).toBe(true);
    expect(world.isInRegion(coalRoom, 'reg-underground')).toBe(false);
    expect(world.isInRegion(cellar, 'reg-forest')).toBe(false);
  });

  it('should return false for room with no region', () => {
    expect(world.isInRegion(limbo, 'reg-underground')).toBe(false);
  });

  it('should return false for nonexistent entity', () => {
    expect(world.isInRegion('nonexistent', 'reg-underground')).toBe(false);
  });

  it('should return false for nonexistent region target', () => {
    expect(world.isInRegion(cellar, 'reg-nonexistent')).toBe(false);
  });

  it('should return false when the room\'s regionId names no region entity', () => {
    world.getEntity(limbo)!.get<RoomTrait>(TraitType.ROOM)!.regionId = 'reg-gone';
    expect(world.isInRegion(limbo, 'reg-gone')).toBe(false);
  });

  it('should resolve non-room entities through their containing room', () => {
    const lamp = world.createEntity('Brass Lamp', EntityType.OBJECT);
    world.moveEntity(lamp.id, coalRoom);

    expect(world.isInRegion(lamp.id, 'reg-coal-mine')).toBe(true);
    expect(world.isInRegion(lamp.id, 'reg-underground')).toBe(false);
  });

  it('should follow a non-room entity when it moves to a room in another region', () => {
    const lamp = world.createEntity('Brass Lamp', EntityType.OBJECT);
    world.moveEntity(lamp.id, coalRoom);
    world.moveEntity(lamp.id, cellar);

    expect(world.isInRegion(lamp.id, 'reg-underground')).toBe(true);
    expect(world.isInRegion(lamp.id, 'reg-coal-mine')).toBe(false);
  });

  it('should return false for non-room entity not in any room', () => {
    const floatingItem = world.createEntity('Ghost Item', EntityType.OBJECT);
    expect(world.isInRegion(floatingItem.id, 'reg-underground')).toBe(false);
  });
});

describe('WorldModel — getRegionCrossings()', () => {
  let world: WorldModel;
  let forestRoom: string;
  let cellar: string;
  let darkPassage: string;
  let limbo: string;

  beforeEach(() => {
    world = new WorldModel();
    world.createRegion('reg-underground', { name: 'Underground' });
    world.createRegion('reg-forest', { name: 'Forest' });

    forestRoom = room(world, 'Forest Clearing', 'reg-forest');
    cellar = room(world, 'Cellar', 'reg-underground');
    darkPassage = room(world, 'Dark Passage', 'reg-underground');
    limbo = room(world, 'Limbo');
  });

  it('should name the region left and the region entered on a cross-region move', () => {
    expect(world.getRegionCrossings(forestRoom, cellar)).toEqual({
      exited: 'reg-forest',
      entered: 'reg-underground',
    });
  });

  it('should cross nothing on a same-region move', () => {
    expect(world.getRegionCrossings(cellar, darkPassage)).toEqual({});
  });

  it('should enter only, from a room with no region', () => {
    expect(world.getRegionCrossings(limbo, forestRoom)).toEqual({ entered: 'reg-forest' });
  });

  it('should exit only, into a room with no region', () => {
    expect(world.getRegionCrossings(forestRoom, limbo)).toEqual({ exited: 'reg-forest' });
  });

  it('should cross nothing when both rooms have no region', () => {
    const voidRoom = room(world, 'Void');
    expect(world.getRegionCrossings(limbo, voidRoom)).toEqual({});
  });

  it('should treat a nonexistent room as having no region', () => {
    expect(world.getRegionCrossings('nonexistent', forestRoom)).toEqual({ entered: 'reg-forest' });
  });

  it('should treat a regionId naming no region entity as no region', () => {
    world.getEntity(limbo)!.get<RoomTrait>(TraitType.ROOM)!.regionId = 'reg-gone';
    expect(world.getRegionCrossings(limbo, forestRoom)).toEqual({ entered: 'reg-forest' });
    expect(world.getRegionCrossings(forestRoom, limbo)).toEqual({ exited: 'reg-forest' });
  });

  it('should follow a reassignment: a room moved to another region crosses into that one', () => {
    world.assignRoom(darkPassage, 'reg-forest');
    expect(world.getRegionCrossings(cellar, darkPassage)).toEqual({
      exited: 'reg-underground',
      entered: 'reg-forest',
    });
  });
});
