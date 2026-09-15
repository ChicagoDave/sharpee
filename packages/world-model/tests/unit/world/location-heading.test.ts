/**
 * ADR-349 Phase 1 — the location-heading registry (D16 contract 2) and the
 * per-turn projection (D11, D16a).
 *
 * AC-9 lives here: a `room name` whose arms all fail falls back exactly as an
 * absent block does, it does not render the last arm, and an unconditional arm
 * alongside failing conditional ones wins. The "does not render empty" half of
 * AC-9 is a consumer property and lands with the room block and the `location`
 * channel in Phase 4 — what this file pins is that `resolve` reports the two
 * cases identically, which is what makes the consumer's single fallback correct.
 */

import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { RegionTrait } from '../../../src/traits/region/regionTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { VehicleTrait } from '../../../src/traits/vehicle/vehicleTrait';
import { LocationHeadingBehavior } from '../../../src/world/LocationHeadingBehavior';
import {
  registerLocationName,
  lookupLocationName,
  clearLocationNames,
} from '../../../src/location-heading-registry';

describe('location-heading registry (ADR-349 D16 contract 2)', () => {
  beforeEach(() => clearLocationNames());
  afterEach(() => clearLocationNames());

  it('stores the arms it was handed, readable back under the same id', () => {
    expect(lookupLocationName('r_well')).toBeUndefined();

    const arms = [{ text: 'Top of Well' }];
    registerLocationName('r_well', arms);

    expect(lookupLocationName('r_well')).toEqual([{ text: 'Top of Well' }]);
  });

  it('replaces on re-registration rather than stacking (idempotent last-wins)', () => {
    registerLocationName('r_well', [{ text: 'first load' }]);
    registerLocationName('r_well', [{ text: 'second load' }]);

    const stored = lookupLocationName('r_well');
    expect(stored).toHaveLength(1);
    expect(stored![0].text).toBe('second load');
  });

  it('clearLocationNames empties the registry', () => {
    registerLocationName('r_well', [{ text: 'Top of Well' }]);
    expect(lookupLocationName('r_well')).toBeDefined();

    clearLocationNames();

    expect(lookupLocationName('r_well')).toBeUndefined();
  });

  it('registering an entity with no arms leaves nothing for the projection to read', () => {
    registerLocationName('r_well', []);
    expect(lookupLocationName('r_well')).toEqual([]);
  });
});

