/**
 * @file coverage-improvements.test.ts
 * @description Additional tests to improve code coverage
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import { eventMessageFunctions } from '../src/data/events';

describe('Coverage Improvements', () => {
  let provider: EnglishLanguageProvider;

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
  });

  describe('Pluralization - Case Preservation', () => {
    it('should preserve all uppercase for irregular plurals', () => {
      expect(provider.pluralize('CHILD')).toBe('CHILDREN');
      expect(provider.pluralize('MOUSE')).toBe('MICE');
      expect(provider.pluralize('FOOT')).toBe('FEET');
    });

    it('should preserve title case for irregular plurals', () => {
      expect(provider.pluralize('Child')).toBe('Children');
      expect(provider.pluralize('Mouse')).toBe('Mice');
      expect(provider.pluralize('Foot')).toBe('Feet');
    });

    it('should handle uppercase -y to -ies conversion', () => {
      expect(provider.pluralize('STORY')).toBe('STORIES');
      expect(provider.pluralize('CITY')).toBe('CITIES');
    });

    it('should handle -f to -ves conversion', () => {
      expect(provider.pluralize('leaf')).toBe('leaves');
      expect(provider.pluralize('wolf')).toBe('wolves');
      expect(provider.pluralize('half')).toBe('halves');
      expect(provider.pluralize('calf')).toBe('calves');
    });
  });

  describe('Event Message Functions', () => {
    describe('formatInventory', () => {
      it('should return empty inventory message', () => {
        const result = eventMessageFunctions.formatInventory([], []);
        expect(result).toBe('You are carrying nothing.');
      });

      it('should format inventory without worn items', () => {
        const result = eventMessageFunctions.formatInventory(['lamp', 'key', 'book'], []);
        expect(result).toBe('You are carrying:\n  lamp\n  key\n  book');
      });

      it('should format inventory with worn items', () => {
        const result = eventMessageFunctions.formatInventory(
          ['lamp', 'hat', 'gloves', 'book'], 
          ['hat', 'gloves']
        );
        expect(result).toBe('You are carrying:\n  lamp\n  hat (being worn)\n  gloves (being worn)\n  book');
      });

      it('should handle single item', () => {
        const result = eventMessageFunctions.formatInventory(['key'], []);
        expect(result).toBe('You are carrying:\n  key');
      });

      it('should handle single worn item', () => {
        const result = eventMessageFunctions.formatInventory(['hat'], ['hat']);
        expect(result).toBe('You are carrying:\n  hat (being worn)');
      });
    });

    describe('formatRoomDescription', () => {
      it('should return description without items', () => {
        const result = eventMessageFunctions.formatRoomDescription(
          'A cozy room with a fireplace.',
          []
        );
        expect(result).toBe('A cozy room with a fireplace.');
      });

      it('should add single item to description', () => {
        const result = eventMessageFunctions.formatRoomDescription(
          'A cozy room with a fireplace.',
          ['lamp']
        );
        expect(result).toBe('A cozy room with a fireplace.\n\nYou can see lamp here.');
      });

      it('should add multiple items to description', () => {
        const result = eventMessageFunctions.formatRoomDescription(
          'A cozy room with a fireplace.',
          ['lamp', 'chair', 'table']
        );
        expect(result).toBe('A cozy room with a fireplace.\n\nYou can see lamp, chair and table here.');
      });

      it('should handle two items', () => {
        const result = eventMessageFunctions.formatRoomDescription(
          'A small closet.',
          ['broom', 'bucket']
        );
        expect(result).toBe('A small closet.\n\nYou can see broom and bucket here.');
      });
    });

    describe('formatContainerContents', () => {
      it('should return empty container message', () => {
        const result = eventMessageFunctions.formatContainerContents('box', []);
        expect(result).toBe('The box is empty.');
      });

      it('should format single item in container', () => {
        const result = eventMessageFunctions.formatContainerContents('box', ['key']);
        expect(result).toBe('The box contains:\n  key');
      });

      it('should format multiple items in container', () => {
        const result = eventMessageFunctions.formatContainerContents(
          'chest',
          ['gold coin', 'silver coin', 'ruby']
        );
        expect(result).toBe('The chest contains:\n  gold coin\n  silver coin\n  ruby');
      });

      it('should work with different container names', () => {
        const result = eventMessageFunctions.formatContainerContents('drawer', ['pencil', 'paper']);
        expect(result).toBe('The drawer contains:\n  pencil\n  paper');
      });
    });
  });
});
