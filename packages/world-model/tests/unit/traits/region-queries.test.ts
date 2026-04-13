/**
 * Tests for isInRegion() and getRegionCrossings() (ADR-149 Phase 2).
 *
 * Covers: parent traversal, nested regions, same-region moves,
 * no-region rooms, nonexistent entities, non-room entities.
 * Owner context: @sharpee/world-model — region queries
 */

import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { EntityType } from '../../../src/entities/entity-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('WorldModel — isInRegion()', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();

    // Build region hierarchy: underground > coal-mine
    world.createRegion('reg-underground', { name: 'Underground' });
    world.createRegion('reg-coal-mine', {
      name: 'Coal Mine',
      parentRegionId: 'reg-underground',
    });
    world.createRegion('reg-forest', { name: 'Forest' });

    // Rooms
    const cellar = world.createEntity('Cellar', EntityType.ROOM);
    cellar.add(new RoomTrait());
    world.assignRoom(cellar.id, 'reg-underground');

    const coalRoom = world.createEntity('Coal Room', EntityType.ROOM);
    coalRoom.add(new RoomTrait());
    world.assignRoom(coalRoom.id, 'reg-coal-mine');

    const clearing = world.createEntity('Clearing', EntityType.ROOM);
    clearing.add(new RoomTrait());
    world.assignRoom(clearing.id, 'reg-forest');

    const limbo = world.createEntity('Limbo', EntityType.ROOM);
    limbo.add(new RoomTrait()); // no region
  });

  it('should return true for direct region membership', () => {
    const cellar = world.findByType(EntityType.ROOM).find(r => r.attributes.name === 'Cellar')!;
    expect(world.isInRegion(cellar.id, 'reg-underground')).toBe(true);
  });

  it('should return true for parent region via hierarchy traversal', () => {
    const coalRoom = world.findByType(EntityType.ROOM).find(r => r.attributes.name === 'Coal Room')!;

    // Coal Room is in reg-coal-mine, which is a child of reg-underground
    expect(world.isInRegion(coalRoom.id, 'reg-coal-mine')).toBe(true);
    expect(world.isInRegion(coalRoom.id, 'reg-underground')).toBe(true);
  });

  it('should return false for unrelated region', () => {
    const cellar = world.findByType(EntityType.ROOM).find(r => r.attributes.name === 'Cellar')!;
    expect(world.isInRegion(cellar.id, 'reg-forest')).toBe(false);
  });

  it('should return false for room with no region', () => {
    const limbo = world.findByType(EntityType.ROOM).find(r => r.attributes.name === 'Limbo')!;
    expect(world.isInRegion(limbo.id, 'reg-underground')).toBe(false);
  });

  it('should return false for nonexistent entity', () => {
    expect(world.isInRegion('nonexistent', 'reg-underground')).toBe(false);
  });

  it('should return false for nonexistent region target', () => {
    const cellar = world.findByType(EntityType.ROOM).find(r => r.attributes.name === 'Cellar')!;
    expect(world.isInRegion(cellar.id, 'reg-nonexistent')).toBe(false);
  });

  it('should resolve non-room entities through their containing room', () => {
    const coalRoom = world.findByType(EntityType.ROOM).find(r => r.attributes.name === 'Coal Room')!;
    const lamp = world.createEntity('Brass Lamp', EntityType.OBJECT);
    world.moveEntity(lamp.id, coalRoom.id);

    expect(world.isInRegion(lamp.id, 'reg-coal-mine')).toBe(true);
    expect(world.isInRegion(lamp.id, 'reg-underground')).toBe(true);
    expect(world.isInRegion(lamp.id, 'reg-forest')).toBe(false);
  });

  it('should return false for non-room entity not in any room', () => {
    const floatingItem = world.createEntity('Ghost Item', EntityType.OBJECT);
    // Not placed anywhere
    expect(world.isInRegion(floatingItem.id, 'reg-underground')).toBe(false);
  });
});

