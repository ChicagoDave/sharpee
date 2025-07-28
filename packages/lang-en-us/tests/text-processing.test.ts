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

  describe('lemmatize()', () => {
    describe('regular plurals', () => {
      it('should remove simple -s endings', () => {
        expect(provider.lemmatize('cats')).toBe('cat');
        expect(provider.lemmatize('dogs')).toBe('dog');
        expect(provider.lemmatize('books')).toBe('book');
      });

      it('should not remove -s from words ending in -ss', () => {
        expect(provider.lemmatize('glass')).toBe('glass');
        expect(provider.lemmatize('class')).toBe('class');
        expect(provider.lemmatize('brass')).toBe('brass');
      });

      it('should handle short words correctly', () => {
        expect(provider.lemmatize('is')).toBe('is');
        expect(provider.lemmatize('as')).toBe('as');
      });
    });

    describe('-es endings', () => {
      it('should remove -es endings', () => {
        expect(provider.lemmatize('boxes')).toBe('box');
        expect(provider.lemmatize('watches')).toBe('watch');
        expect(provider.lemmatize('dishes')).toBe('dish');
      });

      it('should handle short words with -es', () => {
        expect(provider.lemmatize('yes')).toBe('yes');
      });
    });

    describe('-ies endings', () => {
      it('should convert -ies to -y', () => {
        expect(provider.lemmatize('stories')).toBe('story');
        expect(provider.lemmatize('cities')).toBe('city');
        expect(provider.lemmatize('puppies')).toBe('puppy');
      });

      it('should not convert short words', () => {
        expect(provider.lemmatize('ties')).toBe('ties');
      });
    });

    describe('-ed endings', () => {
      it('should remove -ed endings', () => {
        expect(provider.lemmatize('walked')).toBe('walk');
        expect(provider.lemmatize('played')).toBe('play');
        expect(provider.lemmatize('looked')).toBe('look');
      });

      it('should handle short words correctly', () => {
        expect(provider.lemmatize('red')).toBe('red');
        expect(provider.lemmatize('led')).toBe('led');
      });
    });

    describe('-ing endings', () => {
      it('should remove -ing endings', () => {
        expect(provider.lemmatize('walking')).toBe('walk');
        expect(provider.lemmatize('playing')).toBe('play');
        expect(provider.lemmatize('looking')).toBe('look');
      });

      it('should handle short words correctly', () => {
        expect(provider.lemmatize('ring')).toBe('ring');
        expect(provider.lemmatize('king')).toBe('king');
      });
    });

    describe('irregular plurals', () => {
      it('should handle common irregular plurals', () => {
        expect(provider.lemmatize('children')).toBe('child');
        expect(provider.lemmatize('people')).toBe('person');
        expect(provider.lemmatize('men')).toBe('man');
        expect(provider.lemmatize('women')).toBe('woman');
        expect(provider.lemmatize('mice')).toBe('mouse');
        expect(provider.lemmatize('feet')).toBe('foot');
      });
    });

    describe('case handling', () => {
      it('should handle uppercase words', () => {
        expect(provider.lemmatize('CATS')).toBe('cat');
        expect(provider.lemmatize('CHILDREN')).toBe('child');
      });

      it('should handle mixed case', () => {
        expect(provider.lemmatize('CaTs')).toBe('cat');
        expect(provider.lemmatize('WaLkInG')).toBe('walk');
      });
    });

    describe('unchanged words', () => {
      it('should not change words that are already lemmatized', () => {
        expect(provider.lemmatize('cat')).toBe('cat');
        expect(provider.lemmatize('walk')).toBe('walk');
        expect(provider.lemmatize('mouse')).toBe('mouse');
      });
    });
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

  describe('expandAbbreviation()', () => {
    describe('direction abbreviations', () => {
      it('should expand cardinal directions', () => {
        expect(provider.expandAbbreviation('n')).toBe('north');
        expect(provider.expandAbbreviation('s')).toBe('south');
        expect(provider.expandAbbreviation('e')).toBe('east');
        expect(provider.expandAbbreviation('w')).toBe('west');
      });

      it('should expand ordinal directions', () => {
        expect(provider.expandAbbreviation('ne')).toBe('northeast');
        expect(provider.expandAbbreviation('nw')).toBe('northwest');
        expect(provider.expandAbbreviation('se')).toBe('southeast');
        expect(provider.expandAbbreviation('sw')).toBe('southwest');
      });

      it('should expand vertical directions', () => {
        expect(provider.expandAbbreviation('u')).toBe('up');
        expect(provider.expandAbbreviation('d')).toBe('down');
      });
    });

    describe('command abbreviations', () => {
      it('should expand common command abbreviations', () => {
        expect(provider.expandAbbreviation('l')).toBe('look');
        expect(provider.expandAbbreviation('x')).toBe('examine');
        expect(provider.expandAbbreviation('i')).toBe('inventory');
        expect(provider.expandAbbreviation('z')).toBe('wait');
        expect(provider.expandAbbreviation('q')).toBe('quit');
        expect(provider.expandAbbreviation('g')).toBe('again');
      });
    });

    describe('unknown abbreviations', () => {
      it('should return null for unknown abbreviations', () => {
        expect(provider.expandAbbreviation('xyz')).toBeNull();
        expect(provider.expandAbbreviation('abc')).toBeNull();
        expect(provider.expandAbbreviation('')).toBeNull();
      });
    });

    describe('case handling', () => {
      it('should be case insensitive', () => {
        expect(provider.expandAbbreviation('N')).toBe('north');
        expect(provider.expandAbbreviation('NE')).toBe('northeast');
        expect(provider.expandAbbreviation('L')).toBe('look');
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
