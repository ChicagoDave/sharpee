/**
 * @file Colored Buttons Parser Tests
 * @description Tests for parsing commands targeting colored buttons
 *
 * Issue: "push blue button" fails with ENTITY_NOT_FOUND but "push blue" works
 * This test investigates multi-word noun matching for entities like "blue button"
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { ParserLanguageProvider } from '@sharpee/if-domain';
import { Entity } from '@sharpee/core';

/**
 * Mock world model with colored buttons
 */
class ButtonWorldModel {
  private entities: Map<string, Entity> = new Map();
  private locations: Map<string, Set<string>> = new Map();

  constructor() {
    // Blue button - name is "blue button", alias is "blue"
    const blueButton: Entity = {
      id: 'blue-button',
      name: 'blue button',
      attributes: { name: 'blue button' },
      visible: true,
      portable: false,
      get: (trait: string) => {
        if (trait === 'identity') {
          return {
            name: 'blue button',
            aliases: ['blue']
          };
        }
        return undefined;
      }
    } as any;

    // Yellow button - name is "yellow button", alias is "yellow"
    const yellowButton: Entity = {
      id: 'yellow-button',
      name: 'yellow button',
      attributes: { name: 'yellow button' },
      visible: true,
      portable: false,
      get: (trait: string) => {
        if (trait === 'identity') {
          return {
            name: 'yellow button',
            aliases: ['yellow', 'danger button', 'danger']
          };
        }
        return undefined;
      }
    } as any;

    // Red button
    const redButton: Entity = {
      id: 'red-button',
      name: 'red button',
      attributes: { name: 'red button' },
      visible: true,
      portable: false,
      get: (trait: string) => {
        if (trait === 'identity') {
          return {
            name: 'red button',
            aliases: ['red']
          };
        }
        return undefined;
      }
    } as any;

    // Control panel - has "button" as alias
    const panel: Entity = {
      id: 'control-panel',
      name: 'control panel',
      attributes: { name: 'control panel' },
      visible: true,
      portable: false,
      get: (trait: string) => {
        if (trait === 'identity') {
          return {
            name: 'control panel',
            aliases: ['panel', 'controls', 'buttons']
          };
        }
        return undefined;
      }
    } as any;

    this.entities.set('blue-button', blueButton);
    this.entities.set('yellow-button', yellowButton);
    this.entities.set('red-button', redButton);
    this.entities.set('control-panel', panel);

    // All entities in the maintenance room
    this.locations.set('maintenance-room', new Set([
      'blue-button', 'yellow-button', 'red-button', 'control-panel'
    ]));
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  getVisibleEntities(actorId: string, location: string): Entity[] {
    const locationEntities = this.locations.get(location) || new Set();
    const visibleEntities: Entity[] = [];

    for (const entityId of locationEntities) {
      const entity = this.entities.get(entityId);
      if (entity && entity.visible) {
        visibleEntities.push(entity);
      }
    }

    return visibleEntities;
  }

  getTouchableEntities(actorId: string, location: string): Entity[] {
    return this.getVisibleEntities(actorId, location);
  }

  getCarriedEntities(actorId: string): Entity[] {
    return [];
  }
}

// Mock language provider with push/press verbs
const mockLanguageProvider: ParserLanguageProvider = {
  getVerbs: () => [
    {
      actionId: 'if.action.pushing',
      verbs: ['push', 'press'],
      pattern: 'VERB_NOUN',
      prepositions: []
    },
    {
      actionId: 'if.action.examining',
      verbs: ['examine', 'look', 'x'],
      pattern: 'VERB_NOUN',
      prepositions: []
    }
  ],
  getNouns: () => [],
  getAdjectives: () => ['blue', 'yellow', 'red', 'brown'],
  getPrepositions: () => ['at', 'to', 'on', 'in'],
  getDeterminers: () => ['the', 'a', 'an'],
  getConjunctions: () => ['and', 'or'],
  getNumbers: () => [],
  getSpecialWords: () => [],
  getDirections: () => []
};

describe('Colored Button Parsing', () => {
  let parser: EnglishParser;
  let world: ButtonWorldModel;

  beforeEach(() => {
    parser = new EnglishParser(mockLanguageProvider);
    world = new ButtonWorldModel();
    parser.setWorldContext(world, 'player', 'maintenance-room');
  });

  describe('Single-word references (using alias)', () => {
    it('should parse "push blue" using alias', () => {
      const result = parser.parse('push blue');

      console.log('push blue result:', JSON.stringify(result, null, 2));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.pushing');
        expect(result.value.structure.directObject?.text).toBe('blue');
      }
    });

    it('should parse "press yellow" using alias', () => {
      const result = parser.parse('press yellow');

      console.log('press yellow result:', JSON.stringify(result, null, 2));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.pushing');
        expect(result.value.structure.directObject?.text).toBe('yellow');
      }
    });
  });