describe('WorldModel — getRegionCrossings()', () => {
  let world: WorldModel;
  let forestRoom: string;
  let cellar: string;
  let coalRoom: string;
  let cellar2: string;
  let limbo: string;

  beforeEach(() => {
    world = new WorldModel();

    // Hierarchy: underground > coal-mine
    world.createRegion('reg-underground', { name: 'Underground' });
    world.createRegion('reg-coal-mine', {
      name: 'Coal Mine',
      parentRegionId: 'reg-underground',
    });
    world.createRegion('reg-forest', { name: 'Forest' });

    const r1 = world.createEntity('Forest Clearing', EntityType.ROOM);
    r1.add(new RoomTrait());
    world.assignRoom(r1.id, 'reg-forest');
    forestRoom = r1.id;

    const r2 = world.createEntity('Cellar', EntityType.ROOM);
    r2.add(new RoomTrait());
    world.assignRoom(r2.id, 'reg-underground');
    cellar = r2.id;

    const r3 = world.createEntity('Coal Room', EntityType.ROOM);
    r3.add(new RoomTrait());
    world.assignRoom(r3.id, 'reg-coal-mine');
    coalRoom = r3.id;

    const r4 = world.createEntity('Dark Passage', EntityType.ROOM);
    r4.add(new RoomTrait());
    world.assignRoom(r4.id, 'reg-underground');
    cellar2 = r4.id;

    const r5 = world.createEntity('Limbo', EntityType.ROOM);
    r5.add(new RoomTrait()); // no region
    limbo = r5.id;
  });

  it('should detect region exit and entry on cross-region move', () => {
    // Forest → Underground
    const result = world.getRegionCrossings(forestRoom, cellar);

    expect(result.exited).toEqual(['reg-forest']);
    expect(result.entered).toEqual(['reg-underground']);
  });

  it('should return empty arrays for same-region move', () => {
    // Cellar → Dark Passage (both in reg-underground)
    const result = world.getRegionCrossings(cellar, cellar2);

    expect(result.exited).toEqual([]);
    expect(result.entered).toEqual([]);
  });

  it('should handle move into nested child region', () => {
    // Cellar (underground) → Coal Room (coal-mine, child of underground)
    const result = world.getRegionCrossings(cellar, coalRoom);

    // Still in underground (no exit), entered coal-mine
    expect(result.exited).toEqual([]);
    expect(result.entered).toEqual(['reg-coal-mine']);
  });

  it('should handle move out of nested region to parent', () => {
    // Coal Room (coal-mine) → Cellar (underground)
    const result = world.getRegionCrossings(coalRoom, cellar);

    // Exited coal-mine (but still in underground via cellar)
    expect(result.exited).toEqual(['reg-coal-mine']);
    expect(result.entered).toEqual([]);
  });

  it('should handle move from deepest child to outside all ancestors', () => {
    // Coal Room (coal-mine > underground) → Forest
    const result = world.getRegionCrossings(coalRoom, forestRoom);

    // Exited inner-first: coal-mine, then underground
    expect(result.exited).toEqual(['reg-coal-mine', 'reg-underground']);
    // Entered outer-first: forest
    expect(result.entered).toEqual(['reg-forest']);
  });

  it('should handle move from outside all regions into nested child', () => {
    // Forest → Coal Room (coal-mine > underground)
    const result = world.getRegionCrossings(forestRoom, coalRoom);

    expect(result.exited).toEqual(['reg-forest']);
    // Entered outer-first: underground, then coal-mine
    expect(result.entered).toEqual(['reg-underground', 'reg-coal-mine']);
  });

  it('should handle room with no region to room with region', () => {
    const result = world.getRegionCrossings(limbo, forestRoom);

    expect(result.exited).toEqual([]);
    expect(result.entered).toEqual(['reg-forest']);
  });

  it('should handle room with region to room with no region', () => {
    const result = world.getRegionCrossings(forestRoom, limbo);

    expect(result.exited).toEqual(['reg-forest']);
    expect(result.entered).toEqual([]);
  });

  it('should return empty arrays when both rooms have no region', () => {
    const limbo2 = world.createEntity('Void', EntityType.ROOM);
    limbo2.add(new RoomTrait());

    const result = world.getRegionCrossings(limbo, limbo2.id);

    expect(result.exited).toEqual([]);
    expect(result.entered).toEqual([]);
  });

  it('should handle nonexistent room IDs gracefully', () => {
    const result = world.getRegionCrossings('nonexistent', forestRoom);

    expect(result.exited).toEqual([]);
    expect(result.entered).toEqual(['reg-forest']);
  });
});
