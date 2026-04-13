/**
 * Tests for RegionTrait and WorldModel region management (ADR-149).
 *
 * Covers: RegionTrait initialization, createRegion() atomicity,
 * assignRoom() validation, and the RoomTrait.regionId rename.
 * Owner context: @sharpee/world-model — traits / spatial
 */

import { RegionTrait, IRegionData } from '../../../src/traits/region/regionTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { EntityType } from '../../../src/entities/entity-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('RegionTrait', () => {
  describe('initialization', () => {
    it('should set required name field', () => {
      const trait = new RegionTrait({ name: 'Underground' });

      expect(trait.name).toBe('Underground');
      expect(trait.type).toBe(TraitType.REGION);
    });

    it('should default defaultDark to false', () => {
      const trait = new RegionTrait({ name: 'Forest' });

      expect(trait.defaultDark).toBe(false);
    });

    it('should accept all optional fields', () => {
      const data: IRegionData = {
        name: 'Coal Mine',
        parentRegionId: 'reg-underground',
        ambientSound: 'Dripping water echoes.',
        ambientSmell: 'Damp earth and coal dust.',
        defaultDark: true,
      };
      const trait = new RegionTrait(data);

      expect(trait.name).toBe('Coal Mine');
      expect(trait.parentRegionId).toBe('reg-underground');
      expect(trait.ambientSound).toBe('Dripping water echoes.');
      expect(trait.ambientSmell).toBe('Damp earth and coal dust.');
      expect(trait.defaultDark).toBe(true);
    });

    it('should have correct static and instance type', () => {
      expect(RegionTrait.type).toBe(TraitType.REGION);
      expect(RegionTrait.type).toBe('region');

      const trait = new RegionTrait({ name: 'Test' });
      expect(trait.type).toBe(RegionTrait.type);
    });
  });
});

describe('WorldModel — createRegion()', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  it('should create entity with REGION type', () => {
    const region = world.createRegion('reg-forest', { name: 'Forest' });

    expect(region.type).toBe(EntityType.REGION);
  });

  it('should use the author-supplied id', () => {
    const region = world.createRegion('reg-forest', { name: 'Forest' });

    expect(region.id).toBe('reg-forest');
  });

  it('should attach RegionTrait with correct name', () => {
    const region = world.createRegion('reg-forest', { name: 'Forest' });

    const trait = region.get<RegionTrait>(TraitType.REGION);
    expect(trait).toBeDefined();
    expect(trait!.name).toBe('Forest');
  });

  it('should attach RegionTrait with parentRegionId when provided', () => {
    world.createRegion('reg-underground', { name: 'Underground' });
    const coalMine = world.createRegion('reg-coal-mine', {
      name: 'Coal Mine',
      parentRegionId: 'reg-underground',
    });

    const trait = coalMine.get<RegionTrait>(TraitType.REGION);
    expect(trait!.parentRegionId).toBe('reg-underground');
  });

  it('should attach RegionTrait with defaultDark when provided', () => {
    const region = world.createRegion('reg-underground', {
      name: 'Underground',
      defaultDark: true,
    });

    const trait = region.get<RegionTrait>(TraitType.REGION);
    expect(trait!.defaultDark).toBe(true);
  });

  it('should make entity retrievable via getEntity()', () => {
    world.createRegion('reg-forest', { name: 'Forest' });

    const retrieved = world.getEntity('reg-forest');
    expect(retrieved).toBeDefined();
    expect(retrieved!.get<RegionTrait>(TraitType.REGION)!.name).toBe('Forest');
  });

  it('should throw if id already exists', () => {
    world.createRegion('reg-forest', { name: 'Forest' });

    expect(() => {
      world.createRegion('reg-forest', { name: 'Forest 2' });
    }).toThrow("createRegion: entity 'reg-forest' already exists");
  });

  it('should throw if parentRegionId references nonexistent entity', () => {
    expect(() => {
      world.createRegion('reg-coal-mine', {
        name: 'Coal Mine',
        parentRegionId: 'reg-nonexistent',
      });
    }).toThrow("createRegion: parent region 'reg-nonexistent' not found");
  });
});

describe('WorldModel — assignRoom()', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
    world.createRegion('reg-forest', { name: 'Forest' });
  });

  it('should set regionId on RoomTrait', () => {
    const room = world.createEntity('Clearing', EntityType.ROOM);
    room.add(new RoomTrait());

    world.assignRoom(room.id, 'reg-forest');

    const roomTrait = room.get<RoomTrait>(TraitType.ROOM);
    expect(roomTrait!.regionId).toBe('reg-forest');
  });

  it('should throw if room not found', () => {
    expect(() => {
      world.assignRoom('nonexistent', 'reg-forest');
    }).toThrow("assignRoom: room 'nonexistent' not found");
  });

  it('should throw if region not found', () => {
    const room = world.createEntity('Clearing', EntityType.ROOM);
    room.add(new RoomTrait());

    expect(() => {
      world.assignRoom(room.id, 'reg-nonexistent');
    }).toThrow("assignRoom: region 'reg-nonexistent' not found");
  });

  it('should throw if entity at regionId lacks RegionTrait', () => {
    const room = world.createEntity('Clearing', EntityType.ROOM);
    room.add(new RoomTrait());
    const notARegion = world.createEntity('Some Object', EntityType.OBJECT);

    expect(() => {
      world.assignRoom(room.id, notARegion.id);
    }).toThrow(`assignRoom: entity '${notARegion.id}' is not a region`);
  });

  it('should throw if entity at roomId lacks RoomTrait', () => {
    const item = world.createEntity('Ball', EntityType.OBJECT);

    expect(() => {
      world.assignRoom(item.id, 'reg-forest');
    }).toThrow(`assignRoom: entity '${item.id}' does not have RoomTrait`);
  });
});