  describe('Multi-word references (using full name)', () => {
    it('should parse "push blue button" using full name', () => {
      const result = parser.parse('push blue button');

      console.log('push blue button result:', JSON.stringify(result, null, 2));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.pushing');
        expect(result.value.structure.directObject?.text).toBe('blue button');
      }
    });

    it('should parse "press yellow button" using full name', () => {
      const result = parser.parse('press yellow button');

      console.log('press yellow button result:', JSON.stringify(result, null, 2));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.pushing');
        expect(result.value.structure.directObject?.text).toBe('yellow button');
      }
    });

    it('should parse "push the blue button" with article', () => {
      const result = parser.parse('push the blue button');

      console.log('push the blue button result:', JSON.stringify(result, null, 2));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.pushing');
        expect(result.value.structure.directObject?.text).toBe('the blue button');
      }
    });
  });

  describe('Ambiguous references (disambiguation)', () => {
    it('should handle "push button" when multiple buttons exist', () => {
      const result = parser.parse('push button');

      console.log('push button result:', JSON.stringify(result, null, 2));

      // This should either:
      // 1. Fail with AMBIGUOUS/DISAMBIGUATION_NEEDED error
      // 2. Match the control panel's "buttons" alias
      // 3. Fail with ENTITY_NOT_FOUND if no entity has just "button" as name

      // Document actual behavior
      if (result.success) {
        console.log('Successfully parsed - matched:', result.value.structure.directObject?.text);
      } else {
        console.log('Failed with error:', result.error.type, result.error.message);
      }
    });

    it('should handle "press button" when multiple buttons exist', () => {
      const result = parser.parse('press button');

      console.log('press button result:', JSON.stringify(result, null, 2));

      // Document actual behavior
      if (result.success) {
        console.log('Successfully parsed - matched:', result.value.structure.directObject?.text);
      } else {
        console.log('Failed with error:', result.error.type, result.error.message);
      }
    });
  });

  describe('Entity scope and visibility', () => {
    it('should list all visible entities for debugging', () => {
      const visibleEntities = world.getVisibleEntities('player', 'maintenance-room');
      console.log('Visible entities:');
      for (const entity of visibleEntities) {
        const identity = entity.get?.('identity');
        console.log(`  - ${entity.id}: name="${identity?.name}", aliases=${JSON.stringify(identity?.aliases)}`);
      }

      expect(visibleEntities.length).toBe(4);
    });
  });

  describe('Debug: Examine slot matching behavior', () => {
    it('should show what text is captured for "push blue button"', () => {
      // Enable debug output for this test
      const originalDebug = process.env.PARSER_DEBUG;
      process.env.PARSER_DEBUG = 'true';

      try {
        const result = parser.parse('push blue button');
        console.log('\n=== push blue button ===');
        console.log('Result:', JSON.stringify(result, null, 2));
      } finally {
        process.env.PARSER_DEBUG = originalDebug;
      }
    });

    it('should show what text is captured for "push blue"', () => {
      const originalDebug = process.env.PARSER_DEBUG;
      process.env.PARSER_DEBUG = 'true';

      try {
        const result = parser.parse('push blue');
        console.log('\n=== push blue ===');
        console.log('Result:', JSON.stringify(result, null, 2));
      } finally {
        process.env.PARSER_DEBUG = originalDebug;
      }
    });
  });
});
