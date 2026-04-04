/**
 * Tests for direction vocabulary integration with the parser (ADR-143)
 *
 * Verifies that setActiveVocabulary rebuilds parser maps correctly,
 * parseDirection resolves vocabulary words, getDirectionWord returns
 * vocabulary display names, and getGrammarDirectionMap produces
 * correct grammar structure.
 */

import { Direction, DirectionType, NavalVocabulary, MinimalVocabulary, CompassVocabulary } from '@sharpee/world-model';
import {
  parseDirection,
  getDirectionWord,
  setActiveVocabulary,
  getGrammarDirectionMap,
} from '../src/direction-mappings';

describe('Direction vocabulary parser integration', () => {
  // Reset to compass after each test to avoid cross-contamination
  afterEach(() => {
    setActiveVocabulary(CompassVocabulary);
  });

  describe('default compass vocabulary', () => {
    it('should parse compass words', () => {
      expect(parseDirection('north')).toBe(Direction.NORTH);
      expect(parseDirection('south')).toBe(Direction.SOUTH);
      expect(parseDirection('east')).toBe(Direction.EAST);
      expect(parseDirection('west')).toBe(Direction.WEST);
      expect(parseDirection('up')).toBe(Direction.UP);
      expect(parseDirection('down')).toBe(Direction.DOWN);
      expect(parseDirection('in')).toBe(Direction.IN);
      expect(parseDirection('out')).toBe(Direction.OUT);
    });

    it('should parse compass abbreviations', () => {
      expect(parseDirection('n')).toBe(Direction.NORTH);
      expect(parseDirection('s')).toBe(Direction.SOUTH);
      expect(parseDirection('e')).toBe(Direction.EAST);
      expect(parseDirection('w')).toBe(Direction.WEST);
      expect(parseDirection('ne')).toBe(Direction.NORTHEAST);
      expect(parseDirection('u')).toBe(Direction.UP);
      expect(parseDirection('d')).toBe(Direction.DOWN);
    });

    it('should return compass display names', () => {
      expect(getDirectionWord(Direction.NORTH)).toBe('north');
      expect(getDirectionWord(Direction.SOUTH)).toBe('south');
      expect(getDirectionWord(Direction.UP)).toBe('up');
    });

    it('should not parse naval words', () => {
      expect(parseDirection('fore')).toBeNull();
      expect(parseDirection('aft')).toBeNull();
      expect(parseDirection('port')).toBeNull();
      expect(parseDirection('starboard')).toBeNull();
    });
  });

  describe('naval vocabulary', () => {
    beforeEach(() => {
      setActiveVocabulary(NavalVocabulary);
    });

    it('should parse naval words', () => {
      expect(parseDirection('fore')).toBe(Direction.NORTH);
      expect(parseDirection('aft')).toBe(Direction.SOUTH);
      expect(parseDirection('starboard')).toBe(Direction.EAST);
      expect(parseDirection('port')).toBe(Direction.WEST);
      expect(parseDirection('topside')).toBe(Direction.UP);
      expect(parseDirection('below')).toBe(Direction.DOWN);
    });

    it('should parse naval abbreviations', () => {
      expect(parseDirection('f')).toBe(Direction.NORTH);
      expect(parseDirection('a')).toBe(Direction.SOUTH);
      expect(parseDirection('sb')).toBe(Direction.EAST);
      expect(parseDirection('p')).toBe(Direction.WEST);
      expect(parseDirection('ts')).toBe(Direction.UP);
      expect(parseDirection('bd')).toBe(Direction.DOWN);
    });

    it('should parse naval synonyms', () => {
      expect(parseDirection('forward')).toBe(Direction.NORTH);
      expect(parseDirection('bow')).toBe(Direction.NORTH);
      expect(parseDirection('back')).toBe(Direction.SOUTH);
      expect(parseDirection('stern')).toBe(Direction.SOUTH);
      expect(parseDirection('left')).toBe(Direction.WEST);
      expect(parseDirection('right')).toBe(Direction.EAST);
    });

    it('should return naval display names', () => {
      expect(getDirectionWord(Direction.NORTH)).toBe('fore');
      expect(getDirectionWord(Direction.SOUTH)).toBe('aft');
      expect(getDirectionWord(Direction.EAST)).toBe('starboard');
      expect(getDirectionWord(Direction.WEST)).toBe('port');
      expect(getDirectionWord(Direction.UP)).toBe('topside');
      expect(getDirectionWord(Direction.DOWN)).toBe('below decks');
    });

    it('should no longer parse compass words', () => {
      expect(parseDirection('north')).toBeNull();
      expect(parseDirection('south')).toBeNull();
      expect(parseDirection('east')).toBeNull();
      expect(parseDirection('west')).toBeNull();
    });

    it('should not have diagonal directions', () => {
      expect(parseDirection('northeast')).toBeNull();
      expect(parseDirection('ne')).toBeNull();
      expect(parseDirection('northwest')).toBeNull();
      expect(parseDirection('southwest')).toBeNull();
    });

    it('should still parse in/out', () => {
      expect(parseDirection('in')).toBe(Direction.IN);
      expect(parseDirection('out')).toBe(Direction.OUT);
    });
  });

  describe('minimal vocabulary', () => {
    beforeEach(() => {
      setActiveVocabulary(MinimalVocabulary);
    });

    it('should parse only vertical and threshold directions', () => {
      expect(parseDirection('up')).toBe(Direction.UP);
      expect(parseDirection('down')).toBe(Direction.DOWN);
      expect(parseDirection('in')).toBe(Direction.IN);
      expect(parseDirection('out')).toBe(Direction.OUT);
    });

    it('should parse minimal synonyms', () => {
      expect(parseDirection('climb')).toBe(Direction.UP);
      expect(parseDirection('descend')).toBe(Direction.DOWN);
      expect(parseDirection('deeper')).toBe(Direction.IN);
      expect(parseDirection('back')).toBe(Direction.OUT);
    });

    it('should reject all compass directions', () => {
      expect(parseDirection('north')).toBeNull();
      expect(parseDirection('south')).toBeNull();
      expect(parseDirection('n')).toBeNull();
      expect(parseDirection('s')).toBeNull();
    });

    it('should reject naval directions', () => {
      expect(parseDirection('fore')).toBeNull();
      expect(parseDirection('port')).toBeNull();
    });

    it('should return minimal display names', () => {
      expect(getDirectionWord(Direction.UP)).toBe('up');
      expect(getDirectionWord(Direction.DOWN)).toBe('down');
      expect(getDirectionWord(Direction.IN)).toBe('in');
      expect(getDirectionWord(Direction.OUT)).toBe('out');
    });
  });

  describe('switching vocabularies', () => {
    it('should switch from compass to naval and back', () => {
      expect(parseDirection('north')).toBe(Direction.NORTH);
      expect(parseDirection('fore')).toBeNull();

      setActiveVocabulary(NavalVocabulary);
      expect(parseDirection('north')).toBeNull();
      expect(parseDirection('fore')).toBe(Direction.NORTH);

      setActiveVocabulary(CompassVocabulary);
      expect(parseDirection('north')).toBe(Direction.NORTH);
      expect(parseDirection('fore')).toBeNull();
    });

    it('should update display names on switch', () => {
      expect(getDirectionWord(Direction.NORTH)).toBe('north');

      setActiveVocabulary(NavalVocabulary);
      expect(getDirectionWord(Direction.NORTH)).toBe('fore');

      setActiveVocabulary(CompassVocabulary);
      expect(getDirectionWord(Direction.NORTH)).toBe('north');
    });
  });

  describe('getGrammarDirectionMap', () => {
    it('should return compass grammar map by default', () => {
      const map = getGrammarDirectionMap();
      expect(map['north']).toContain('north');
      expect(map['north']).toContain('n');
      expect(map['south']).toContain('south');
      expect(map['south']).toContain('s');
      expect(map['up']).toContain('up');
      expect(map['up']).toContain('u');
    });

    it('should return naval grammar map after switching', () => {
      setActiveVocabulary(NavalVocabulary);
      const map = getGrammarDirectionMap();

      // Naval maps to same canonical keys (lowercase direction constants)
      expect(map['north']).toContain('fore');
      expect(map['north']).toContain('f');
      expect(map['north']).toContain('forward');
      expect(map['south']).toContain('aft');
      expect(map['east']).toContain('starboard');
      expect(map['west']).toContain('port');
    });

    it('should not include diagonals in naval grammar map', () => {
      setActiveVocabulary(NavalVocabulary);
      const map = getGrammarDirectionMap();
      expect(map['northeast']).toBeUndefined();
      expect(map['northwest']).toBeUndefined();
      expect(map['southeast']).toBeUndefined();
      expect(map['southwest']).toBeUndefined();
    });

    it('should only include 4 directions in minimal grammar map', () => {
      setActiveVocabulary(MinimalVocabulary);
      const map = getGrammarDirectionMap();
      expect(Object.keys(map)).toHaveLength(4);
      expect(map['up']).toBeDefined();
      expect(map['down']).toBeDefined();
      expect(map['in']).toBeDefined();
      expect(map['out']).toBeDefined();
    });
  });

  describe('case handling', () => {
    it('should handle uppercase input', () => {
      expect(parseDirection('NORTH')).toBe(Direction.NORTH);
      expect(parseDirection('N')).toBe(Direction.NORTH);
    });

    it('should handle mixed case input', () => {
      expect(parseDirection('North')).toBe(Direction.NORTH);
      expect(parseDirection('NorthEast')).toBe(Direction.NORTHEAST);
    });

    it('should handle whitespace', () => {
      expect(parseDirection('  north  ')).toBe(Direction.NORTH);
    });

    it('should return null for empty input', () => {
      expect(parseDirection('')).toBeNull();
      expect(parseDirection(null as any)).toBeNull();
      expect(parseDirection(undefined as any)).toBeNull();
    });
  });

  describe('fallback for unknown directions', () => {
    it('should fall back to lowercase constant for display', () => {
      setActiveVocabulary(MinimalVocabulary);
      // NORTH is not in minimal — should fall back
      expect(getDirectionWord(Direction.NORTH)).toBe('north');
    });
  });
});