describe('LocationHeadingBehavior.resolve (ADR-349 D11, D16a)', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;

  beforeEach(() => {
    clearLocationNames();
    world = new WorldModel();

    room = world.createEntity('Top of Well', 'room');
    room.add(new RoomTrait());
    room.add(new ContainerTrait());

    player = world.createEntity('Player', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());
    world.moveEntity(player.id, room.id);
  });

  afterEach(() => clearLocationNames());

  describe('arm selection (AC-9)', () => {
    it('renders the first arm whose condition holds', () => {
      registerLocationName(room.id, [
        { holds: () => false, text: 'Flooded Well' },
        { holds: () => true, text: 'Dry Well' },
        { text: 'Top of Well' },
      ]);

      const parts = LocationHeadingBehavior.resolve(player, world);

      expect(parts).toHaveLength(1);
      expect(parts[0].text).toBe('Dry Well');
    });

    it('an unconditional arm wins when every conditional arm fails', () => {
      registerLocationName(room.id, [
        { holds: () => false, text: 'Flooded Well' },
        { text: 'Top of Well' },
      ]);

      const parts = LocationHeadingBehavior.resolve(player, world);

      expect(parts).toHaveLength(1);
      expect(parts[0].text).toBe('Top of Well');
    });

    it('all arms conditional and none holding reports exactly as an absent block does', () => {
      registerLocationName(room.id, [
        { holds: () => false, text: 'Flooded Well' },
        { holds: () => false, text: 'Frozen Well' },
      ]);
      const allFail = LocationHeadingBehavior.resolve(player, world);

      clearLocationNames();
      const neverRegistered = LocationHeadingBehavior.resolve(player, world);

      expect(allFail).toEqual([]);
      expect(allFail).toEqual(neverRegistered);
    });

    it('does not fall through to the last arm when every condition fails', () => {
      registerLocationName(room.id, [
        { holds: () => false, text: 'Flooded Well' },
        { holds: () => false, text: 'Frozen Well' },
      ]);

      const texts = LocationHeadingBehavior.resolve(player, world).map(p => p.text);

      expect(texts).not.toContain('Frozen Well');
    });
  });

  describe('the projection is live, never stored (D2)', () => {
    it('follows a world change on the next turn with no re-registration', () => {
      const bucket = world.createEntity('bucket', 'container');
      bucket.add(new ContainerTrait());
      bucket.add(new OpenableTrait({ isOpen: true }));
      const openable = bucket.get<OpenableTrait>('openable')!;

      registerLocationName(room.id, [
        { holds: () => openable.isOpen, text: 'Top of Well, lid off' },
        { text: 'Top of Well' },
      ]);

      expect(LocationHeadingBehavior.resolve(player, world)[0].text).toBe('Top of Well, lid off');

      openable.isOpen = false;

      expect(LocationHeadingBehavior.resolve(player, world)[0].text).toBe('Top of Well');
    });
  });

  describe('contributors and their order (D4, D16a)', () => {
    it('emits place, then enclosure, then regions innermost-to-outermost', () => {
      const outer = world.createEntity('The Underground', 'object');
      outer.add(new RegionTrait({ name: 'The Underground' }));
      const inner = world.createEntity('The Well Shaft', 'object');
      inner.add(new RegionTrait({ name: 'The Well Shaft', parentRegionId: outer.id }));
      world.assignRoom(room.id, inner.id);

      // A transparent vehicle keeps the room as the place and becomes the
      // enclosure (VisibilityBehavior.getDescribableLocation).
      const bucket = world.createEntity('bucket', 'container');
      bucket.add(new ContainerTrait());
      bucket.add(new VehicleTrait({ transparent: true }));
      world.moveEntity(bucket.id, room.id);
      world.moveEntity(player.id, bucket.id);

      registerLocationName(room.id, [{ text: 'Top of Well' }]);
      registerLocationName(bucket.id, [{ text: 'in the bucket' }]);
      registerLocationName(inner.id, [{ text: 'the shaft' }]);
      registerLocationName(outer.id, [{ text: 'underground' }]);

      const parts = LocationHeadingBehavior.resolve(player, world);

      expect(parts.map(p => [p.role, p.text])).toEqual([
        ['place', 'Top of Well'],
        ['enclosure', 'in the bucket'],
        ['region', 'the shaft'],
        ['region', 'underground'],
      ]);
      expect(parts.map(p => p.ownerId)).toEqual([room.id, bucket.id, inner.id, outer.id]);
    });

    it('a silent contributor contributes nothing — a region speaks for a nameless room', () => {
      const maze = world.createEntity('The Maze', 'object');
      maze.add(new RegionTrait({ name: 'The Maze' }));
      const cell = world.createEntity('maze-1', 'room');
      cell.add(new RoomTrait());
      cell.add(new ContainerTrait());
      world.assignRoom(cell.id, maze.id);
      world.moveEntity(player.id, cell.id);

      registerLocationName(maze.id, [{ text: 'Maze of twisty little passages, all alike' }]);

      const parts = LocationHeadingBehavior.resolve(player, world);

      expect(parts).toHaveLength(1);
      expect(parts[0].role).toBe('region');
      expect(parts[0].text).toBe('Maze of twisty little passages, all alike');
      expect(parts.map(p => p.ownerId)).not.toContain(cell.id);
    });

    it('an opaque vehicle is the place and composes with nothing (D4a)', () => {
      const region = world.createEntity('The Station', 'object');
      region.add(new RegionTrait({ name: 'The Station' }));
      world.assignRoom(room.id, region.id);

      const tube = world.createEntity('tube', 'container');
      tube.add(new ContainerTrait());
      tube.add(new VehicleTrait({ transparent: false }));
      world.moveEntity(tube.id, room.id);
      world.moveEntity(player.id, tube.id);

      registerLocationName(room.id, [{ text: 'Top of Well' }]);
      registerLocationName(tube.id, [{ text: 'Inside the tube' }]);
      registerLocationName(region.id, [{ text: 'the station' }]);

      const parts = LocationHeadingBehavior.resolve(player, world);

      expect(parts.map(p => [p.role, p.text])).toEqual([['place', 'Inside the tube']]);
    });

    it('terminates on a region cycle rather than hanging', () => {
      const a = world.createEntity('Region A', 'object');
      a.add(new RegionTrait({ name: 'Region A' }));
      const b = world.createEntity('Region B', 'object');
      b.add(new RegionTrait({ name: 'Region B', parentRegionId: a.id }));
      a.get<RegionTrait>('region')!.parentRegionId = b.id;
      world.assignRoom(room.id, b.id);

      registerLocationName(room.id, [{ text: 'Top of Well' }]);

      const parts = LocationHeadingBehavior.resolve(player, world);

      // The cycle is walked, contributes nothing (neither region registered a
      // name), and terminates — without the depth guard this test does not fail,
      // it never returns.
      expect(parts.map(p => [p.role, p.text])).toEqual([['place', 'Top of Well']]);
    });
  });
});
