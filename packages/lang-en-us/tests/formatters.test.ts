/**
 * Formatter System Tests
 *
 * Tests for the formatter system (ADR-095)
 */

import { describe, it, expect } from 'vitest';
import {
  createFormatterRegistry,
  parsePlaceholder,
  applyFormatters,
  formatMessage,
  aFormatter,
  theFormatter,
  someFormatter,
  listFormatter,
  orListFormatter,
  capFormatter,
  upperFormatter,
  EntityInfo,
  FormatterContext,
} from '../src/formatters';
import { eventMessageFunctions } from '../src/data/events';

describe('Formatter System', () => {
  describe('parsePlaceholder', () => {
    it('should parse simple placeholder', () => {
      const result = parsePlaceholder('item');
      expect(result).toEqual({ formatters: [], name: 'item' });
    });

    it('should parse placeholder with one formatter', () => {
      const result = parsePlaceholder('a:item');
      expect(result).toEqual({ formatters: ['a'], name: 'item' });
    });

    it('should parse placeholder with multiple formatters', () => {
      const result = parsePlaceholder('a:items:list');
      expect(result).toEqual({ formatters: ['a', 'items'], name: 'list' });
    });

    it('should parse chained formatters', () => {
      const result = parsePlaceholder('cap:the:item');
      expect(result).toEqual({ formatters: ['cap', 'the'], name: 'item' });
    });
  });

  describe('Article Formatters', () => {
    const context: FormatterContext = {};

    describe('aFormatter', () => {
      it('should add "a" before consonant', () => {
        expect(aFormatter('sword', context)).toBe('a sword');
        expect(aFormatter('key', context)).toBe('a key');
      });

      it('should add "an" before vowel', () => {
        expect(aFormatter('apple', context)).toBe('an apple');
        expect(aFormatter('egg', context)).toBe('an egg');
      });

      it('should handle special cases', () => {
        expect(aFormatter('hour', context)).toBe('an hour');
        expect(aFormatter('university', context)).toBe('a university');
      });

      it('should handle proper nouns (no article)', () => {
        const john: EntityInfo = { name: 'John', nounType: 'proper' };
        expect(aFormatter(john, context)).toBe('John');
      });

      it('should handle mass nouns (some)', () => {
        const water: EntityInfo = { name: 'water', nounType: 'mass' };
        expect(aFormatter(water, context)).toBe('some water');
      });

      it('should handle unique nouns (the)', () => {
        const sun: EntityInfo = { name: 'sun', nounType: 'unique' };
        expect(aFormatter(sun, context)).toBe('the sun');
      });

      it('should handle plural nouns (no article)', () => {
        const scissors: EntityInfo = { name: 'scissors', nounType: 'plural' };
        expect(aFormatter(scissors, context)).toBe('scissors');
      });
    });

    describe('theFormatter', () => {
      it('should add "the" to common nouns', () => {
        expect(theFormatter('sword', context)).toBe('the sword');
      });

      it('should not add article to proper nouns', () => {
        const john: EntityInfo = { name: 'John', nounType: 'proper' };
        expect(theFormatter(john, context)).toBe('John');
      });
    });

    describe('someFormatter', () => {
      it('should add "some" to nouns', () => {
        expect(someFormatter('water', context)).toBe('some water');
        expect(someFormatter('coins', context)).toBe('some coins');
      });
    });
  });

  describe('List Formatters', () => {
    const context: FormatterContext = {};

    describe('listFormatter', () => {
      it('should return empty string for empty array', () => {
        expect(listFormatter([], context)).toBe('');
      });

      it('should return single item unchanged', () => {
        expect(listFormatter(['sword'], context)).toBe('sword');
      });

      it('should join two items with "and"', () => {
        expect(listFormatter(['sword', 'key'], context)).toBe('sword and key');
      });

      it('should join three items with commas and "and"', () => {
        expect(listFormatter(['sword', 'key', 'coin'], context)).toBe(
          'sword, key, and coin'
        );
      });

      it('should join four items with commas and "and"', () => {
        expect(listFormatter(['sword', 'key', 'coin', 'apple'], context)).toBe(
          'sword, key, coin, and apple'
        );
      });
    });

    describe('orListFormatter', () => {
      it('should join two items with "or"', () => {
        expect(orListFormatter(['north', 'south'], context)).toBe('north or south');
      });

      it('should join three items with commas and "or"', () => {
        expect(orListFormatter(['north', 'south', 'east'], context)).toBe(
          'north, south, or east'
        );
      });
    });
  });

  describe('Text Formatters', () => {
    const context: FormatterContext = {};

    describe('capFormatter', () => {
      it('should capitalize first letter', () => {
        expect(capFormatter('sword', context)).toBe('Sword');
        expect(capFormatter('brass lantern', context)).toBe('Brass lantern');
      });
    });

    describe('upperFormatter', () => {
      it('should convert to uppercase', () => {
        expect(upperFormatter('sword', context)).toBe('SWORD');
      });
    });
  });

  describe('formatMessage', () => {
    const registry = createFormatterRegistry();
    const context: FormatterContext = {};

    it('should substitute simple placeholders', () => {
      const result = formatMessage(
        'You take {item}.',
        { item: 'sword' },
        registry,
        context
      );
      expect(result).toBe('You take sword.');
    });

    it('should apply single formatter', () => {
      const result = formatMessage(
        'You take {a:item}.',
        { item: 'sword' },
        registry,
        context
      );
      expect(result).toBe('You take a sword.');
    });

    it('should apply article formatter with vowel', () => {
      const result = formatMessage(
        'You take {a:item}.',
        { item: 'apple' },
        registry,
        context
      );
      expect(result).toBe('You take an apple.');
    });

    it('should apply list formatter', () => {
      // Syntax is {formatter:placeholder}, so {list:items}
      const result = formatMessage(
        'You see {list:items}.',
        { items: ['sword', 'key', 'coin'] },
        registry,
        context
      );
      expect(result).toBe('You see sword, key, and coin.');
    });

    it('should apply "the" formatter', () => {
      const result = formatMessage(
        'You open {the:container}.',
        { container: 'chest' },
        registry,
        context
      );
      expect(result).toBe('You open the chest.');
    });

    it('should handle multiple placeholders', () => {
      const result = formatMessage(
        '{You} put {the:item} in {the:container}.',
        { item: 'sword', container: 'chest' },
        registry,
        context
      );
      // {You} is not in params, so it stays as is
      expect(result).toBe('{You} put the sword in the chest.');
    });

    it('should handle cap formatter', () => {
      const result = formatMessage(
        '{cap:item} is here.',
        { item: 'brass lantern' },
        registry,
        context
      );
      expect(result).toBe('Brass lantern is here.');
    });

    it('should leave unknown placeholders unchanged', () => {
      const result = formatMessage(
        '{You} take {item}.',
        { item: 'sword' },
        registry,
        context
      );
      expect(result).toBe('{You} take sword.');
    });
  });

  describe('applyFormatters', () => {
    const registry = createFormatterRegistry();
    const context: FormatterContext = {};

    it('should apply formatters in sequence', () => {
      // This applies 'the' to 'sword', then 'cap' to 'the sword'
      const result = applyFormatters('sword', ['the', 'cap'], registry, context);
      expect(result).toBe('The sword');
    });

    it('should handle unknown formatters gracefully', () => {
      const result = applyFormatters('sword', ['unknown', 'the'], registry, context);
      // 'unknown' is skipped, 'the' is applied
      expect(result).toBe('the sword');
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

      it('should not mutate the input items array', () => {
        const items = ['lamp', 'chair', 'table'];
        eventMessageFunctions.formatRoomDescription('A room.', items);
        expect(items).toEqual(['lamp', 'chair', 'table']);
        const result2 = eventMessageFunctions.formatRoomDescription('A room.', items);
        expect(result2).toBe('A room.\n\nYou can see lamp, chair and table here.');
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
