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
/** Minimal entity shape used by the button world model in these tests */
interface MockEntity {
  id: string;
  name: string;
  attributes: Record<string, unknown>;
  visible: boolean;
  portable: boolean;
  get: (trait: string) => { name: string; aliases: string[] } | undefined;
}

/**
 * Mock world model with colored buttons
 */
class ButtonWorldModel {
  private entities: Map<string, MockEntity> = new Map();
  private locations: Map<string, Set<string>> = new Map();

  constructor() {
    // Blue button - name is "blue button", alias is "blue"
    const blueButton: MockEntity = {
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
    };

    // Yellow button - name is "yellow button", alias is "yellow"
    const yellowButton: MockEntity = {
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
    };

    // Red button
    const redButton: MockEntity = {
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
    };

    // Control panel - has "button" as alias
    const panel: MockEntity = {
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
    };

    this.entities.set('blue-button', blueButton);
    this.entities.set('yellow-button', yellowButton);
    this.entities.set('red-button', redButton);
    this.entities.set('control-panel', panel);

    // All entities in the maintenance room
    this.locations.set('maintenance-room', new Set([
      'blue-button', 'yellow-button', 'red-button', 'control-panel'
    ]));
  }

  getEntity(id: string): MockEntity | undefined {
    return this.entities.get(id);
  }

  getAllEntities(): MockEntity[] {
    return Array.from(this.entities.values());
  }

  getVisibleEntities(actorId: string, location: string): MockEntity[] {
    const locationEntities = this.locations.get(location) || new Set();
    const visibleEntities: MockEntity[] = [];

    for (const entityId of locationEntities) {
      const entity = this.entities.get(entityId);
      if (entity && entity.visible) {
        visibleEntities.push(entity);
      }
    }

    return visibleEntities;
  }

  getTouchableEntities(actorId: string, location: string): MockEntity[] {
    return this.getVisibleEntities(actorId, location);
  }

  getCarriedEntities(actorId: string): MockEntity[] {
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

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.pushing');
        expect(result.value.structure.directObject?.text).toBe('blue');
      }
    });

    it('should parse "press yellow" using alias', () => {
      const result = parser.parse('press yellow');

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

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.pushing');
        expect(result.value.structure.directObject?.text).toBe('blue button');
      }
    });

    it('should parse "press yellow button" using full name', () => {
      const result = parser.parse('press yellow button');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.pushing');
        expect(result.value.structure.directObject?.text).toBe('yellow button');
      }
    });

    it('should parse "push the blue button" with article', () => {
      const result = parser.parse('push the blue button');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.action).toBe('if.action.pushing');
        expect(result.value.structure.directObject?.text).toBe('the blue button');
      }
    });
  });

  describe('Entity scope and visibility', () => {
    it('should list all visible entities for debugging', () => {
      const visibleEntities = world.getVisibleEntities('player', 'maintenance-room');

      expect(visibleEntities.length).toBe(4);
    });
  });
});
