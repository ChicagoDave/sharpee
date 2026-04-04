/**
 * Tests for DirectionVocabularyRegistry (ADR-143)
 *
 * Verifies vocabulary registration, switching, rename/alias,
 * display name resolution, and change listener notification.
 */

import {
  Direction,
  DirectionType,
  DirectionVocabularyRegistry,
  DirectionVocabulary,
  CompassVocabulary,
  NavalVocabulary,
  MinimalVocabulary,
} from '../../src/constants/directions';

describe('DirectionVocabularyRegistry', () => {
  let registry: DirectionVocabularyRegistry;

  beforeEach(() => {
    registry = new DirectionVocabularyRegistry();
  });

  describe('initialization', () => {
    it('should default to compass vocabulary', () => {
      const active = registry.getActive();
      expect(active.id).toBe('compass');
    });

    it('should have compass, naval, and minimal built-in', () => {
      expect(registry.get('compass')).toBeDefined();
      expect(registry.get('naval')).toBeDefined();
      expect(registry.get('minimal')).toBeDefined();
    });

    it('should return undefined for unknown vocabulary', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('useVocabulary', () => {
    it('should switch to naval vocabulary', () => {
      registry.useVocabulary('naval');
      expect(registry.getActive().id).toBe('naval');
    });

    it('should switch to minimal vocabulary', () => {
      registry.useVocabulary('minimal');
      expect(registry.getActive().id).toBe('minimal');
    });

    it('should switch back to compass', () => {
      registry.useVocabulary('naval');
      registry.useVocabulary('compass');
      expect(registry.getActive().id).toBe('compass');
    });

    it('should throw for unknown vocabulary', () => {
      expect(() => registry.useVocabulary('nonexistent')).toThrow(
        /Unknown direction vocabulary.*nonexistent/
      );
    });
  });

  describe('getDisplayName', () => {
    it('should return compass display names by default', () => {
      expect(registry.getDisplayName(Direction.NORTH)).toBe('north');
      expect(registry.getDisplayName(Direction.SOUTH)).toBe('south');
      expect(registry.getDisplayName(Direction.UP)).toBe('up');
      expect(registry.getDisplayName(Direction.IN)).toBe('in');
    });

    it('should return naval display names after switching', () => {
      registry.useVocabulary('naval');
      expect(registry.getDisplayName(Direction.NORTH)).toBe('fore');
      expect(registry.getDisplayName(Direction.SOUTH)).toBe('aft');
      expect(registry.getDisplayName(Direction.EAST)).toBe('starboard');
      expect(registry.getDisplayName(Direction.WEST)).toBe('port');
      expect(registry.getDisplayName(Direction.UP)).toBe('topside');
      expect(registry.getDisplayName(Direction.DOWN)).toBe('below decks');
    });

    it('should return minimal display names', () => {
      registry.useVocabulary('minimal');
      expect(registry.getDisplayName(Direction.UP)).toBe('up');
      expect(registry.getDisplayName(Direction.DOWN)).toBe('down');
      expect(registry.getDisplayName(Direction.IN)).toBe('in');
      expect(registry.getDisplayName(Direction.OUT)).toBe('out');
    });

    it('should fall back to lowercase constant for directions not in vocabulary', () => {
      registry.useVocabulary('minimal');
      // NORTH is not in minimal vocabulary
      expect(registry.getDisplayName(Direction.NORTH)).toBe('north');
    });
  });

  describe('rename', () => {
    it('should rename a direction', () => {
      registry.rename(Direction.NORTH, { display: 'hubward', words: ['hubward', 'hub'] });
      expect(registry.getDisplayName(Direction.NORTH)).toBe('hubward');
    });

    it('should not mutate the original named vocabulary', () => {
      registry.rename(Direction.NORTH, { display: 'hubward', words: ['hubward'] });

      // Original compass vocabulary should be unchanged
      const compass = registry.get('compass')!;
      expect(compass.entries[Direction.NORTH]!.display).toBe('north');
    });

    it('should create a custom vocabulary on first rename', () => {
      registry.rename(Direction.NORTH, { display: 'fore', words: ['fore'] });
      expect(registry.getActive().id).toBe('custom');
    });

    it('should preserve other directions when renaming one', () => {
      registry.rename(Direction.NORTH, { display: 'hubward', words: ['hubward'] });
      expect(registry.getDisplayName(Direction.SOUTH)).toBe('south');
      expect(registry.getDisplayName(Direction.EAST)).toBe('east');
    });
  });

  describe('alias', () => {
    it('should add words without removing existing ones', () => {
      registry.alias(Direction.UP, { display: 'topside', words: ['topside', 'ts'] });

      const active = registry.getActive();
      const upEntry = active.entries[Direction.UP]!;
      // Should have original words plus new ones
      expect(upEntry.words).toContain('up');
      expect(upEntry.words).toContain('u');
      expect(upEntry.words).toContain('topside');
      expect(upEntry.words).toContain('ts');
    });

    it('should update display name', () => {
      registry.alias(Direction.UP, { display: 'topside', words: ['topside'] });
      expect(registry.getDisplayName(Direction.UP)).toBe('topside');
    });

    it('should not duplicate words', () => {
      registry.alias(Direction.UP, { display: 'up', words: ['up', 'topside'] });

      const active = registry.getActive();
      const upEntry = active.entries[Direction.UP]!;
      const upCount = upEntry.words.filter(w => w === 'up').length;
      expect(upCount).toBe(1);
    });
  });

  describe('define', () => {
    it('should register a custom vocabulary', () => {
      const custom: DirectionVocabulary = {
        id: 'discworld',
        entries: {
          [Direction.NORTH]: { display: 'hubward', words: ['hubward', 'hub'] },
          [Direction.SOUTH]: { display: 'rimward', words: ['rimward', 'rim'] },
        }
      };
      registry.define(custom);
      expect(registry.get('discworld')).toBeDefined();
    });

    it('should be activatable after registration', () => {
      registry.define({
        id: 'test',
        entries: {
          [Direction.NORTH]: { display: 'forward', words: ['forward'] },
        }
      });
      registry.useVocabulary('test');
      expect(registry.getDisplayName(Direction.NORTH)).toBe('forward');
    });
  });

  describe('change listeners', () => {
    it('should notify listener on useVocabulary', () => {
      const listener = vi.fn();
      registry.onVocabularyChange(listener);

      registry.useVocabulary('naval');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ id: 'naval' }));
    });

    it('should notify listener on rename', () => {
      const listener = vi.fn();
      registry.onVocabularyChange(listener);

      registry.rename(Direction.NORTH, { display: 'fore', words: ['fore'] });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should notify listener on alias', () => {
      const listener = vi.fn();
      registry.onVocabularyChange(listener);

      registry.alias(Direction.UP, { display: 'topside', words: ['topside'] });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should notify multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      registry.onVocabularyChange(listener1);
      registry.onVocabularyChange(listener2);

      registry.useVocabulary('naval');
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('pre-defined vocabularies', () => {
    it('compass should have all 12 directions', () => {
      const compass = registry.get('compass')!;
      expect(Object.keys(compass.entries)).toHaveLength(12);
    });

    it('naval should omit diagonals', () => {
      const naval = registry.get('naval')!;
      expect(naval.entries[Direction.NORTHEAST]).toBeUndefined();
      expect(naval.entries[Direction.NORTHWEST]).toBeUndefined();
      expect(naval.entries[Direction.SOUTHEAST]).toBeUndefined();
      expect(naval.entries[Direction.SOUTHWEST]).toBeUndefined();
    });

    it('minimal should have only 4 directions', () => {
      const minimal = registry.get('minimal')!;
      expect(Object.keys(minimal.entries)).toHaveLength(4);
      expect(minimal.entries[Direction.UP]).toBeDefined();
      expect(minimal.entries[Direction.DOWN]).toBeDefined();
      expect(minimal.entries[Direction.IN]).toBeDefined();
      expect(minimal.entries[Direction.OUT]).toBeDefined();
    });

    it('naval fore/aft should map to north/south', () => {
      const naval = registry.get('naval')!;
      expect(naval.entries[Direction.NORTH]!.display).toBe('fore');
      expect(naval.entries[Direction.SOUTH]!.display).toBe('aft');
      expect(naval.entries[Direction.EAST]!.display).toBe('starboard');
      expect(naval.entries[Direction.WEST]!.display).toBe('port');
    });
  });
});
