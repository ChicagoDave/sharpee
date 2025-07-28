// packages/world-model/tests/unit/traits/room.test.ts

import { IFEntity } from '../../../src/entities/if-entity';
import { RoomTrait, ExitInfo } from '../../../src/traits/room/roomTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { createTestRoom, createConnectedRooms } from '../../fixtures/test-entities';

describe('RoomTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });
  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new RoomTrait();
      
      expect(trait.type).toBe(TraitType.ROOM);
      expect(trait.visited).toBe(false);
      expect(trait.exits).toEqual({});
      expect(trait.blockedExits).toBeUndefined();
      expect(trait.outdoor).toBe(false);
      expect(trait.isDark).toBe(false); // Default to lit
      expect(trait.isOutdoors).toBe(false);
      expect(trait.isUnderground).toBe(false);
      expect(trait.initialDescription).toBeUndefined();
      expect(trait.ambientSound).toBeUndefined();
      expect(trait.ambientSmell).toBeUndefined();
      expect(trait.region).toBeUndefined();
      expect(trait.tags).toEqual([]);
    });

    it('should create trait with provided data', () => {
      const trait = new RoomTrait({
        visited: true,
        exits: {
          north: { destination: 'hallway' },
          east: { destination: 'garden', via: 'glass-door' }
        },
        blockedExits: { south: 'The way south is blocked by rubble.' },
        outdoor: true,
        isDark: false,
        isOutdoors: true,
        initialDescription: 'As you enter the courtyard, birds scatter from the fountain.',
        ambientSound: 'Birds chirp in the nearby trees.',
        ambientSmell: 'The scent of roses fills the air.',
        region: 'castle-grounds',
        tags: ['outdoor', 'courtyard', 'peaceful']
      });
      
      expect(trait.visited).toBe(true);
      expect(trait.exits.north).toEqual({ destination: 'hallway' });
      expect(trait.exits.east).toEqual({ destination: 'garden', via: 'glass-door' });
      expect(trait.blockedExits?.south).toBe('The way south is blocked by rubble.');
      expect(trait.outdoor).toBe(true);
      expect(trait.isDark).toBe(false);
      expect(trait.isOutdoors).toBe(true);
      expect(trait.initialDescription).toContain('birds scatter');
      expect(trait.ambientSound).toContain('Birds chirp');
      expect(trait.ambientSmell).toContain('roses');
      expect(trait.region).toBe('castle-grounds');
      expect(trait.tags).toContain('outdoor');
      expect(trait.tags).toContain('peaceful');
    });
  });

  describe('exits management', () => {
    it('should handle simple exits', () => {
      const room = createTestRoom(world, 'Library');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      
      trait.exits = {
        north: { destination: 'hallway' },
        south: { destination: 'study' },
        up: { destination: 'attic' }
      };
      
      expect(Object.keys(trait.exits)).toHaveLength(3);
      expect(trait.exits.north.destination).toBe('hallway');
      expect(trait.exits.south.destination).toBe('study');
      expect(trait.exits.up.destination).toBe('attic');
    });

    it('should handle exits with doors', () => {
      const room = createTestRoom(world, 'Office');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      
      trait.exits = {
        west: { destination: 'corridor', via: 'oak-door' },
        east: { destination: 'balcony', via: 'french-doors' }
      };
      
      expect(trait.exits.west.via).toBe('oak-door');
      expect(trait.exits.east.via).toBe('french-doors');
    });

    it('should handle blocked exits', () => {
      const room = createTestRoom(world, 'Cave');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      
      trait.exits = {
        north: { destination: 'tunnel' }
      };
      trait.blockedExits = {
        south: 'The cave-in blocks your way south.',
        east: 'A deep chasm prevents eastward travel.'
      };
      
      expect(trait.blockedExits).toBeDefined();
      expect(trait.blockedExits?.south).toContain('cave-in');
      expect(trait.blockedExits?.east).toContain('chasm');
    });

    it('should handle custom exits', () => {
      const room = createTestRoom(world, 'Wizard Tower');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      
      trait.exits = {
        portal: { destination: 'ethereal-plane' },
        slide: { destination: 'basement' },
        teleporter: { destination: 'moon-base' }
      };
      
      expect(trait.exits.portal).toBeDefined();
      expect(trait.exits.slide).toBeDefined();
      expect(trait.exits.teleporter).toBeDefined();
    });
  });

  describe('darkness', () => {
    it('should handle dark rooms', () => {
      const room = createTestRoom(world, 'Cellar');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      trait.isDark = true;
      trait.isUnderground = true;
      
      expect(trait.isDark).toBe(true);
      expect(trait.isUnderground).toBe(true);
    });

    it('should handle lit rooms', () => {
      const room = createTestRoom(world, 'Kitchen');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      trait.isDark = false;
      
      expect(trait.isDark).toBe(false);
    });

    it('should handle outdoor lighting', () => {
      const room = createTestRoom(world, 'Garden');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      trait.isOutdoors = true;
      trait.isDark = false; // Outdoor during day
      
      expect(trait.isOutdoors).toBe(true);
      expect(trait.isDark).toBe(false);
    });

    it('should handle underground rooms', () => {
      const room = createTestRoom(world, 'Cavern');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      trait.isUnderground = true;
      trait.isDark = true;
      
      expect(trait.isUnderground).toBe(true);
      expect(trait.isDark).toBe(true);
    });
  });

  describe('visit tracking', () => {
    it('should start unvisited', () => {
      const room = createTestRoom(world, 'Secret Chamber');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      
      expect(trait.visited).toBe(false);
    });

    it('should track visited state', () => {
      const room = createTestRoom(world, 'Throne Room');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      
      trait.visited = true;
      
      expect(trait.visited).toBe(true);
    });

    it('should handle initial description', () => {
      const room = createTestRoom(world, 'Ancient Library');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      trait.initialDescription = 'Dust motes dance in the shafts of light filtering through tall windows. The musty smell of old books fills your nostrils.';
      
      expect(trait.initialDescription).toContain('Dust motes');
      expect(trait.initialDescription).toContain('musty smell');
    });
  });

  describe('ambience', () => {
    it('should handle ambient sounds', () => {
      const room = createTestRoom(world, 'Waterfall Cave');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      trait.ambientSound = 'The roar of falling water echoes through the cave.';
      
      expect(trait.ambientSound).toContain('falling water');
    });

    it('should handle ambient smells', () => {
      const room = createTestRoom(world, 'Kitchen');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      trait.ambientSmell = 'The aroma of freshly baked bread wafts from the oven.';
      
      expect(trait.ambientSmell).toContain('baked bread');
    });

    it('should handle both sound and smell', () => {
      const room = createTestRoom(world, 'Market Square');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      trait.ambientSound = 'Merchants hawk their wares while children laugh and play.';
      trait.ambientSmell = 'The mixed scents of spices, leather, and fresh fruit fill the air.';
      
      expect(trait.ambientSound).toContain('Merchants');
      expect(trait.ambientSmell).toContain('spices');
    });
  });

  describe('regions and tags', () => {
    it('should handle region assignment', () => {
      const room = createTestRoom(world, 'Guard Tower');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      trait.region = 'castle-walls';
      
      expect(trait.region).toBe('castle-walls');
    });

    it('should handle multiple tags', () => {
      const room = createTestRoom(world, 'Dungeon Cell');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      trait.tags = ['prison', 'dark', 'damp', 'underground'];
      
      expect(trait.tags).toHaveLength(4);
      expect(trait.tags).toContain('prison');
      expect(trait.tags).toContain('underground');
    });

    it('should handle rooms without regions or tags', () => {
      const room = createTestRoom(world, 'Generic Room');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      
      expect(trait.region).toBeUndefined();
      expect(trait.tags).toEqual([]);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = new IFEntity('test-room', 'room');
      const trait = new RoomTrait({
        exits: { north: { destination: 'hallway' } }
      });
      
      entity.add(trait);
      
      expect(entity.has(TraitType.ROOM)).toBe(true);
      const retrievedTrait = entity.get(TraitType.ROOM) as RoomTrait;
      expect(retrievedTrait.exits.north?.destination).toBe('hallway');
    });

    it('should work with container trait', () => {
      const room = createTestRoom(world, 'Storage Room');
      
      expect(room.has(TraitType.ROOM)).toBe(true);
      expect(room.has(TraitType.CONTAINER)).toBe(true);
    });
  });

  describe('complex room setups', () => {
    it('should handle maze-like connections', () => {
      const room = createTestRoom(world, 'Maze Junction');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      
      trait.exits = {
        north: { destination: 'maze-n' },
        south: { destination: 'maze-s' },
        east: { destination: 'maze-e' },
        west: { destination: 'maze-w' },
        northeast: { destination: 'maze-ne' },
        northwest: { destination: 'maze-nw' },
        southeast: { destination: 'maze-se' },
        southwest: { destination: 'maze-sw' }
      };
      
      expect(Object.keys(trait.exits)).toHaveLength(8);
    });

    it('should handle multi-level connections', () => {
      const room = createTestRoom(world, 'Stairwell');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      
      trait.exits = {
        up: { destination: 'second-floor' },
        down: { destination: 'basement' },
        north: { destination: 'first-floor-hall' }
      };
      trait.tags = ['vertical-connection', 'stairs'];
      
      expect(trait.exits.up).toBeDefined();
      expect(trait.exits.down).toBeDefined();
      expect(trait.tags).toContain('vertical-connection');
    });

    it('should handle outdoor/indoor transitions', () => {
      const room = createTestRoom(world, 'Castle Gate');
      const trait = room.get(TraitType.ROOM) as RoomTrait;
      
      trait.exits = {
        in: { destination: 'castle-entrance', via: 'portcullis' },
        out: { destination: 'drawbridge' }
      };
      trait.isOutdoors = true;
      trait.isDark = false;
      trait.tags = ['transition', 'entrance'];
      
      expect(trait.exits.in?.via).toBe('portcullis');
      expect(trait.isOutdoors).toBe(true);
      expect(trait.tags).toContain('transition');
    });
  });
});
