/**
 * ADR-231 D3 (PIN 2) — word-level name vocabulary with tiered scored
 * matching in the CommandValidator.
 *
 * Covers the pinned contract:
 *  - Every content word of an entity's name is matchable vocabulary with
 *    zero authoring: `x key` resolves the brass key (no alias needed).
 *  - Tier EXACT (query equals full name/alias) beats tier WORDS.
 *  - A query word matching nothing DISQUALIFIES: `x brass sword` never
 *    resolves to the brass key.
 *  - Articles are stripped before matching, full-text-first so proper
 *    names beginning with an article-like word survive.
 *  - Ties (same tier + matched words, 2+ candidates) flow into the normal
 *    disambiguation path (AMBIGUOUS_ENTITY + disambiguation_required).
 *
 * Tests synthesize parsed commands directly (the golden-test pattern) to
 * exercise the validator's resolution path in isolation; assertions are on
 * resolution results and emitted events, not validator internals.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  AuthorModel,
  EntityType,
  IFEntity,
  IParsedCommand,
  TraitType,
  WorldModel
} from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/if-domain';
import type { ISystemEvent, IGenericEventSource } from '@sharpee/core';

import { CommandValidator } from '../../../src/validation/command-validator';
import { StandardActionRegistry } from '../../../src/actions/registry';
import { examiningAction } from '../../../src/actions/standard/examining';
import { takingAction } from '../../../src/actions/standard/taking';

const mockLanguageProvider = {
  languageCode: 'en-US',
  getMessage: (id: string) => id,
  hasMessage: (_id: string) => true,
  getActionPatterns: (actionId: string) => {
    const patterns: Record<string, string[]> = {
      'if.action.examining': ['examine', 'x', 'look at'],
      'if.action.taking': ['take', 'get']
    };
    return patterns[actionId];
  },
  getActionHelp: () => undefined,
  getSupportedActions: () => ['if.action.examining', 'if.action.taking']
} as unknown as LanguageProvider;

class TestEventSource implements IGenericEventSource<ISystemEvent> {
  events: ISystemEvent[] = [];

  emit(event: ISystemEvent): void {
    this.events.push(event);
  }

  subscribe(_handler: (event: ISystemEvent) => void): () => void {
    return () => {};
  }

  getEventsByType(type: string): ISystemEvent[] {
    return this.events.filter(e => e.type === type);
  }
}

/**
 * Build an IParsedCommand the way the parser would emit it after the D3
 * article fix: leading articles split into `articles`, text/head stripped.
 */
function commandFor(
  action: string,
  verb: string,
  rawText: string,
  articles: string[] = []
): IParsedCommand {
  const words = rawText.toLowerCase().split(/\s+/).filter(Boolean);
  const head = words[words.length - 1];
  const modifiers = words.slice(0, -1);

  return {
    rawInput: `${verb} ${articles.join(' ')} ${rawText}`.replace(/\s+/g, ' '),
    tokens: [],
    structure: {
      verb: { tokens: [0], text: verb, head: verb },
      directObject: {
        tokens: words.map((_, i) => i + 1),
        text: rawText.toLowerCase(),
        head,
        modifiers,
        articles,
        determiners: [],
        candidates: [rawText.toLowerCase()]
      }
    },
    pattern: 'VERB_NOUN',
    confidence: 1.0,
    action
  } as IParsedCommand;
}

