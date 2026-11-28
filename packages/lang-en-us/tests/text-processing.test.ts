/**
 * @file text-processing.test.ts
 * @description Tests for text manipulation and formatting functions
 */

import { EnglishLanguageProvider } from '../src/language-provider';

describe('Text Processing', () => {
  let provider: EnglishLanguageProvider;

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
  });

  describe('pluralize()', () => {
    describe('regular plurals', () => {
      it('should add -s to regular nouns', () => {
        expect(provider.pluralize('cat')).toBe('cats');
        expect(provider.pluralize('dog')).toBe('dogs');
        expect(provider.pluralize('book')).toBe('books');
      });
    });

    describe('sibilant endings', () => {
      it('should add -es to words ending in s, x, z', () => {
        expect(provider.pluralize('glass')).toBe('glasses');
        expect(provider.pluralize('box')).toBe('boxes');
        expect(provider.pluralize('buzz')).toBe('buzzes');
      });

      it('should add -es to words ending in ch, sh', () => {
        expect(provider.pluralize('watch')).toBe('watches');
        expect(provider.pluralize('dish')).toBe('dishes');
        expect(provider.pluralize('church')).toBe('churches');
      });
    });

    describe('consonant + y', () => {
      it('should change y to ies after consonant', () => {
        expect(provider.pluralize('story')).toBe('stories');
        expect(provider.pluralize('city')).toBe('cities');
        expect(provider.pluralize('puppy')).toBe('puppies');
      });

      it('should add -s after vowel + y', () => {
        expect(provider.pluralize('key')).toBe('keys');
        expect(provider.pluralize('boy')).toBe('boys');
        expect(provider.pluralize('toy')).toBe('toys');
      });
    });

    describe('f and fe endings', () => {
      it('should change -f to -ves', () => {
        expect(provider.pluralize('leaf')).toBe('leaves');
        expect(provider.pluralize('wolf')).toBe('wolves');
        expect(provider.pluralize('shelf')).toBe('shelves');
      });

      it('should change -fe to -ves', () => {
        expect(provider.pluralize('knife')).toBe('knives');
        expect(provider.pluralize('wife')).toBe('wives');
        expect(provider.pluralize('life')).toBe('lives');
      });
    });

    describe('irregular plurals', () => {
      it('should handle common irregular plurals', () => {
        expect(provider.pluralize('child')).toBe('children');
        expect(provider.pluralize('person')).toBe('people');
        expect(provider.pluralize('man')).toBe('men');
        expect(provider.pluralize('woman')).toBe('women');
        expect(provider.pluralize('mouse')).toBe('mice');
        expect(provider.pluralize('foot')).toBe('feet');
      });
    });

    describe('case preservation', () => {
      it('should preserve case of original word', () => {
        expect(provider.pluralize('Cat')).toBe('Cats');
        expect(provider.pluralize('STORY')).toBe('STORIES');
      });
    });
  });

  describe('getIndefiniteArticle()', () => {
    describe('consonant sounds', () => {
      it('should return "a" for words starting with consonants', () => {
        expect(provider.getIndefiniteArticle('dog')).toBe('a');
        expect(provider.getIndefiniteArticle('cat')).toBe('a');
        expect(provider.getIndefiniteArticle('book')).toBe('a');
        expect(provider.getIndefiniteArticle('table')).toBe('a');
      });
    });

    describe('vowel sounds', () => {
      it('should return "an" for words starting with vowels', () => {
        expect(provider.getIndefiniteArticle('apple')).toBe('an');
        expect(provider.getIndefiniteArticle('elephant')).toBe('an');
        expect(provider.getIndefiniteArticle('igloo')).toBe('an');
        expect(provider.getIndefiniteArticle('orange')).toBe('an');
        expect(provider.getIndefiniteArticle('umbrella')).toBe('an');
      });
    });

    describe('special cases', () => {
      it('should handle silent h words', () => {
        expect(provider.getIndefiniteArticle('hour')).toBe('an');
        expect(provider.getIndefiniteArticle('honest')).toBe('an');
      });

      it('should handle u words with y sound', () => {
        expect(provider.getIndefiniteArticle('university')).toBe('a');
        expect(provider.getIndefiniteArticle('unicorn')).toBe('a');
      });

      it('should handle words starting with "one"', () => {
        expect(provider.getIndefiniteArticle('one')).toBe('a');
        expect(provider.getIndefiniteArticle('oneself')).toBe('a');
      });
    });

    describe('case insensitivity', () => {
      it('should handle uppercase words', () => {
        expect(provider.getIndefiniteArticle('APPLE')).toBe('an');
        expect(provider.getIndefiniteArticle('DOG')).toBe('a');
        expect(provider.getIndefiniteArticle('HOUR')).toBe('an');
      });
    });
  });

  describe('formatList()', () => {
    describe('empty and single item lists', () => {
      it('should return empty string for empty list', () => {
        expect(provider.formatList([])).toBe('');
      });

      it('should return single item unchanged', () => {
        expect(provider.formatList(['apple'])).toBe('apple');
      });
    });

    describe('two item lists', () => {
      it('should use "and" by default', () => {
        expect(provider.formatList(['apple', 'banana'])).toBe('apple and banana');
      });

      it('should use "or" when specified', () => {
        expect(provider.formatList(['apple', 'banana'], 'or')).toBe('apple or banana');
      });
    });

    describe('multiple item lists', () => {
      it('should use Oxford comma with "and"', () => {
        expect(provider.formatList(['apple', 'banana', 'orange'])).toBe('apple, banana, and orange');
      });

      it('should use Oxford comma with "or"', () => {
        expect(provider.formatList(['apple', 'banana', 'orange'], 'or')).toBe('apple, banana, or orange');
      });

      it('should handle longer lists', () => {
        const items = ['apple', 'banana', 'orange', 'grape', 'mango'];
        expect(provider.formatList(items)).toBe('apple, banana, orange, grape, and mango');
      });
    });

    describe('edge cases', () => {
      it('should handle items with special characters', () => {
        expect(provider.formatList(['item-1', 'item_2', 'item.3'])).toBe('item-1, item_2, and item.3');
      });

      it('should preserve item casing', () => {
        expect(provider.formatList(['Apple', 'BANANA', 'oRaNgE'])).toBe('Apple, BANANA, and oRaNgE');
      });
    });
  });

  describe('isIgnoreWord()', () => {
    it('should identify common ignore words', () => {
      expect(provider.isIgnoreWord('please')).toBe(true);
      expect(provider.isIgnoreWord('kindly')).toBe(true);
      expect(provider.isIgnoreWord('just')).toBe(true);
      expect(provider.isIgnoreWord('simply')).toBe(true);
      expect(provider.isIgnoreWord('really')).toBe(true);
      expect(provider.isIgnoreWord('very')).toBe(true);
      expect(provider.isIgnoreWord('quite')).toBe(true);
      expect(provider.isIgnoreWord('rather')).toBe(true);
    });

    it('should not identify non-ignore words', () => {
      expect(provider.isIgnoreWord('take')).toBe(false);
      expect(provider.isIgnoreWord('ball')).toBe(false);
      expect(provider.isIgnoreWord('north')).toBe(false);
      expect(provider.isIgnoreWord('examine')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(provider.isIgnoreWord('PLEASE')).toBe(true);
      expect(provider.isIgnoreWord('Just')).toBe(true);
      expect(provider.isIgnoreWord('VeRy')).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(provider.isIgnoreWord('')).toBe(false);
    });
  });
});
