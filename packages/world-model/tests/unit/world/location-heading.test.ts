/**
 * ADR-349 Phase 1 — the location-heading registry (D16 contract 2) and the
 * per-turn projection (D11; regions contribute nothing since ADR-360 D6).
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

describe('LocationHeadingBehavior.resolve (ADR-349 D11)', () => {
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

  describe('contributors and their order (D4; ADR-360 D6)', () => {
    it('emits place, then enclosure — the room\'s region contributes nothing even when named', () => {
      const shaft = world.createEntity('The Well Shaft', 'object');
      shaft.add(new RegionTrait({ name: 'The Well Shaft' }));
      world.assignRoom(room.id, shaft.id);

      // A transparent vehicle keeps the room as the place and becomes the
      // enclosure (VisibilityBehavior.getDescribableLocation).
      const bucket = world.createEntity('bucket', 'container');
      bucket.add(new ContainerTrait());
      bucket.add(new VehicleTrait({ transparent: true }));
      world.moveEntity(bucket.id, room.id);
      world.moveEntity(player.id, bucket.id);

      registerLocationName(room.id, [{ text: 'Top of Well' }]);
      registerLocationName(bucket.id, [{ text: 'in the bucket' }]);
      registerLocationName(shaft.id, [{ text: 'the shaft' }]);

      const parts = LocationHeadingBehavior.resolve(player, world);

      expect(parts.map(p => [p.role, p.text])).toEqual([
        ['place', 'Top of Well'],
        ['enclosure', 'in the bucket'],
      ]);
      expect(parts.map(p => p.ownerId)).toEqual([room.id, bucket.id]);
    });

    it('a member room\'s heading has exactly one place part, its own (ADR-360 AC-6)', () => {
      const maze = world.createEntity('The Maze', 'object');
      maze.add(new RegionTrait({ name: 'The Maze' }));
      const cell = world.createEntity('maze-1', 'room');
      cell.add(new RoomTrait());
      cell.add(new ContainerTrait());
      world.assignRoom(cell.id, maze.id);
      world.moveEntity(player.id, cell.id);

      registerLocationName(maze.id, [{ text: 'Maze of twisty little passages, all alike' }]);
      registerLocationName(cell.id, [{ text: 'Maze' }]);

      const parts = LocationHeadingBehavior.resolve(player, world);

      expect(parts.map(p => [p.role, p.ownerId, p.text])).toEqual([['place', cell.id, 'Maze']]);
    });

    it('a nameless member room of a named region yields no parts — the region does not speak for it', () => {
      const maze = world.createEntity('The Maze', 'object');
      maze.add(new RegionTrait({ name: 'The Maze' }));
      const cell = world.createEntity('maze-1', 'room');
      cell.add(new RoomTrait());
      cell.add(new ContainerTrait());
      world.assignRoom(cell.id, maze.id);
      world.moveEntity(player.id, cell.id);

      registerLocationName(maze.id, [{ text: 'Maze of twisty little passages, all alike' }]);

      expect(LocationHeadingBehavior.resolve(player, world)).toEqual([]);
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
  });
});
