/**
 * Phase 3 tests for ADR-173 — per-side wall adjective resolution.
 *
 * Covers:
 *  - AC-5: LOOK AT WALL from a room with exactly one wall renders the
 *    per-side description without disambiguation. (Validator side: bare
 *    `wall` resolves uniquely.)
 *  - AC-6: LOOK AT WALL from a room with multiple walls triggers parser
 *    disambiguation. (Validator side: bare `wall` returns AMBIGUOUS_ENTITY
 *    listing each visible wall.)
 *  - AC-7: `OAK WALL` (or any adjective + WALL form) resolves to the wall
 *    whose current-side adjective matches; the same wall entity resolves
 *    under different adjectives from different rooms.
 *
 * The tests synthesize parsed commands directly (bypassing the parser)
 * to exercise the validator's resolution path in isolation. Walls are
 * created via the real `WorldModel.createWall` API; resolution runs
 * through the real `CommandValidator` against a real `WorldModel`.
 *
 * Owner context: `@sharpee/stdlib` — command validation tests.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  AuthorModel,
  EntityType,
  IFEntity,
  IParsedCommand,
  TraitType,
  WallEntity,
  WorldModel,
} from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/if-domain';

import { CommandValidator } from '../../../src/validation/command-validator';
import { StandardActionRegistry } from '../../../src/actions/registry';
import { examiningAction } from '../../../src/actions/standard/examining';

const mockLanguageProvider = {
  languageCode: 'en-US',
  getMessage: (id: string) => id,
  hasMessage: (_id: string) => true,
  getActionPatterns: (actionId: string) => {
    const patterns: Record<string, string[]> = {
      'if.action.examining': ['examine', 'x', 'look at'],
    };
    return patterns[actionId];
  },
  getActionHelp: () => undefined,
  getSupportedActions: () => ['if.action.examining'],
} as unknown as LanguageProvider;

function makeRoom(author: AuthorModel, displayName: string): IFEntity {
  const room = author.createEntity(displayName, EntityType.ROOM);
  room.add({ type: TraitType.ROOM });
  return room;
}

/**
 * Build an IParsedCommand for `examine <text>` (or 'look at <text>'),
 * splitting `text` into head + modifiers the way the parser would.
 */
function examineCommand(rawText: string): IParsedCommand {
  const words = rawText.toLowerCase().split(/\s+/).filter(Boolean);
  const head = words[words.length - 1];
  const modifiers = words.slice(0, -1);

  return {
    rawInput: `examine ${rawText}`,
    tokens: [],
    structure: {
      verb: { tokens: [0], text: 'examine', head: 'examine' },
      directObject: {
        tokens: words.map((_, i) => i + 1),
        text: rawText.toLowerCase(),
        head,
        modifiers,
        articles: [],
        determiners: [],
        candidates: [head],
      },
    },
    pattern: 'VERB_NOUN',
    confidence: 1.0,
    action: 'if.action.examining',
  };
}

