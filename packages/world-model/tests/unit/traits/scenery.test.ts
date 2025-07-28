// tests/unit/traits/scenery.test.ts

import { SceneryTrait } from '../../../src/traits/scenery/sceneryTrait';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { ReadableTrait } from '../../../src/traits/readable/readableTrait';

describe('SceneryTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new SceneryTrait();
      
      expect(trait.type).toBe(TraitType.SCENERY);
      expect(trait.cantTakeMessage).toBeUndefined();
      expect(trait.mentioned).toBe(true);
    });

    it('should create trait with provided data', () => {
      const trait = new SceneryTrait({
        cantTakeMessage: 'The fountain is far too heavy to move.',
        mentioned: false
      });
      
      expect(trait.cantTakeMessage).toBe('The fountain is far too heavy to move.');
      expect(trait.mentioned).toBe(false);
    });

    it('should handle partial initialization', () => {
      const trait = new SceneryTrait({
        cantTakeMessage: 'That\'s fixed in place.'
      });
      
      expect(trait.cantTakeMessage).toBe('That\'s fixed in place.');
      expect(trait.mentioned).toBe(true); // Default value
    });

    it('should handle only mentioned property', () => {
      const trait = new SceneryTrait({
        mentioned: false
      });
      
      expect(trait.cantTakeMessage).toBeUndefined();
      expect(trait.mentioned).toBe(false);
    });
  });

  describe('cant take messages', () => {
    it('should support custom messages for different items', () => {
      const tree = new SceneryTrait({
        cantTakeMessage: 'The tree\'s roots go deep into the earth.'
      });
      
      const statue = new SceneryTrait({
        cantTakeMessage: 'The marble statue must weigh a ton!'
      });
      
      const painting = new SceneryTrait({
        cantTakeMessage: 'The painting is securely fastened to the wall.'
      });
      
      expect(tree.cantTakeMessage).toContain('roots');
      expect(statue.cantTakeMessage).toContain('weigh');
      expect(painting.cantTakeMessage).toContain('fastened');
    });

    it('should allow undefined message for default handling', () => {
      const trait = new SceneryTrait();
      
      expect(trait.cantTakeMessage).toBeUndefined();
    });

    it('should support humorous messages', () => {
      const mountain = new SceneryTrait({
        cantTakeMessage: 'You briefly consider putting the mountain in your pocket, then think better of it.'
      });
      
      expect(mountain.cantTakeMessage).toContain('pocket');
    });
  });

  describe('mentioned property', () => {
    it('should handle mentioned scenery', () => {
      const trait = new SceneryTrait({
        mentioned: true
      });
      
      expect(trait.mentioned).toBe(true);
    });

    it('should handle unmentioned scenery', () => {
      const trait = new SceneryTrait({
        mentioned: false
      });
      
      expect(trait.mentioned).toBe(false);
    });

    it('should allow toggling mentioned state', () => {
      const trait = new SceneryTrait();
      
      expect(trait.mentioned).toBe(true);
      
      trait.mentioned = false;
      expect(trait.mentioned).toBe(false);
      
      trait.mentioned = true;
      expect(trait.mentioned).toBe(true);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('fountain', 'Stone Fountain');
      const trait = new SceneryTrait();
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.SCENERY)).toBe(true);
      expect(entity.getTrait(TraitType.SCENERY)).toBe(trait);
    });

    it('should create various scenery entities', () => {
      const fireplace = world.createEntity('fireplace', 'Stone Fireplace');
      fireplace.add(new SceneryTrait({
        cantTakeMessage: 'The fireplace is built into the wall.'
      }));
      
      const window = world.createEntity('window', 'Large Window');
      window.add(new SceneryTrait({
        cantTakeMessage: 'You can\'t take the window!'
      }));
      
      const carpet = world.createEntity('carpet', 'Ornate Carpet');
      carpet.add(new SceneryTrait({
        cantTakeMessage: 'The carpet is far too large and heavy to carry.'
      }));
      
      expect(fireplace.hasTrait(TraitType.SCENERY)).toBe(true);
      expect(window.hasTrait(TraitType.SCENERY)).toBe(true);
      expect(carpet.hasTrait(TraitType.SCENERY)).toBe(true);
    });

    it('should work with room decorations', () => {
      const room = world.createEntity('library', 'Library');
      room.add(new RoomTrait());
      room.add(new ContainerTrait());
      
      const chandelier = world.createEntity('chandelier', 'Crystal Chandelier');
      chandelier.add(new SceneryTrait({
        cantTakeMessage: 'The chandelier is suspended from the ceiling.',
        mentioned: true
      }));
      
      const wallpaper = world.createEntity('wallpaper', 'Faded Wallpaper');
      wallpaper.add(new SceneryTrait({
        mentioned: false // Hidden scenery
      }));
      
      const chandelierTrait = chandelier.getTrait(TraitType.SCENERY) as SceneryTrait;
      const wallpaperTrait = wallpaper.getTrait(TraitType.SCENERY) as SceneryTrait;
      expect(chandelierTrait.mentioned).toBe(true);
      expect(wallpaperTrait.mentioned).toBe(false);
    });

    it('should work with interactive scenery', () => {
      // Scenery that can be opened
      const cabinet = world.createEntity('cabinet', 'Wall Cabinet');
      cabinet.add(new SceneryTrait({
        cantTakeMessage: 'The cabinet is bolted to the wall.'
      }));
      cabinet.add(new OpenableTrait({
        isOpen: false
      }));
      cabinet.add(new ContainerTrait());
      
      // Scenery that can be read
      const plaque = world.createEntity('plaque', 'Bronze Plaque');
      plaque.add(new SceneryTrait({
        cantTakeMessage: 'The plaque is firmly attached to the wall.'
      }));
      plaque.add(new ReadableTrait({
        text: 'In memory of those who came before.'
      }));
      
      expect(cabinet.hasTrait(TraitType.SCENERY)).toBe(true);
      expect(cabinet.hasTrait(TraitType.OPENABLE)).toBe(true);
      expect(plaque.hasTrait(TraitType.SCENERY)).toBe(true);
      expect(plaque.hasTrait(TraitType.READABLE)).toBe(true);
    });
  });

  describe('scenery types', () => {
    it('should handle architectural features', () => {
      const wall = new SceneryTrait({
        cantTakeMessage: 'You can\'t take the wall. It\'s part of the building!'
      });
      
      const floor = new SceneryTrait({
        cantTakeMessage: 'The floor is rather firmly attached to the ground.'
      });
      
      const ceiling = new SceneryTrait({
        cantTakeMessage: 'The ceiling is out of reach and, more importantly, attached to the building.'
      });
      
      expect(wall.cantTakeMessage).toContain('building');
      expect(floor.cantTakeMessage).toContain('ground');
      expect(ceiling.cantTakeMessage).toContain('reach');
    });

    it('should handle natural features', () => {
      const rock = new SceneryTrait({
        cantTakeMessage: 'The boulder is far too heavy to lift.'
      });
      
      const stream = new SceneryTrait({
        cantTakeMessage: 'You can\'t pick up a stream!'
      });
      
      const tree = new SceneryTrait({
        cantTakeMessage: 'The ancient oak\'s roots run deep.'
      });
      
      expect(rock.cantTakeMessage).toContain('heavy');
      expect(stream.cantTakeMessage).toContain('pick up');
      expect(tree.cantTakeMessage).toContain('roots');
    });

    it('should handle furniture', () => {
      const desk = new SceneryTrait({
        cantTakeMessage: 'The heavy oak desk is not going anywhere.'
      });
      
      const bookshelf = new SceneryTrait({
        cantTakeMessage: 'The bookshelf is built into the wall.'
      });
      
      const throne = new SceneryTrait({
        cantTakeMessage: 'The throne belongs here. Besides, it weighs a ton.'
      });
      
      expect(desk.cantTakeMessage).toContain('heavy');
      expect(bookshelf.cantTakeMessage).toContain('built');
      expect(throne.cantTakeMessage).toContain('belongs');
    });
  });

  describe('visibility behavior', () => {
    it('should handle always-mentioned scenery', () => {
      const statue = new SceneryTrait({
        mentioned: true,
        cantTakeMessage: 'The statue is far too heavy.'
      });
      
      expect(statue.mentioned).toBe(true);
    });

    it('should handle hidden scenery', () => {
      const hiddenPanel = new SceneryTrait({
        mentioned: false,
        cantTakeMessage: 'The panel is part of the wall.'
      });
      
      expect(hiddenPanel.mentioned).toBe(false);
    });

    it('should handle discoverable scenery', () => {
      const secretDoor = new SceneryTrait({
        mentioned: false // Initially hidden
      });
      
      expect(secretDoor.mentioned).toBe(false);
      
      // After discovery
      secretDoor.mentioned = true;
      expect(secretDoor.mentioned).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new SceneryTrait({});
      
      expect(trait.cantTakeMessage).toBeUndefined();
      expect(trait.mentioned).toBe(true);
    });

    it('should handle undefined options', () => {
      const trait = new SceneryTrait(undefined);
      
      expect(trait.cantTakeMessage).toBeUndefined();
      expect(trait.mentioned).toBe(true);
    });

    it('should maintain type constant', () => {
      expect(SceneryTrait.type).toBe(TraitType.SCENERY);
      
      const trait = new SceneryTrait();
      expect(trait.type).toBe(TraitType.SCENERY);
      expect(trait.type).toBe(SceneryTrait.type);
    });

    it('should handle null values', () => {
      const trait = new SceneryTrait({
        cantTakeMessage: null as any,
        mentioned: null as any
      });
      
      expect(trait.cantTakeMessage).toBeNull();
      expect(trait.mentioned).toBeNull();
    });

    it('should preserve object reference', () => {
      const data = {
        cantTakeMessage: 'Too heavy!',
        mentioned: false
      };
      
      const trait = new SceneryTrait(data);
      
      // Modify original
      data.cantTakeMessage = 'Changed!';
      data.mentioned = true;
      
      // Trait should have original values
      expect(trait.cantTakeMessage).toBe('Too heavy!');
      expect(trait.mentioned).toBe(false);
    });
  });

  describe('complex scenarios', () => {
    it('should handle scenery with state changes', () => {
      const fountain = world.createEntity('fountain', 'Marble Fountain');
      
      const sceneryTrait = new SceneryTrait({
        cantTakeMessage: 'The fountain is a permanent fixture.',
        mentioned: true
      });
      
      fountain.add(sceneryTrait);
      
      // Fountain might be mentioned differently when dry vs flowing
      expect(sceneryTrait.mentioned).toBe(true);
      
      // Could hide when destroyed
      sceneryTrait.mentioned = false;
      expect(sceneryTrait.mentioned).toBe(false);
    });

    it('should handle scenery containers', () => {
      const altar = world.createEntity('altar', 'Stone Altar');
      
      altar.add(new SceneryTrait({
        cantTakeMessage: 'The altar is carved from a single block of stone and weighs several tons.'
      }));
      altar.add(new ContainerTrait()); // Can place items on it
      
      const bookcase = world.createEntity('bookcase', 'Wooden Bookcase');
      
      bookcase.add(new SceneryTrait({
        cantTakeMessage: 'The bookcase is built into the wall.'
      }));
      bookcase.add(new ContainerTrait());
      bookcase.add(new OpenableTrait({ isOpen: true }));
      
      expect(altar.hasTrait(TraitType.SCENERY)).toBe(true);
      expect(altar.hasTrait(TraitType.CONTAINER)).toBe(true);
      expect(bookcase.hasTrait(TraitType.SCENERY)).toBe(true);
      expect(bookcase.hasTrait(TraitType.CONTAINER)).toBe(true);
    });

    it('should handle scenery with multiple states', () => {
      const magicMirror = world.createEntity('mirror', 'Magic Mirror');
      
      const sceneryTrait = new SceneryTrait({
        cantTakeMessage: 'The mirror is embedded in the wall.',
        mentioned: true
      });
      
      magicMirror.add(sceneryTrait);
      
      // Mirror might become a portal (still scenery)
      expect(sceneryTrait.cantTakeMessage).toContain('embedded');
      
      // Could update message when transformed
      sceneryTrait.cantTakeMessage = 'The mirror shimmers with magical energy and cannot be moved.';
      expect(sceneryTrait.cantTakeMessage).toContain('magical');
    });

    it('should handle room-defining scenery', () => {
      // Scenery that helps define the room
      const dungeonBars = new SceneryTrait({
        cantTakeMessage: 'The iron bars are part of the cell.',
        mentioned: true
      });
      
      const throneRoomTapestry = new SceneryTrait({
        cantTakeMessage: 'The massive tapestry is woven into the very walls.',
        mentioned: true
      });
      
      const caveFormation = new SceneryTrait({
        cantTakeMessage: 'The stalactites have been growing here for millennia.',
        mentioned: true
      });
      
      expect(dungeonBars.mentioned).toBe(true);
      expect(throneRoomTapestry.mentioned).toBe(true);
      expect(caveFormation.mentioned).toBe(true);
    });
  });
});