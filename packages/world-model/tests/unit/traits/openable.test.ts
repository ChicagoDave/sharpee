// tests/unit/traits/openable.test.ts

import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { createTestOpenableContainer } from '../../fixtures/test-entities';

describe('OpenableTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new OpenableTrait();
      
      expect(trait.type).toBe(TraitType.OPENABLE);
      expect(trait.isOpen).toBe(false);
      expect(trait.startsOpen).toBe(false);
      expect(trait.revealsContents).toBe(true);
      expect(trait.canClose).toBe(true);
      expect(trait.openMessage).toBeUndefined();
      expect(trait.closeMessage).toBeUndefined();
      expect(trait.alreadyOpenMessage).toBeUndefined();
      expect(trait.alreadyClosedMessage).toBeUndefined();
      expect(trait.openSound).toBeUndefined();
      expect(trait.closeSound).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new OpenableTrait({
        isOpen: true,
        startsOpen: true,
        openMessage: 'The chest creaks open.',
        closeMessage: 'You close the chest.',
        alreadyOpenMessage: 'It\'s already open.',
        alreadyClosedMessage: 'It\'s already closed.',
        revealsContents: false,
        canClose: false,
        openSound: 'creak.mp3',
        closeSound: 'thud.mp3'
      });
      
      expect(trait.isOpen).toBe(true);
      expect(trait.startsOpen).toBe(true);
      expect(trait.openMessage).toBe('The chest creaks open.');
      expect(trait.closeMessage).toBe('You close the chest.');
      expect(trait.alreadyOpenMessage).toBe('It\'s already open.');
      expect(trait.alreadyClosedMessage).toBe('It\'s already closed.');
      expect(trait.revealsContents).toBe(false);
      expect(trait.canClose).toBe(false);
      expect(trait.openSound).toBe('creak.mp3');
      expect(trait.closeSound).toBe('thud.mp3');
    });

    it('should use startsOpen to set initial isOpen if not provided', () => {
      const trait = new OpenableTrait({ startsOpen: true });
      expect(trait.isOpen).toBe(true);
      expect(trait.startsOpen).toBe(true);
    });

    it('should prefer explicit isOpen over startsOpen', () => {
      const trait = new OpenableTrait({ 
        isOpen: false, 
        startsOpen: true 
      });
      expect(trait.isOpen).toBe(false);
      expect(trait.startsOpen).toBe(true);
    });
  });

  describe('state management', () => {
    it('should allow changing open state', () => {
      const trait = new OpenableTrait();
      
      expect(trait.isOpen).toBe(false);
      
      trait.isOpen = true;
      expect(trait.isOpen).toBe(true);
      
      trait.isOpen = false;
      expect(trait.isOpen).toBe(false);
    });

    it('should maintain other properties when state changes', () => {
      const trait = new OpenableTrait({
        openMessage: 'Opening...',
        revealsContents: true,
        canClose: true
      });
      
      trait.isOpen = true;
      
      expect(trait.openMessage).toBe('Opening...');
      expect(trait.revealsContents).toBe(true);
      expect(trait.canClose).toBe(true);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Wooden Chest', 'container');
      const trait = new OpenableTrait();
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.OPENABLE)).toBe(true);
      expect(entity.getTrait(TraitType.OPENABLE)).toBe(trait);
    });

    it('should work with container entities', () => {
      const chest = createTestOpenableContainer(world, 'Chest', false);
      
      expect(chest.hasTrait(TraitType.CONTAINER)).toBe(true);
      expect(chest.hasTrait(TraitType.OPENABLE)).toBe(true);
      
      const openable = chest.getTrait(TraitType.OPENABLE) as OpenableTrait;
      expect(openable.isOpen).toBe(false);
    });

    it('should handle entity with multiple state traits', () => {
      const entity = world.createEntity('Ancient Book', 'item');
      
      // Add both openable and readable traits
      entity.add(new OpenableTrait({ 
        isOpen: false,
        openMessage: 'You open the ancient book.'
      }));
      
      expect(entity.hasTrait(TraitType.OPENABLE)).toBe(true);
      
      const openable = entity.getTrait(TraitType.OPENABLE) as OpenableTrait;
      expect(openable.openMessage).toBe('You open the ancient book.');
    });
  });

  describe('special behaviors', () => {
    it('should handle one-way openable (canClose = false)', () => {
      const trait = new OpenableTrait({
        canClose: false,
        openMessage: 'The ancient seal breaks as you open it.'
      });
      
      expect(trait.canClose).toBe(false);
      expect(trait.isOpen).toBe(false);
      
      // Simulate opening
      trait.isOpen = true;
      
      // Should indicate it cannot be closed
      expect(trait.canClose).toBe(false);
    });

    it('should handle revealsContents setting', () => {
      const secretCompartment = new OpenableTrait({
        revealsContents: false,
        openMessage: 'You find a hidden switch, but the compartment appears empty.'
      });
      
      expect(secretCompartment.revealsContents).toBe(false);
    });

    it('should support sound effects', () => {
      const door = new OpenableTrait({
        openSound: 'door_creak.mp3',
        closeSound: 'door_slam.mp3'
      });
      
      expect(door.openSound).toBe('door_creak.mp3');
      expect(door.closeSound).toBe('door_slam.mp3');
    });
  });

  describe('message customization', () => {
    it('should store all custom messages', () => {
      const trait = new OpenableTrait({
        openMessage: 'The heavy lid lifts with effort.',
        closeMessage: 'You push the lid back down.',
        alreadyOpenMessage: 'The lid is already raised.',
        alreadyClosedMessage: 'The lid is already down.'
      });
      
      expect(trait.openMessage).toBe('The heavy lid lifts with effort.');
      expect(trait.closeMessage).toBe('You push the lid back down.');
      expect(trait.alreadyOpenMessage).toBe('The lid is already raised.');
      expect(trait.alreadyClosedMessage).toBe('The lid is already down.');
    });

    it('should allow partial message customization', () => {
      const trait = new OpenableTrait({
        openMessage: 'Click!'
        // Other messages remain undefined
      });
      
      expect(trait.openMessage).toBe('Click!');
      expect(trait.closeMessage).toBeUndefined();
      expect(trait.alreadyOpenMessage).toBeUndefined();
      expect(trait.alreadyClosedMessage).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new OpenableTrait({});
      
      expect(trait.isOpen).toBe(false);
      expect(trait.startsOpen).toBe(false);
      expect(trait.revealsContents).toBe(true);
      expect(trait.canClose).toBe(true);
    });

    it('should handle undefined options', () => {
      const trait = new OpenableTrait(undefined);
      
      expect(trait.isOpen).toBe(false);
      expect(trait.startsOpen).toBe(false);
      expect(trait.revealsContents).toBe(true);
      expect(trait.canClose).toBe(true);
    });

    it('should maintain type constant', () => {
      expect(OpenableTrait.type).toBe(TraitType.OPENABLE);
      
      const trait = new OpenableTrait();
      expect(trait.type).toBe(TraitType.OPENABLE);
      expect(trait.type).toBe(OpenableTrait.type);
    });
  });
});
