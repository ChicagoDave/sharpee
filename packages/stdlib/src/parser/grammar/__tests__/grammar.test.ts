/**
 * Tests for the grammar system
 */

import { 
  GrammarRegistry, 
  createPattern, 
  PatternCategory,
  ScopeHintType,
  createStandardGrammar,
  StandardActions
} from '../index';

describe('GrammarRegistry', () => {
  let registry: GrammarRegistry;

  beforeEach(() => {
    registry = new GrammarRegistry();
  });

  describe('pattern management', () => {
    it('should add and retrieve patterns', () => {
      const pattern = createPattern('take <noun>', 'taking');
      registry.addPattern(pattern);
      
      const found = registry.findPatterns('take');
      expect(found).toHaveLength(1);
      expect(found[0].action).toBe('taking');
    });

    it('should handle verb alternatives', () => {
      const pattern = createPattern('take|get|grab <noun>', 'taking');
      registry.addPattern(pattern);
      
      expect(registry.findPatterns('take')).toHaveLength(1);
      expect(registry.findPatterns('get')).toHaveLength(1);
      expect(registry.findPatterns('grab')).toHaveLength(1);
    });

    it('should sort by priority', () => {
      registry.addPattern(createPattern('take <noun>', 'taking', { priority: 50 }));
      registry.addPattern(createPattern('take <noun:held>', 'taking inventory', { priority: 60 }));
      
      const found = registry.findPatterns('take');
      expect(found[0].priority).toBe(60);
      expect(found[1].priority).toBe(50);
    });

    it('should parse scope hints from patterns', () => {
      const hints = GrammarRegistry.parseScopeHints('put <noun:held> in <noun:container>');
      expect(hints).toHaveLength(2);
      expect(hints[0]).toEqual({
        position: 0,
        hint: 'held',
        required: false
      });
      expect(hints[1]).toEqual({
        position: 1,
        hint: 'container',
        required: false
      });
    });
  });

  describe('pattern categories', () => {
    it('should filter by category', () => {
      registry.addPattern(createPattern('take <noun>', 'taking', { 
        category: PatternCategory.STANDARD 
      }));
      registry.addPattern(createPattern('xyzzy', 'magic', { 
        category: PatternCategory.CUSTOM 
      }));
      
      const standard = registry.getPatternsByCategory(PatternCategory.STANDARD);
      const custom = registry.getPatternsByCategory(PatternCategory.CUSTOM);
      
      expect(standard).toHaveLength(1);
      expect(custom).toHaveLength(1);
    });

    it('should prevent removing standard patterns', () => {
      const pattern = createPattern('take <noun>', 'taking', { 
        category: PatternCategory.STANDARD 
      });
      registry.addPattern(pattern);
      
      expect(() => registry.removePattern(pattern)).toThrow();
    });

    it('should allow removing custom patterns', () => {
      const pattern = createPattern('xyzzy', 'magic', { 
        category: PatternCategory.CUSTOM 
      });
      registry.addPattern(pattern);
      registry.removePattern(pattern);
      
      expect(registry.findPatterns('xyzzy')).toHaveLength(0);
    });
  });

  describe('pattern building', () => {
    it('should build patterns from components', () => {
      const pattern = GrammarRegistry.buildPattern(
        ['take', 'get'],
        ['<noun>'],
        { 0: 'held' }
      );
      expect(pattern).toBe('take|get <noun:held>');
    });

    it('should handle single verbs', () => {
      const pattern = GrammarRegistry.buildPattern(
        'put',
        ['<noun>', 'in', '<noun>'],
        { 0: 'held', 1: 'container' }
      );
      expect(pattern).toBe('put <noun:held> in <noun:container>');
    });
  });

  describe('statistics', () => {
    it('should track pattern statistics', () => {
      registry.addPattern(createPattern('take <noun>', 'taking'));
      registry.addPattern(createPattern('drop <noun>', 'dropping'));
      registry.addPattern(createPattern('get <noun>', 'taking'));
      
      const stats = registry.getStats();
      expect(stats.totalPatterns).toBe(3);
      expect(stats.verbs).toContain('take');
      expect(stats.verbs).toContain('drop');
      expect(stats.verbs).toContain('get');
      expect(stats.byAction['taking']).toBe(2);
      expect(stats.byAction['dropping']).toBe(1);
    });
  });
});

describe('Standard Grammar', () => {
  it('should create comprehensive standard patterns', () => {
    const patterns = createStandardGrammar();
    
    // Check we have a good number of patterns
    expect(patterns.length).toBeGreaterThan(100);
    
    // Check key patterns exist
    const takingPatterns = patterns.filter(p => p.action === StandardActions.TAKING);
    const examinePatterns = patterns.filter(p => p.action === StandardActions.EXAMINING);
    
    expect(takingPatterns.length).toBeGreaterThan(0);
    expect(examinePatterns.length).toBeGreaterThan(0);
    
    // Check scope hints are included
    const hintedPatterns = patterns.filter(p => p.scopeHints && p.scopeHints.length > 0);
    expect(hintedPatterns.length).toBeGreaterThan(0);
  });

  it('should include all standard actions', () => {
    const patterns = createStandardGrammar();
    const actions = new Set(patterns.map(p => p.action));
    
    // Check key actions
    expect(actions.has(StandardActions.TAKING)).toBe(true);
    expect(actions.has(StandardActions.DROPPING)).toBe(true);
    expect(actions.has(StandardActions.EXAMINING)).toBe(true);
    expect(actions.has(StandardActions.GOING)).toBe(true);
    expect(actions.has(StandardActions.OPENING)).toBe(true);
    expect(actions.has(StandardActions.INVENTORY)).toBe(true);
  });

  it('should have proper priorities for common patterns', () => {
    const patterns = createStandardGrammar();
    
    // Single letter abbreviations should have high priority
    const iPattern = patterns.find(p => p.pattern === 'i');
    const lPattern = patterns.find(p => p.pattern === 'l');
    
    expect(iPattern?.priority).toBeGreaterThan(50);
    expect(lPattern?.priority).toBeGreaterThan(50);
    
    // More specific patterns should have higher priority
    const takeOffWorn = patterns.find(p => p.pattern === 'take off <noun:worn>');
    const takeGeneral = patterns.find(p => p.pattern === 'take|get <noun>');
    
    expect(takeOffWorn?.priority).toBeGreaterThan(takeGeneral?.priority || 0);
  });
});
