/**
 * Tests for author action vocabulary registration
 */

import { describe, test, expect } from 'vitest';
import { standardVerbs } from '../../../src/vocabulary/standard-english';

describe('Author Action Vocabulary', () => {
  test('should include parser events verb', () => {
    const parserVerb = standardVerbs.find(v => v.actionId === 'author.parser_events');
    expect(parserVerb).toBeDefined();
    expect(parserVerb?.verbs).toContain('parser');
    expect(parserVerb?.pattern).toBe('verb_noun');
  });
  
  test('should include validation events verb', () => {
    const validationVerb = standardVerbs.find(v => v.actionId === 'author.validation_events');
    expect(validationVerb).toBeDefined();
    expect(validationVerb?.verbs).toContain('validation');
    expect(validationVerb?.pattern).toBe('verb_noun');
  });
  
  test('should include system events verb', () => {
    const systemVerb = standardVerbs.find(v => v.actionId === 'author.system_events');
    expect(systemVerb).toBeDefined();
    expect(systemVerb?.verbs).toContain('system');
    expect(systemVerb?.pattern).toBe('verb_noun');
  });
  
  test('all author verbs should have correct pattern', () => {
    const authorVerbs = standardVerbs.filter(v => v.actionId.startsWith('author.'));
    expect(authorVerbs).toHaveLength(3);
    
    for (const verb of authorVerbs) {
      expect(verb.pattern).toBe('verb_noun');
      expect(verb.verbs).toHaveLength(1);
    }
  });
  
  test('author verb action IDs should match action IDs', () => {
    // These should match the IDs used in the action classes
    expect(standardVerbs.find(v => v.actionId === 'author.parser_events')).toBeDefined();
    expect(standardVerbs.find(v => v.actionId === 'author.validation_events')).toBeDefined();
    expect(standardVerbs.find(v => v.actionId === 'author.system_events')).toBeDefined();
  });
});