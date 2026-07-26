/**
 * @file ADR-231 D2b — Literal-before-slot specificity tests
 * @description Pins the general match-ordering contract (ADR-268 D2):
 * confidence desc → tier (story over standard) → literal specificity desc →
 * definition order. A rule whose literal tokens consume words outranks a
 * rule whose unconstrained slot swallows the same words (`get in :portal`
 * beats `get :item` for "get in basket"); the story tier is the override
 * layered on top of specificity.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { vocabularyRegistry, Token } from '@sharpee/if-domain';

/** Minimal entity shape used by the mock world model in these tests */
interface MockEntity {
  id: string;
  name: string;
  attributes: Record<string, unknown>;
  visible: boolean;
  portable: boolean;
  has?: (traitType: string) => boolean;
}

/**
 * Minimal world with an enterable (basket) and a portable (coin) —
 * parse-time behavior must pick entering over taking for "get in basket"
 * structurally, regardless of world state (D2a: parse by syntax).
 */
class MockWorldModel {
  private entities: Map<string, MockEntity> = new Map();

  constructor() {
    this.entities.set('basket', {
      id: 'basket', name: 'basket',
      attributes: { name: 'basket' },
      visible: true, portable: false,
      has: (traitType: string) => traitType === 'enterable'
    });
    this.entities.set('coin', {
      id: 'coin', name: 'coin',
      attributes: { name: 'coin' },
      visible: true, portable: true
    });
  }

  getEntity(id: string): MockEntity | undefined {
    return this.entities.get(id);
  }

  getAllEntities(): MockEntity[] {
    return Array.from(this.entities.values());
  }

  getVisibleEntities(): MockEntity[] {
    return this.getAllEntities();
  }

  getTouchableEntities(): MockEntity[] {
    return this.getAllEntities();
  }

  getCarriedEntities(): MockEntity[] {
    return [];
  }

  // ADR-273: the real WorldModel surface GrammarScopeResolver consumes.
  getVisible(): MockEntity[] {
    return this.getAllEntities();
  }

  getReachable(): MockEntity[] {
    return this.getAllEntities();
  }

  getCarriedAndWorn(): { carried: MockEntity[]; worn: MockEntity[] } {
    return { carried: [], worn: [] };
  }
}

describe('ADR-231 D2b — literal-before-slot specificity (full grammar)', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    vocabularyRegistry.clear();
    parser = new EnglishParser(new EnglishLanguageProvider());
    parser.setWorldContext(new MockWorldModel(), 'player', 'room');
  });

  it('parses "get in basket" as entering, not taking', () => {
    const result = parser.parse('get in basket');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.entering');
      expect(result.value.structure.directObject?.text).toBe('basket');
    }
  });

  it('still parses "get basket" as taking (no over-rotation)', () => {
    const result = parser.parse('get basket');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.taking');
      expect(result.value.structure.directObject?.text).toBe('basket');
    }
  });

  it('parses "get out" as exiting, not taking an item named "out"', () => {
    const result = parser.parse('get out');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.exiting');
    }
  });

  it('parses "get out of basket" as exiting WITH the container target', () => {
    const result = parser.parse('get out of basket');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.exiting');
      expect(result.value.structure.directObject?.text).toBe('basket');
    }
  });

  it('parses "climb out of basket" as exiting with the container target', () => {
    const result = parser.parse('climb out of basket');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.exiting');
      expect(result.value.structure.directObject?.text).toBe('basket');
    }
  });

  it('parses bare "throw coin" as throwing (general throw, no target)', () => {
    const result = parser.parse('throw coin');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.throwing');
      expect(result.value.structure.directObject?.text).toBe('coin');
      expect(result.value.structure.indirectObject).toBeUndefined();
    }
  });

  it('still parses "throw away coin" as dropping — literal specificity beats the bare form', () => {
    const result = parser.parse('throw away coin');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.dropping');
    }
  });

  it('parses "climb out" as exiting, not climbing an object named "out"', () => {
    const result = parser.parse('climb out');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.exiting');
    }
  });
});

describe('ADR-231 D2b — ordering contract (synthetic rules)', () => {
  let engine: EnglishGrammarEngine;
  let grammar: ReturnType<EnglishGrammarEngine['createBuilder']>;

  const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };

  function createTokens(words: string[]): Token[] {
    return words.map((word, index) => ({
      word,
      normalized: word.toLowerCase(),
      position: index * 5,
      candidates: []
    }));
  }

  beforeEach(() => {
    engine = new EnglishGrammarEngine();
    grammar = engine.createBuilder();
  });

  it('within a tier, literal-consuming rule outranks slot-swallowing rule', () => {
    // Slot rule registered FIRST: under the old registration-order tiebreak
    // it would win; specificity must now decide.
    grammar.define('frob :thing').mapsTo('test.action.slot').build();
    grammar.define('frob wob :thing').mapsTo('test.action.literal').build();

    const matches = engine.findMatches(createTokens(['frob', 'wob', 'gizmo']), context as any);

    expect(matches.length).toBe(2);
    expect(matches[0].rule.action).toBe('test.action.literal');
    expect(matches[0].literalSpecificity).toBe(2); // "frob" + "wob"
    expect(matches[1].rule.action).toBe('test.action.slot');
    expect(matches[1].literalSpecificity).toBe(1); // "frob" only; slot swallowed "wob gizmo"
  });

  it('story tier beats literal specificity (ADR-268 D2: tier-first)', () => {
    grammar.define('frob wob :thing').mapsTo('test.action.literal').build(); // standard tier
    engine.createBuilder('story').define('frob :thing').mapsTo('test.action.slot').build();

    const matches = engine.findMatches(createTokens(['frob', 'wob', 'gizmo']), context as any);

    expect(matches.length).toBe(2);
    expect(matches[0].rule.action).toBe('test.action.slot');
    expect(matches[0].rule.tier).toBe('story');
    expect(matches[1].rule.action).toBe('test.action.literal');
    expect(matches[1].literalSpecificity).toBe(2);
  });

  it('within a tier at equal specificity, the earlier definition wins (ADR-268 D2)', () => {
    grammar.define('frob wob').mapsTo('test.action.first').build();
    grammar.define('frob wob').mapsTo('test.action.second').build();

    const matches = engine.findMatches(createTokens(['frob', 'wob']), context as any);

    expect(matches.length).toBe(2);
    expect(matches[0].rule.action).toBe('test.action.first');
  });

  it('exposes literalSpecificity on every match candidate', () => {
    grammar.define('frob :thing').mapsTo('test.action.slot').build();

    const matches = engine.findMatches(createTokens(['frob', 'gizmo']), context as any);

    expect(matches.length).toBe(1);
    expect(matches[0].literalSpecificity).toBe(1);
  });
});
