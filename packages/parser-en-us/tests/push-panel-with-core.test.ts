/**
 * @file Push Panel With Core Grammar Test
 * @description Tests story grammar patterns with the FULL core grammar loaded
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { ParserLanguageProvider, GrammarBuilder, ScopeBuilder } from '@sharpee/if-domain';
import { Entity } from '@sharpee/core';
import { registerCoreGrammar } from '../src/core-grammar';

// Full language provider for core grammar
const fullLanguageProvider: ParserLanguageProvider = {
  getVerbs: () => [
    {
      actionId: 'if.action.pushing',
      verbs: ['push', 'shove'],
      pattern: 'VERB_NOUN',
      prepositions: []
    },
    {
      actionId: 'if.action.taking',
      verbs: ['take', 'get', 'grab'],
      pattern: 'VERB_NOUN',
      prepositions: []
    },
    {
      actionId: 'if.action.looking',
      verbs: ['look', 'l'],
      pattern: 'VERB_NOUN',
      prepositions: ['at']
    }
  ],
  getNouns: () => [],
  getAdjectives: () => ['red', 'yellow', 'mahogany', 'pine'],
  getPrepositions: () => ['at', 'with', 'from', 'to', 'in', 'on'],
  getDeterminers: () => ['the', 'a', 'an'],
  getConjunctions: () => ['and', 'or'],
  getNumbers: () => [],
  getSpecialWords: () => [],
  getDirections: () => ['north', 'south', 'east', 'west', 'n', 's', 'e', 'w', 'up', 'down', 'in', 'out']
};

// Mock world model with panel entities
class MockWorldModel {
  private entities: Map<string, Entity> = new Map();

  constructor() {
    this.entities.set('red-panel', {
      id: 'red-panel',
      name: 'red panel',
      attributes: { name: 'red panel' },
      visible: true,
      isPanel: true,
      panelType: 'red'
    } as any);
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  getVisibleEntities(): Entity[] {
    return Array.from(this.entities.values()).filter(e => e.visible);
  }

  getCarriedEntities(): Entity[] {
    return [];
  }
}

describe('Push Panel With Core Grammar', () => {
  let parser: EnglishParser;
  let grammar: GrammarBuilder;
  let world: MockWorldModel;

  beforeEach(() => {
    parser = new EnglishParser(fullLanguageProvider);

    // Register FULL core grammar (this includes "push :target")
    registerCoreGrammar(parser.getSemanticGrammar());

    grammar = parser.getStoryGrammar();
    world = new MockWorldModel();
    parser.setWorldContext(world, 'player', 'room');
  });

  it('should show what action core grammar push matches', () => {
    // WITHOUT any story patterns, what does "push red panel" match?
    const result = parser.parse('push red panel');
    console.log('Core grammar only result:', JSON.stringify(result, null, 2));

    expect(result.success).toBe(true);
    if (result.success) {
      console.log('Action:', result.value.action);
      console.log('DirectObject:', result.value.structure.directObject);
    }
  });

  it('should match story pattern over core pattern with higher priority', () => {
    // Now add story pattern with higher priority
    grammar
      .define('push red panel')
      .mapsTo('story.action.push_panel')
      .withPriority(170) // Core push is 100
      .build();

    const result = parser.parse('push red panel');
    console.log('With story pattern result:', JSON.stringify(result, null, 2));

    expect(result.success).toBe(true);
    if (result.success) {
      console.log('Action:', result.value.action);
      console.log('DirectObject:', result.value.structure.directObject);
      expect(result.value.action).toBe('story.action.push_panel');
    }
  });

  it('should check all matching rules', () => {
    // Add story pattern
    grammar
      .define('push red panel')
      .mapsTo('story.action.push_panel')
      .withPriority(170)
      .build();

    // Enable debug to see rule matching
    const grammar = parser.getSemanticGrammar();
    const rules = grammar.getRules();

    console.log('Total rules:', rules.length);

    // Find push-related rules
    const pushRules = rules.filter((r: any) =>
      r.pattern && r.pattern.toLowerCase().includes('push')
    );

    console.log('Push rules:');
    for (const rule of pushRules) {
      console.log(`  Pattern: ${rule.pattern}, Action: ${rule.action}, Priority: ${rule.priority}`);
    }
  });
});
