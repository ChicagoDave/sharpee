/**
 * Phase 4 tests for ADR-173 — examining action handles wall entities by
 * rendering the per-side description for the side facing the player's
 * current room.
 *
 * Covers:
 *  - Per-side description rendering (parlor side vs library side render
 *    different text from the same wall entity).
 *  - No-description fallback (wall with adjective only emits
 *    `nothing_special`).
 *  - Obstructed-side rendering (the per-side description authored to
 *    reference the obstructor renders as written; the action does not
 *    need to know about obstructors).
 *  - `requiredMessages` declares `examined_wall`.
 *
 * The validator's per-side resolution work is covered separately in
 * `tests/unit/validation/wall-resolution.test.ts`. These tests start
 * from a resolved wall entity and exercise only the action pipeline.
 *
 * Owner context: `@sharpee/stdlib` — examining action tests.
 */

import { describe, test, expect } from 'vitest';
import {
  AuthorModel,
  EntityType,
  IFEntity,
  TraitType,
  WorldModel,
} from '@sharpee/world-model';

import { examiningAction } from '../../../src/actions/standard/examining';
import { IFActions } from '../../../src/actions/constants';
import {
  createCommand,
  createRealTestContext,
  executeWithValidation,
  expectEvent,
} from '../../test-utils';

function makeRoom(author: AuthorModel, displayName: string): IFEntity {
  const room = author.createEntity(displayName, EntityType.ROOM);
  room.add({ type: TraitType.ROOM });
  return room;
}

interface WallScenario {
  world: WorldModel;
  author: AuthorModel;
  player: IFEntity;
  parlor: IFEntity;
  library: IFEntity;
}

function setupWallScenario(opts: {
  parlorDescription?: string;
  libraryDescription?: string;
  obstructorInParlor?: { name: string };
}): WallScenario & { wall: IFEntity; obstructor?: IFEntity } {
  const world = new WorldModel();
  const author = new AuthorModel(world.getDataStore(), world);

  const parlor = makeRoom(author, 'Parlor');
  const library = makeRoom(author, 'Library');

  const player = author.createEntity('yourself', EntityType.ACTOR);
  author.moveEntity(player.id, parlor.id);
  world.setPlayer(player.id);

  let obstructor: IFEntity | undefined;
  if (opts.obstructorInParlor) {
    obstructor = author.createEntity(opts.obstructorInParlor.name, EntityType.OBJECT);
    author.moveEntity(obstructor.id, parlor.id);
  }

  const wall = world.createWall({
    between: [parlor, library],
    sides: {
      [parlor.id]: {
        adjective: 'oak',
        description: opts.parlorDescription,
        obstructedBy: obstructor?.id,
      },
      [library.id]: {
        adjective: 'brick',
        description: opts.libraryDescription,
      },
    },
  });

  return { world, author, player, parlor, library, wall, obstructor };
}

describe('examiningAction — wall rendering (ADR-173 Phase 4)', () => {
  describe('Action metadata', () => {
    test('declares examined_wall as a required message', () => {
      expect(examiningAction.requiredMessages).toContain('examined_wall');
    });
  });

  describe('per-side description', () => {
    test('renders the parlor-side description when player is in the parlor', () => {
      const { world, wall } = setupWallScenario({
        parlorDescription: 'A tall mahogany bookcase covers the wall, floor to ceiling.',
        libraryDescription: 'Exposed brick, dusty and chipped where shelves once hung.',
      });

      const command = createCommand(IFActions.EXAMINING, { entity: wall });
      const context = createRealTestContext(examiningAction, world, command);

      const events = executeWithValidation(examiningAction, context);

      expectEvent(events, 'if.event.examined', {
        isWall: true,
        targetId: wall.id,
        messageId: 'if.action.examining.examined_wall',
        params: {
          description: 'A tall mahogany bookcase covers the wall, floor to ceiling.',
        },
      });
    });

    test('renders the library-side description when player is in the library', () => {
      const { world, author, player, library, wall } = setupWallScenario({
        parlorDescription: 'A tall mahogany bookcase covers the wall, floor to ceiling.',
        libraryDescription: 'Exposed brick, dusty and chipped where shelves once hung.',
      });
      author.moveEntity(player.id, library.id);

      const command = createCommand(IFActions.EXAMINING, { entity: wall });
      const context = createRealTestContext(examiningAction, world, command);

      const events = executeWithValidation(examiningAction, context);

      expectEvent(events, 'if.event.examined', {
        isWall: true,
        targetId: wall.id,
        messageId: 'if.action.examining.examined_wall',
        params: {
          description: 'Exposed brick, dusty and chipped where shelves once hung.',
        },
      });
    });

    test('the same wall entity emits different descriptions from each side', () => {
      const { world, author, player, library, wall } = setupWallScenario({
        parlorDescription: 'parlor view',
        libraryDescription: 'library view',
      });

      // Parlor side
      const parlorContext = createRealTestContext(
        examiningAction,
        world,
        createCommand(IFActions.EXAMINING, { entity: wall }),
      );
      const parlorEvents = executeWithValidation(examiningAction, parlorContext);
      expectEvent(parlorEvents, 'if.event.examined', {
        params: { description: 'parlor view' },
      });

      // Move to library and examine again — same wall id, different description
      author.moveEntity(player.id, library.id);
      const libraryContext = createRealTestContext(
        examiningAction,
        world,
        createCommand(IFActions.EXAMINING, { entity: wall }),
      );
      const libraryEvents = executeWithValidation(examiningAction, libraryContext);
      expectEvent(libraryEvents, 'if.event.examined', {
        params: { description: 'library view' },
      });
    });
  });

  describe('no-description fallback', () => {
    test('emits nothing_special when the side has no description', () => {
      const { world, wall } = setupWallScenario({
        // parlorDescription deliberately omitted
        libraryDescription: 'library has prose, parlor does not',
      });

      const command = createCommand(IFActions.EXAMINING, { entity: wall });
      const context = createRealTestContext(examiningAction, world, command);

      const events = executeWithValidation(examiningAction, context);

      expectEvent(events, 'if.event.examined', {
        isWall: true,
        targetId: wall.id,
        messageId: 'if.action.examining.nothing_special',
      });
    });
  });

  describe('obstructed side', () => {
    test('renders the per-side description authored to reference the obstructor', () => {
      // Per ADR-173, the action does not introspect obstructors when
      // rendering examination prose — it just emits the per-side description
      // exactly as the author wrote it. This test pins that behavior.
      const { world, wall, obstructor } = setupWallScenario({
        parlorDescription: 'A tall mahogany bookcase covers the wall, floor to ceiling.',
        libraryDescription: 'Exposed brick.',
        obstructorInParlor: { name: 'bookcase' },
      });

      expect(obstructor).toBeDefined();

      const command = createCommand(IFActions.EXAMINING, { entity: wall });
      const context = createRealTestContext(examiningAction, world, command);

      const events = executeWithValidation(examiningAction, context);

      expectEvent(events, 'if.event.examined', {
        isWall: true,
        messageId: 'if.action.examining.examined_wall',
        params: {
          description: 'A tall mahogany bookcase covers the wall, floor to ceiling.',
        },
      });
    });
  });
});
