// packages/world-model/tests/unit/traits/entry.test.ts

import { IFEntity } from '../../../src/entities/if-entity';
import { EntryTrait } from '../../../src/traits/entry/entryTrait';
import { TraitType } from '../../../src/traits/trait-types';

// Simple helper for entry trait tests
function createTestEntity(name: string): IFEntity {
  const entity = new IFEntity('test-' + name.replace(/\s+/g, '-'), 'object');
  entity.attributes.displayName = name;
  return entity;
}

describe('EntryTrait', () => {
  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new EntryTrait();
      
      expect(trait.type).toBe(TraitType.ENTRY);
      expect(trait.canEnter).toBe(true);
      expect(trait.preposition).toBe('in');
      expect(trait.maxOccupants).toBeUndefined();
      expect(trait.occupants).toEqual([]);
      expect(trait.occupantsVisible).toBe(true);
      expect(trait.canSeeOut).toBe(true);
      expect(trait.soundproof).toBe(false);
      expect(trait.enterMessage).toBeUndefined();
      expect(trait.exitMessage).toBeUndefined();
      expect(trait.fullMessage).toBeUndefined();
      expect(trait.blockedMessage).toBeUndefined();
      expect(trait.mobile).toBe(false);
      expect(trait.posture).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new EntryTrait({
        canEnter: false,
        preposition: 'on',
        maxOccupants: 2,
        occupants: ['player1'],
        occupantsVisible: false,
        canSeeOut: false,
        soundproof: true,
        enterMessage: 'You climb onto the horse.',
        exitMessage: 'You dismount the horse.',
        fullMessage: 'The horse cannot carry any more riders.',
        blockedMessage: 'The horse shies away from you.',
        mobile: true,
        posture: 'sitting'
      });
      
      expect(trait.canEnter).toBe(false);
      expect(trait.preposition).toBe('on');
      expect(trait.maxOccupants).toBe(2);
      expect(trait.occupants).toEqual(['player1']);
      expect(trait.occupantsVisible).toBe(false);
      expect(trait.canSeeOut).toBe(false);
      expect(trait.soundproof).toBe(true);
      expect(trait.enterMessage).toContain('climb onto');
      expect(trait.exitMessage).toContain('dismount');
      expect(trait.fullMessage).toContain('cannot carry');
      expect(trait.blockedMessage).toContain('shies away');
      expect(trait.mobile).toBe(true);
      expect(trait.posture).toBe('sitting');
    });
  });

  describe('prepositions', () => {
    it('should handle "in" preposition for containers', () => {
      const closet = createTestEntity('closet');
      const trait = new EntryTrait({ preposition: 'in' });
      closet.add(trait);
      
      expect(trait.preposition).toBe('in');
    });

    it('should handle "on" preposition for surfaces', () => {
      const bed = createTestEntity('bed');
      const trait = new EntryTrait({ preposition: 'on' });
      bed.add(trait);
      
      expect(trait.preposition).toBe('on');
    });

    it('should handle "under" preposition', () => {
      const table = createTestEntity('table');
      const trait = new EntryTrait({ preposition: 'under' });
      table.add(trait);
      
      expect(trait.preposition).toBe('under');
    });

    it('should handle "behind" preposition', () => {
      const curtain = createTestEntity('curtain');
      const trait = new EntryTrait({ preposition: 'behind' });
      curtain.add(trait);
      
      expect(trait.preposition).toBe('behind');
    });
  });

  describe('occupancy management', () => {
    it('should track single occupant', () => {
      const chair = createTestEntity('chair');
      const trait = new EntryTrait({ maxOccupants: 1 });
      chair.add(trait);
      
      trait.occupants = ['player'];
      
      expect(trait.occupants).toHaveLength(1);
      expect(trait.occupants).toContain('player');
    });

    it('should track multiple occupants', () => {
      const carriage = createTestEntity('carriage');
      const trait = new EntryTrait({ maxOccupants: 4 });
      carriage.add(trait);
      
      trait.occupants = ['player', 'npc1', 'npc2'];
      
      expect(trait.occupants).toHaveLength(3);
      expect(trait.maxOccupants).toBe(4);
    });

    it('should handle unlimited occupancy', () => {
      const bus = createTestEntity('bus');
      const trait = new EntryTrait();
      bus.add(trait);
      
      // Add many occupants
      trait.occupants = Array.from({ length: 50 }, (_, i) => `passenger${i}`);
      
      expect(trait.occupants).toHaveLength(50);
      expect(trait.maxOccupants).toBeUndefined();
    });

    it('should track occupancy state', () => {
      const booth = createTestEntity('phone booth');
      const trait = new EntryTrait({ maxOccupants: 1 });
      booth.add(trait);
      
      expect(trait.occupants).toHaveLength(0);
      
      trait.occupants.push('player');
      expect(trait.occupants).toHaveLength(1);
      
      trait.occupants = [];
      expect(trait.occupants).toHaveLength(0);
    });
  });

  describe('visibility and perception', () => {
    it('should handle visible occupants', () => {
      const glassCage = createTestEntity('glass cage');
      const trait = new EntryTrait({
        occupantsVisible: true,
        canSeeOut: true
      });
      glassCage.add(trait);
      
      expect(trait.occupantsVisible).toBe(true);
      expect(trait.canSeeOut).toBe(true);
    });

    it('should handle hidden occupants', () => {
      const trunk = createTestEntity('trunk');
      const trait = new EntryTrait({
        occupantsVisible: false,
        canSeeOut: false
      });
      trunk.add(trait);
      
      expect(trait.occupantsVisible).toBe(false);
      expect(trait.canSeeOut).toBe(false);
    });

    it('should handle one-way visibility', () => {
      const hideout = createTestEntity('hideout');
      const trait = new EntryTrait({
        occupantsVisible: false,
        canSeeOut: true
      });
      hideout.add(trait);
      
      expect(trait.occupantsVisible).toBe(false);
      expect(trait.canSeeOut).toBe(true);
    });

    it('should handle soundproofing', () => {
      const booth = createTestEntity('soundproof booth');
      const trait = new EntryTrait({
        soundproof: true
      });
      booth.add(trait);
      
      expect(trait.soundproof).toBe(true);
    });
  });

  describe('posture requirements', () => {
    it('should handle standing entries', () => {
      const booth = createTestEntity('phone booth');
      const trait = new EntryTrait({
        posture: 'standing'
      });
      booth.add(trait);
      
      expect(trait.posture).toBe('standing');
    });

    it('should handle sitting entries', () => {
      const chair = createTestEntity('armchair');
      const trait = new EntryTrait({
        posture: 'sitting',
        preposition: 'in'
      });
      chair.add(trait);
      
      expect(trait.posture).toBe('sitting');
    });

    it('should handle lying entries', () => {
      const bed = createTestEntity('bed');
      const trait = new EntryTrait({
        posture: 'lying',
        preposition: 'on'
      });
      bed.add(trait);
      
      expect(trait.posture).toBe('lying');
    });

    it('should handle no posture requirement', () => {
      const box = createTestEntity('large box');
      const trait = new EntryTrait();
      box.add(trait);
      
      expect(trait.posture).toBeUndefined();
    });
  });

  describe('custom messages', () => {
    it('should handle enter message', () => {
      const vehicle = createTestEntity('sports car');
      const trait = new EntryTrait({
        enterMessage: 'You slide into the leather driver\'s seat.',
        preposition: 'in'
      });
      vehicle.add(trait);
      
      expect(trait.enterMessage).toContain('leather driver\'s seat');
    });

    it('should handle exit message', () => {
      const horse = createTestEntity('horse');
      const trait = new EntryTrait({
        exitMessage: 'You carefully dismount the horse.',
        preposition: 'on'
      });
      horse.add(trait);
      
      expect(trait.exitMessage).toContain('dismount');
    });

    it('should handle full message', () => {
      const elevator = createTestEntity('elevator');
      const trait = new EntryTrait({
        maxOccupants: 6,
        fullMessage: 'A buzzer sounds. "Maximum weight exceeded!"'
      });
      elevator.add(trait);
      
      expect(trait.fullMessage).toContain('Maximum weight exceeded');
    });

    it('should handle blocked message', () => {
      const cage = createTestEntity('lion cage');
      const trait = new EntryTrait({
        canEnter: false,
        blockedMessage: 'The lion growls menacingly as you approach.'
      });
      cage.add(trait);
      
      expect(trait.blockedMessage).toContain('growls menacingly');
    });
  });

  describe('mobile entries', () => {
    it('should handle stationary entries', () => {
      const booth = createTestEntity('toll booth');
      const trait = new EntryTrait({
        mobile: false
      });
      booth.add(trait);
      
      expect(trait.mobile).toBe(false);
    });

    it('should handle mobile entries', () => {
      const car = createTestEntity('car');
      const trait = new EntryTrait({
        mobile: true,
        preposition: 'in'
      });
      car.add(trait);
      
      expect(trait.mobile).toBe(true);
    });

    it('should handle rideable animals', () => {
      const camel = createTestEntity('camel');
      const trait = new EntryTrait({
        mobile: true,
        preposition: 'on',
        posture: 'sitting',
        maxOccupants: 2
      });
      camel.add(trait);
      
      expect(trait.mobile).toBe(true);
      expect(trait.preposition).toBe('on');
      expect(trait.posture).toBe('sitting');
    });
  });

  describe('access control', () => {
    it('should handle open access', () => {
      const bench = createTestEntity('park bench');
      const trait = new EntryTrait({
        canEnter: true
      });
      bench.add(trait);
      
      expect(trait.canEnter).toBe(true);
    });

    it('should handle blocked access', () => {
      const throne = createTestEntity('throne');
      const trait = new EntryTrait({
        canEnter: false,
        blockedMessage: 'Only the king may sit upon the throne!'
      });
      throne.add(trait);
      
      expect(trait.canEnter).toBe(false);
      expect(trait.blockedMessage).toContain('Only the king');
    });

    it('should handle conditional access', () => {
      const vehicle = createTestEntity('military vehicle');
      const trait = new EntryTrait({
        canEnter: false,
        blockedMessage: 'You need proper authorization to enter this vehicle.'
      });
      vehicle.add(trait);
      
      // Simulate gaining access
      trait.canEnter = true;
      trait.blockedMessage = undefined;
      
      expect(trait.canEnter).toBe(true);
      expect(trait.blockedMessage).toBeUndefined();
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = new IFEntity('test-chair', 'furniture');
      const trait = new EntryTrait({
        preposition: 'on',
        posture: 'sitting',
        maxOccupants: 1
      });
      
      entity.add(trait);
      
      expect(entity.has(TraitType.ENTRY)).toBe(true);
      const retrievedTrait = entity.get(TraitType.ENTRY) as EntryTrait;
      expect(retrievedTrait.preposition).toBe('on');
      expect(retrievedTrait.posture).toBe('sitting');
    });

    it('should replace existing entry trait', () => {
      const entity = createTestEntity('vehicle');
      
      const trait1 = new EntryTrait({
        preposition: 'in',
        maxOccupants: 4
      });
      entity.add(trait1);
      
      const trait2 = new EntryTrait({
        preposition: 'on',
        maxOccupants: 2,
        mobile: true
      });
      entity.add(trait2);
      
      const retrievedTrait = entity.get(TraitType.ENTRY) as EntryTrait;
      expect(retrievedTrait.preposition).toBe('on');
      expect(retrievedTrait.maxOccupants).toBe(2);
      expect(retrievedTrait.mobile).toBe(true);
    });
  });

  describe('complex entry scenarios', () => {
    it('should handle nested entries', () => {
      const car = createTestEntity('car');
      const carTrait = new EntryTrait({
        preposition: 'in',
        maxOccupants: 5,
        mobile: true
      });
      car.add(carTrait);
      
      const trunk = createTestEntity('trunk');
      const trunkTrait = new EntryTrait({
        preposition: 'in',
        occupantsVisible: false,
        canSeeOut: false
      });
      trunk.add(trunkTrait);
      
      // Both can have occupants independently
      carTrait.occupants = ['driver', 'passenger1'];
      trunkTrait.occupants = ['stowaway'];
      
      expect(carTrait.occupants).toHaveLength(2);
      expect(trunkTrait.occupants).toHaveLength(1);
    });

    it('should handle multi-purpose entries', () => {
      const convertible = createTestEntity('convertible sofa bed');
      const trait = new EntryTrait({
        preposition: 'on',
        maxOccupants: 3,
        posture: 'sitting', // Default mode
        enterMessage: 'You sit on the sofa.',
        exitMessage: 'You get up from the sofa.'
      });
      convertible.add(trait);
      
      // Simulate converting to bed mode
      trait.posture = 'lying';
      trait.enterMessage = 'You lie down on the bed.';
      trait.exitMessage = 'You get out of bed.';
      
      expect(trait.posture).toBe('lying');
      expect(trait.enterMessage).toContain('lie down');
    });

    it('should handle vehicle with compartments', () => {
      const train = createTestEntity('train car');
      const trait = new EntryTrait({
        preposition: 'in',
        maxOccupants: 50,
        mobile: true,
        canSeeOut: true,
        enterMessage: 'You board the train and find a seat.',
        exitMessage: 'You exit the train onto the platform.'
      });
      train.add(trait);
      
      // Simulate crowded train
      trait.occupants = Array.from({ length: 48 }, (_, i) => `passenger${i}`);
      
      expect(trait.occupants).toHaveLength(48);
      expect(trait.maxOccupants).toBe(50);
    });

    it('should handle theatrical entries', () => {
      const coffin = createTestEntity('vampire coffin');
      const trait = new EntryTrait({
        preposition: 'in',
        maxOccupants: 1,
        posture: 'lying',
        occupantsVisible: false,
        canSeeOut: false,
        soundproof: true,
        enterMessage: 'You lie down in the coffin. The lid closes with a soft thud.',
        exitMessage: 'The coffin lid creaks open and you sit up.',
        blockedMessage: 'The coffin is sealed shut!'
      });
      coffin.add(trait);
      
      expect(trait.soundproof).toBe(true);
      expect(trait.posture).toBe('lying');
      expect(trait.enterMessage).toContain('lid closes');
    });
  });
});
