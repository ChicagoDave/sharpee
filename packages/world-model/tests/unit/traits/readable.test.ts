// tests/unit/traits/readable.test.ts

import { ReadableTrait } from '../../../src/traits/readable/readableTrait';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { EntityType } from '../../../src/entities/entity-types';

describe('ReadableTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new ReadableTrait();
      
      expect(trait.type).toBe(TraitType.READABLE);
      expect(trait.text).toBe('');
      expect(trait.preview).toBeUndefined();
      expect(trait.isReadable).toBe(true);
      expect(trait.language).toBe('common');
      expect(trait.requiresAbility).toBe(false);
      expect(trait.requiredAbility).toBeUndefined();
      expect(trait.cannotReadMessage).toBeUndefined();
      expect(trait.hasBeenRead).toBe(false);
      expect(trait.readableType).toBe('text');
      expect(trait.pages).toBeUndefined();
      expect(trait.currentPage).toBeUndefined();
      expect(trait.pageContent).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new ReadableTrait({
        text: 'Ancient wisdom lies within...',
        preview: 'An old leather-bound tome',
        isReadable: false,
        language: 'elvish',
        requiresAbility: true,
        requiredAbility: 'read_elvish',
        cannotReadMessage: 'The strange symbols mean nothing to you.',
        hasBeenRead: true,
        readableType: 'book',
        pages: 3,
        currentPage: 2
      });
      
      expect(trait.text).toBe('Ancient wisdom lies within...');
      expect(trait.preview).toBe('An old leather-bound tome');
      expect(trait.isReadable).toBe(false);
      expect(trait.language).toBe('elvish');
      expect(trait.requiresAbility).toBe(true);
      expect(trait.requiredAbility).toBe('read_elvish');
      expect(trait.cannotReadMessage).toBe('The strange symbols mean nothing to you.');
      expect(trait.hasBeenRead).toBe(true);
      expect(trait.readableType).toBe('book');
      expect(trait.pages).toBe(3);
      expect(trait.currentPage).toBe(2);
    });

    it('should auto-initialize pages from pageContent', () => {
      const trait = new ReadableTrait({
        pageContent: [
          'Page 1: The beginning...',
          'Page 2: The journey continues...',
          'Page 3: The end.'
        ]
      });
      
      expect(trait.currentPage).toBe(1);
      expect(trait.pages).toBe(3);
      expect(trait.pageContent).toHaveLength(3);
    });

    it('should not override currentPage if already set', () => {
      const trait = new ReadableTrait({
        pageContent: ['Page 1', 'Page 2', 'Page 3'],
        currentPage: 2
      });
      
      expect(trait.currentPage).toBe(2);
      // pages is not set when currentPage is already provided
      expect(trait.pages).toBeUndefined();
    });
  });

  describe('text content', () => {
    it('should handle simple text', () => {
      const trait = new ReadableTrait({
        text: 'Welcome to the village!'
      });
      
      expect(trait.text).toBe('Welcome to the village!');
      expect(trait.preview).toBeUndefined();
    });

    it('should handle multi-line text', () => {
      const trait = new ReadableTrait({
        text: `Line 1: Title
Line 2: Subtitle
Line 3: Content begins here...`
      });
      
      expect(trait.text).toContain('Line 1: Title');
      expect(trait.text).toContain('Line 2: Subtitle');
      expect(trait.text).toContain('Line 3: Content begins here...');
    });

    it('should handle preview text', () => {
      const trait = new ReadableTrait({
        text: 'This is a very long document with lots of important information...',
        preview: 'A lengthy document'
      });
      
      expect(trait.text).toBe('This is a very long document with lots of important information...');
      expect(trait.preview).toBe('A lengthy document');
    });

    it('should handle empty text', () => {
      const trait = new ReadableTrait({
        text: '',
        preview: 'A blank page'
      });
      
      expect(trait.text).toBe('');
      expect(trait.preview).toBe('A blank page');
    });
  });

  describe('language and abilities', () => {
    it('should support different languages', () => {
      const common = new ReadableTrait({ language: 'common' });
      const elvish = new ReadableTrait({ language: 'elvish' });
      const dwarvish = new ReadableTrait({ language: 'dwarvish' });
      const ancient = new ReadableTrait({ language: 'ancient_runes' });
      
      expect(common.language).toBe('common');
      expect(elvish.language).toBe('elvish');
      expect(dwarvish.language).toBe('dwarvish');
      expect(ancient.language).toBe('ancient_runes');
    });

    it('should handle ability requirements', () => {
      const trait = new ReadableTrait({
        requiresAbility: true,
        requiredAbility: 'literacy',
        cannotReadMessage: 'You cannot read.'
      });
      
      expect(trait.requiresAbility).toBe(true);
      expect(trait.requiredAbility).toBe('literacy');
      expect(trait.cannotReadMessage).toBe('You cannot read.');
    });

    it('should handle item requirements', () => {
      const trait = new ReadableTrait({
        requiresAbility: true,
        requiredAbility: 'magnifying_glass',
        cannotReadMessage: 'The text is too small to read without assistance.'
      });
      
      expect(trait.requiresAbility).toBe(true);
      expect(trait.requiredAbility).toBe('magnifying_glass');
    });

    it('should handle no requirements', () => {
      const trait = new ReadableTrait({
        text: 'DANGER!',
        requiresAbility: false
      });
      
      expect(trait.requiresAbility).toBe(false);
      expect(trait.requiredAbility).toBeUndefined();
      expect(trait.cannotReadMessage).toBeUndefined();
    });
  });

  describe('readable types', () => {
    it('should support various readable types', () => {
      const book = new ReadableTrait({ readableType: 'book' });
      const sign = new ReadableTrait({ readableType: 'sign' });
      const note = new ReadableTrait({ readableType: 'note' });
      const inscription = new ReadableTrait({ readableType: 'inscription' });
      const scroll = new ReadableTrait({ readableType: 'scroll' });
      const tablet = new ReadableTrait({ readableType: 'tablet' });
      
      expect(book.readableType).toBe('book');
      expect(sign.readableType).toBe('sign');
      expect(note.readableType).toBe('note');
      expect(inscription.readableType).toBe('inscription');
      expect(scroll.readableType).toBe('scroll');
      expect(tablet.readableType).toBe('tablet');
    });

    it('should allow custom readable types', () => {
      const trait = new ReadableTrait({
        readableType: 'holographic_display'
      });
      
      expect(trait.readableType).toBe('holographic_display');
    });
  });

  describe('multi-page support', () => {
    it('should handle books with multiple pages', () => {
      const trait = new ReadableTrait({
        readableType: 'book',
        pageContent: [
          'Chapter 1: The Beginning',
          'Chapter 2: The Journey',
          'Chapter 3: The Discovery',
          'Chapter 4: The Return'
        ]
      });
      
      expect(trait.pages).toBe(4);
      expect(trait.currentPage).toBe(1);
      expect(trait.pageContent).toHaveLength(4);
      expect(trait.pageContent![0]).toBe('Chapter 1: The Beginning');
      expect(trait.pageContent![3]).toBe('Chapter 4: The Return');
    });

    it('should handle current page navigation', () => {
      const trait = new ReadableTrait({
        pageContent: ['Page 1', 'Page 2', 'Page 3'],
        currentPage: 2
      });
      
      expect(trait.currentPage).toBe(2);
      
      // Simulate page turn
      trait.currentPage = 3;
      expect(trait.currentPage).toBe(3);
      
      trait.currentPage = 1;
      expect(trait.currentPage).toBe(1);
    });

    it('should handle single page with pageContent', () => {
      const trait = new ReadableTrait({
        pageContent: ['Only one page of content']
      });
      
      expect(trait.pages).toBe(1);
      expect(trait.currentPage).toBe(1);
      expect(trait.pageContent![0]).toBe('Only one page of content');
    });

    it('should handle empty pageContent array', () => {
      const trait = new ReadableTrait({
        pageContent: []
      });
      
      expect(trait.pageContent).toEqual([]);
      expect(trait.currentPage).toBeUndefined();
      expect(trait.pages).toBeUndefined();
    });
  });

  describe('state management', () => {
    it('should track read status', () => {
      const trait = new ReadableTrait();
      
      expect(trait.hasBeenRead).toBe(false);
      
      trait.hasBeenRead = true;
      expect(trait.hasBeenRead).toBe(true);
    });

    it('should handle readability state', () => {
      const trait = new ReadableTrait({
        isReadable: true
      });
      
      expect(trait.isReadable).toBe(true);
      
      // Make unreadable (e.g., too dark, damaged)
      trait.isReadable = false;
      expect(trait.isReadable).toBe(false);
    });

    it('should maintain state through changes', () => {
      const trait = new ReadableTrait({
        text: 'Original text',
        hasBeenRead: false,
        currentPage: 1
      });
      
      trait.hasBeenRead = true;
      trait.currentPage = 2;
      
      expect(trait.text).toBe('Original text');
      expect(trait.hasBeenRead).toBe(true);
      expect(trait.currentPage).toBe(2);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Wooden Sign', EntityType.SCENERY);
      const trait = new ReadableTrait({
        text: 'Welcome to the Inn'
      });
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.READABLE)).toBe(true);
      expect(entity.getTrait(TraitType.READABLE)).toBe(trait);
    });

    it('should create various readable entities', () => {
      const book = world.createEntity('Ancient Tome', EntityType.ITEM);
      book.add(new ReadableTrait({
        readableType: 'book',
        text: 'The secrets of the ancients...',
        language: 'ancient'
      }));
      
      const sign = world.createEntity('Warning Sign', EntityType.SCENERY);
      sign.add(new ReadableTrait({
        readableType: 'sign',
        text: 'DANGER: Do not feed the dragon!'
      }));
      
      const letter = world.createEntity('Sealed Letter', EntityType.ITEM);
      letter.add(new ReadableTrait({
        readableType: 'note',
        text: 'Meet me at midnight by the old oak tree.',
        preview: 'A sealed letter with your name on it'
      }));
      
      expect(book.hasTrait(TraitType.READABLE)).toBe(true);
      expect(sign.hasTrait(TraitType.READABLE)).toBe(true);
      expect(letter.hasTrait(TraitType.READABLE)).toBe(true);
    });

    it('should work with openable books', () => {
      const book = world.createEntity('Spellbook', EntityType.CONTAINER);
      
      book.add(new OpenableTrait({
        isOpen: false,
        openMessage: 'You open the spellbook.'
      }));
      
      book.add(new ReadableTrait({
        readableType: 'book',
        pageContent: [
          'Spell of Light: Lumos!',
          'Spell of Fire: Ignis!',
          'Spell of Ice: Glacius!'
        ],
        isReadable: false // Can't read when closed
      }));
      
      const openable = book.getTrait(TraitType.OPENABLE) as OpenableTrait;
      const readable = book.getTrait(TraitType.READABLE) as ReadableTrait;
      
      expect(openable.isOpen).toBe(false);
      expect(readable.isReadable).toBe(false);
      
      // Simulate opening
      openable.isOpen = true;
      readable.isReadable = true;
      
      expect(readable.pages).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new ReadableTrait({});
      
      expect(trait.text).toBe('');
      expect(trait.isReadable).toBe(true);
      expect(trait.language).toBe('common');
      expect(trait.readableType).toBe('text');
    });

    it('should handle undefined options', () => {
      const trait = new ReadableTrait(undefined);
      
      expect(trait.text).toBe('');
      expect(trait.isReadable).toBe(true);
      expect(trait.hasBeenRead).toBe(false);
    });

    it('should maintain type constant', () => {
      expect(ReadableTrait.type).toBe(TraitType.READABLE);
      
      const trait = new ReadableTrait();
      expect(trait.type).toBe(TraitType.READABLE);
      expect(trait.type).toBe(ReadableTrait.type);
    });

    it('should handle page bounds', () => {
      const trait = new ReadableTrait({
        pageContent: ['Page 1', 'Page 2'],
        currentPage: 5 // Out of bounds
      });
      
      expect(trait.currentPage).toBe(5); // No validation in trait
      // pages is not set when currentPage is already provided
      expect(trait.pages).toBeUndefined();
    });

    it('should preserve data integrity', () => {
      const pageData = ['Page 1', 'Page 2'];
      const trait = new ReadableTrait({
        pageContent: pageData
      });
      
      // Modify original array
      pageData.push('Page 3');
      
      // Trait should have reference (not a copy)
      expect(trait.pageContent).toHaveLength(3);
      expect(trait.pageContent![2]).toBe('Page 3');
    });

    it('should handle special text content', () => {
      const trait = new ReadableTrait({
        text: '🎭 Unicode symbols: →←↑↓\n<html>tags</html>\n"Quotes" and \'apostrophes\''
      });
      
      expect(trait.text).toContain('🎭');
      expect(trait.text).toContain('<html>');
      expect(trait.text).toContain('"Quotes"');
    });
  });

  describe('complex scenarios', () => {
    it('should handle magical tome with requirements', () => {
      const tome = new ReadableTrait({
        readableType: 'book',
        text: 'The spell of ultimate power...',
        language: 'arcane',
        requiresAbility: true,
        requiredAbility: 'arcane_knowledge',
        cannotReadMessage: 'The arcane symbols shift and blur before your untrained eyes.',
        pageContent: [
          'Chapter 1: Understanding the Weave',
          'Chapter 2: Channeling Raw Magic',
          'Chapter 3: The Forbidden Spell'
        ]
      });
      
      expect(tome.requiresAbility).toBe(true);
      expect(tome.language).toBe('arcane');
      expect(tome.pages).toBe(3);
    });

    it('should handle inscribed objects', () => {
      const sword = world.createEntity('Ancient Sword', EntityType.ITEM);
      
      sword.add(new ReadableTrait({
        readableType: 'inscription',
        text: 'Forged in dragon fire for King Aldric',
        preview: 'Runes are inscribed on the blade',
        language: 'dwarvish'
      }));
      
      const readable = sword.getTrait(TraitType.READABLE) as ReadableTrait;
      expect(readable.readableType).toBe('inscription');
      expect(readable.language).toBe('dwarvish');
    });

    it('should handle dynamic readability', () => {
      const note = new ReadableTrait({
        text: 'Secret message written in invisible ink',
        isReadable: false,
        requiresAbility: true,
        requiredAbility: 'reveal_spell',
        cannotReadMessage: 'The parchment appears blank.'
      });
      
      expect(note.isReadable).toBe(false);
      
      // After using reveal spell
      note.isReadable = true;
      note.hasBeenRead = true;
      
      expect(note.isReadable).toBe(true);
      expect(note.text).toBe('Secret message written in invisible ink');
    });
  });
});