describe('CommandValidator — word-level vocabulary resolution (ADR-231 D3)', () => {
  let world: WorldModel;
  let author: AuthorModel;
  let player: IFEntity;
  let room: IFEntity;
  let validator: CommandValidator;
  let eventSource: TestEventSource;

  function makeObject(name: string, adjectives: string[] = [], aliases: string[] = []): IFEntity {
    const entity = author.createEntity(name, EntityType.OBJECT);
    entity.add({
      type: TraitType.IDENTITY,
      name,
      adjectives,
      aliases
    });
    author.moveEntity(entity.id, room.id);
    return entity;
  }

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);

    player = author.createEntity('yourself', EntityType.ACTOR);
    room = author.createEntity('Test Room', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    author.moveEntity(player.id, room.id);
    world.setPlayer(player.id);

    const registry = new StandardActionRegistry();
    registry.setLanguageProvider(mockLanguageProvider);
    registry.register(examiningAction);
    registry.register(takingAction);

    validator = new CommandValidator(world, registry);
    eventSource = new TestEventSource();
    validator.setSystemEventSource(eventSource);
  });

  describe('word-tier matching with zero authoring', () => {
    test('`x key` resolves the brass key without any alias', () => {
      const brassKey = makeObject('brass key');

      const result = validator.validate(commandFor('if.action.examining', 'examine', 'key'));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(brassKey.id);
      }
    });

    test('`x brass key` resolves the brass key (exact full text)', () => {
      const brassKey = makeObject('brass key');

      const result = validator.validate(
        commandFor('if.action.examining', 'examine', 'brass key')
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(brassKey.id);
      }
    });

    test('`x bag` resolves the bag of holding (stopword-stripped name vocabulary)', () => {
      const bag = makeObject('bag of holding');

      const result = validator.validate(commandFor('if.action.examining', 'examine', 'bag'));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(bag.id);
      }
    });
  });

  describe('article handling (defect fix)', () => {
    test('`x the brass key` resolves via the parser-split articles field', () => {
      const brassKey = makeObject('brass key');

      const result = validator.validate(
        commandFor('if.action.examining', 'examine', 'brass key', ['the'])
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(brassKey.id);
      }
    });

    test('`take the key` resolves with article in unstripped text (belt-and-braces)', () => {
      const brassKey = makeObject('brass key');

      // Text still carrying the article — validator strips before matching
      const result = validator.validate(
        commandFor('if.action.taking', 'take', 'the brass key')
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(brassKey.id);
      }
    });

    test('proper name beginning with an article-like word survives (full-text-first)', () => {
      const band = makeObject('the beatles');

      // Parser splits "the" into articles; the validator must try the
      // reconstructed full text FIRST so the exact name match wins.
      const result = validator.validate(
        commandFor('if.action.examining', 'examine', 'beatles', ['the'])
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(band.id);
      }
    });
  });

  describe('disqualification — any query word matching nothing', () => {
    test('`x brass sword` does NOT resolve to the brass key', () => {
      makeObject('brass key');

      const result = validator.validate(
        commandFor('if.action.examining', 'examine', 'brass sword')
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ENTITY_NOT_FOUND');
      }
    });
  });

  describe('tier ranking — exact beats words', () => {
    test('`x key` prefers the entity named exactly "key" over the brass key', () => {
      makeObject('brass key');
      const plainKey = makeObject('key');

      const result = validator.validate(commandFor('if.action.examining', 'examine', 'key'));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(plainKey.id);
      }
    });

    test('an explicit alias stays additive at exact tier', () => {
      makeObject('brass key');
      const skeleton = makeObject('skeleton key', [], ['bone opener']);

      const result = validator.validate(
        commandFor('if.action.examining', 'examine', 'bone opener')
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(skeleton.id);
      }
    });
  });

  describe('word-tier ties trigger the normal disambiguation flow', () => {
    test('two `* key` entities in scope: `x key` returns AMBIGUOUS_ENTITY with both', () => {
      const brassKey = makeObject('brass key');
      const skeletonKey = makeObject('skeleton key');

      const result = validator.validate(commandFor('if.action.examining', 'examine', 'key'));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AMBIGUOUS_ENTITY');
        const choices = (result.error.details as {
          ambiguousEntities?: Array<{ id: string }>;
        }).ambiguousEntities;
        expect(choices).toBeDefined();
        const ids = choices!.map(c => c.id);
        expect(ids).toContain(brassKey.id);
        expect(ids).toContain(skeletonKey.id);
      }

      // The disambiguation event mechanism fires (preserved path)
      const disambiguationEvents = eventSource.getEventsByType('disambiguation_required');
      expect(disambiguationEvents.length).toBeGreaterThan(0);
      expect(disambiguationEvents[0].data.searchText).toBe('key');
    });

    test('a distinguishing word auto-resolves instead of prompting', () => {
      const brassKey = makeObject('brass key');
      makeObject('skeleton key');

      const result = validator.validate(
        commandFor('if.action.examining', 'examine', 'brass key')
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(brassKey.id);
      }
    });
  });

  describe('scope stays orthogonal', () => {
    test('a word-tier match in another room is not resolvable', () => {
      const otherRoom = author.createEntity('Other Room', EntityType.ROOM);
      otherRoom.add({ type: TraitType.ROOM });
      const farKey = author.createEntity('brass key', EntityType.OBJECT);
      farKey.add({ type: TraitType.IDENTITY, name: 'brass key' });
      author.moveEntity(farKey.id, otherRoom.id);

      const result = validator.validate(commandFor('if.action.examining', 'examine', 'key'));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ENTITY_NOT_FOUND');
      }
    });
  });
});