describe('CommandValidator — wall resolution (ADR-173 Phase 3)', () => {
  let world: WorldModel;
  let author: AuthorModel;
  let player: IFEntity;
  let parlor: IFEntity;
  let library: IFEntity;
  let kitchen: IFEntity;
  let registry: StandardActionRegistry;
  let validator: CommandValidator;

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);

    parlor = makeRoom(author, 'Parlor');
    library = makeRoom(author, 'Library');
    kitchen = makeRoom(author, 'Kitchen');

    player = author.createEntity('yourself', EntityType.ACTOR);
    author.moveEntity(player.id, parlor.id);
    world.setPlayer(player.id);

    registry = new StandardActionRegistry();
    registry.setLanguageProvider(mockLanguageProvider);
    registry.register(examiningAction);

    validator = new CommandValidator(world, registry);
  });

  describe('AC-7 — per-side adjective match', () => {
    test('OAK WALL from parlor resolves to the parlor↔library wall', () => {
      const wallParlorLibrary = world.createWall({
        between: [parlor, library],
        sides: {
          [parlor.id]: { adjective: 'oak' },
          [library.id]: { adjective: 'brick' },
        },
      });

      const result = validator.validate(examineCommand('oak wall'));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(wallParlorLibrary.id);
        expect(result.value.directObject?.entity).toBeInstanceOf(WallEntity);
      }
    });

    test('BRICK WALL from library resolves to the same wall (different side)', () => {
      const wallParlorLibrary = world.createWall({
        between: [parlor, library],
        sides: {
          [parlor.id]: { adjective: 'oak' },
          [library.id]: { adjective: 'brick' },
        },
      });
      author.moveEntity(player.id, library.id);

      const result = validator.validate(examineCommand('brick wall'));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(wallParlorLibrary.id);
      }
    });

    test('OAK WALL from library does not resolve (oak is the parlor side)', () => {
      world.createWall({
        between: [parlor, library],
        sides: {
          [parlor.id]: { adjective: 'oak' },
          [library.id]: { adjective: 'brick' },
        },
      });
      author.moveEntity(player.id, library.id);

      const result = validator.validate(examineCommand('oak wall'));

      expect(result.success).toBe(false);
      if (!result.success) {
        // No candidate satisfies the modifier on the library side; the wall
        // is the only candidate by name and we removed it for unmet modifier.
        expect(['ENTITY_NOT_FOUND', 'NO_MATCHES']).toContain(result.error.code);
      }
    });

    test('with two walls in parlor (oak and pine), each adjective resolves to its own wall', () => {
      const wallParlorLibrary = world.createWall({
        between: [parlor, library],
        sides: {
          [parlor.id]: { adjective: 'oak' },
          [library.id]: { adjective: 'brick' },
        },
      });
      const wallParlorKitchen = world.createWall({
        between: [parlor, kitchen],
        sides: {
          [parlor.id]: { adjective: 'pine' },
          [kitchen.id]: { adjective: 'tile' },
        },
      });

      const oakResult = validator.validate(examineCommand('oak wall'));
      expect(oakResult.success).toBe(true);
      if (oakResult.success) {
        expect(oakResult.value.directObject?.entity.id).toBe(wallParlorLibrary.id);
      }

      const pineResult = validator.validate(examineCommand('pine wall'));
      expect(pineResult.success).toBe(true);
      if (pineResult.success) {
        expect(pineResult.value.directObject?.entity.id).toBe(wallParlorKitchen.id);
      }
    });

    test('TILE WALL from parlor does not resolve (tile is the kitchen side of a parlor↔kitchen wall)', () => {
      world.createWall({
        between: [parlor, kitchen],
        sides: {
          [parlor.id]: { adjective: 'pine' },
          [kitchen.id]: { adjective: 'tile' },
        },
      });

      const result = validator.validate(examineCommand('tile wall'));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(['ENTITY_NOT_FOUND', 'NO_MATCHES']).toContain(result.error.code);
      }
    });
  });

  describe('AC-5 — single wall resolves bare WALL uniquely', () => {
    test('parlor with one wall: bare `wall` resolves to that wall', () => {
      const wallParlorLibrary = world.createWall({
        between: [parlor, library],
        sides: {
          [parlor.id]: { adjective: 'oak' },
          [library.id]: { adjective: 'brick' },
        },
      });

      const result = validator.validate(examineCommand('wall'));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.directObject?.entity.id).toBe(wallParlorLibrary.id);
      }
    });
  });

  describe('AC-6 — multiple walls in a room return AMBIGUOUS_ENTITY for bare WALL', () => {
    test('parlor with two walls: bare `wall` returns AMBIGUOUS_ENTITY', () => {
      const wallParlorLibrary = world.createWall({
        between: [parlor, library],
        sides: {
          [parlor.id]: { adjective: 'oak' },
          [library.id]: { adjective: 'brick' },
        },
      });
      const wallParlorKitchen = world.createWall({
        between: [parlor, kitchen],
        sides: {
          [parlor.id]: { adjective: 'pine' },
          [kitchen.id]: { adjective: 'tile' },
        },
      });

      const result = validator.validate(examineCommand('wall'));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AMBIGUOUS_ENTITY');
        const choices = (result.error.details as { ambiguousEntities?: Array<{ id: string }> })
          .ambiguousEntities;
        expect(choices).toBeDefined();
        const ids = choices!.map((c) => c.id);
        expect(ids).toContain(wallParlorLibrary.id);
        expect(ids).toContain(wallParlorKitchen.id);
      }
    });
  });

  describe('scope: walls in other rooms are not in scope', () => {
    test('a wall not bordering the player room is not resolvable', () => {
      // Player is in parlor, but the only wall is between library and kitchen.
      world.createWall({
        between: [library, kitchen],
        sides: {
          [library.id]: { adjective: 'brick' },
          [kitchen.id]: { adjective: 'tile' },
        },
      });

      const result = validator.validate(examineCommand('brick wall'));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(['ENTITY_NOT_FOUND', 'NO_MATCHES']).toContain(result.error.code);
      }
    });
  });
});
