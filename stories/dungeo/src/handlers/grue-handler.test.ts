/**
 * Tests for the grue death transformer (ADR-227 Phase 1).
 *
 * Verifies the FORTRAN WALK semantics (verbs.f:1846-1897) survive the
 * seeded-RNG injection unchanged, and that the injected SeededRandom makes
 * the live/die sequence deterministic under a fixed seed:
 * - lit room: no grue check at all
 * - dark room, 25% survival roll: command passes through
 * - grue path (75%): invalid exit -> death (walked_into), blocked exit ->
 *   death (slithered), dark destination -> death (walked_into), lit
 *   destination -> survive
 * - GDT immortality: no grue check
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorldModel,
  IParsedCommand,
  RoomTrait,
  OpenableTrait,
  EntityType
} from '@sharpee/world-model';
import { SeededRandom, createSeededRandom } from '@sharpee/core';
import { createGrueDeathTransformer } from './grue-handler';
import { GRUE_DEATH_ACTION_ID } from '../actions/grue-death/types';
import { getGDTFlags, setGDTFlags } from '../actions/gdt/gdt-context';

/** Minimal parsed `going` command for transformer input. */
function goCommand(direction: string): IParsedCommand {
  return {
    rawInput: `go ${direction}`,
    tokens: [],
    structure: {
      verb: { tokens: [0], text: 'go', head: 'go' }
    },
    pattern: 'VERB_NOUN',
    confidence: 1,
    action: 'if.action.going',
    extras: { direction }
  } as unknown as IParsedCommand;
}

/** RNG stub forcing the grue path (survival roll always fails). */
const alwaysGruePath: SeededRandom = {
  next: () => 0.9,
  int: (min: number) => min,
  chance: () => false,
  pick: <T>(arr: T[]) => arr[0],
  shuffle: <T>(arr: T[]) => arr,
  getSeed: () => 0,
  setSeed: () => {}
};

/** RNG stub forcing survival (roll always passes). */
const alwaysSurvive: SeededRandom = { ...alwaysGruePath, chance: () => true };

describe('createGrueDeathTransformer', () => {
  let world: WorldModel;
  let darkRoom: ReturnType<WorldModel['createEntity']>;
  let darkDest: ReturnType<WorldModel['createEntity']>;
  let litDest: ReturnType<WorldModel['createEntity']>;
  let door: ReturnType<WorldModel['createEntity']>;
  let player: ReturnType<WorldModel['createEntity']>;

  beforeEach(() => {
    world = new WorldModel();

    darkDest = world.createEntity('Dark Destination', EntityType.ROOM);
    darkDest.add(new RoomTrait({ exits: {}, requiresLight: true }));

    litDest = world.createEntity('Lit Destination', EntityType.ROOM);
    litDest.add(new RoomTrait({ exits: {}, requiresLight: false }));

    door = world.createEntity('door', EntityType.DOOR);
    door.add(new OpenableTrait({ isOpen: false }));

    darkRoom = world.createEntity('Dark Room', EntityType.ROOM);
    darkRoom.add(new RoomTrait({
      exits: {
        EAST: { destination: darkDest.id },
        WEST: { destination: litDest.id },
        NORTH: { destination: darkDest.id, via: door.id }
        // no SOUTH exit — invalid direction
      },
      requiresLight: true
    }));

    player = world.createEntity('player', EntityType.ACTOR);
    player.add({ type: 'actor' });
    world.moveEntity(player.id, darkRoom.id);
    world.setPlayer(player.id);
  });

  it('is deterministic under a fixed seed: same seed reproduces the same live/die sequence', () => {
    const runSequence = (seed: number): string[] => {
      const transformer = createGrueDeathTransformer(createSeededRandom(seed));
      const outcomes: string[] = [];
      for (let i = 0; i < 30; i++) {
        outcomes.push(transformer(goCommand('south'), world).action);
      }
      return outcomes;
    };

    const first = runSequence(42);
    const second = runSequence(42);

    expect(second).toEqual(first);
    // Non-vacuous: the fixed-seed sequence contains both outcomes
    expect(first).toContain(GRUE_DEATH_ACTION_ID);
    expect(first).toContain('if.action.going');
  });

  it('never intercepts in a lit room', () => {
    world.moveEntity(player.id, litDest.id);
    const transformer = createGrueDeathTransformer(alwaysGruePath);

    const result = transformer(goCommand('east'), world);
    expect(result.action).toBe('if.action.going');
    expect(result.extras?.grueDeathType).toBeUndefined();
  });

  it('passes through on a successful survival roll', () => {
    const transformer = createGrueDeathTransformer(alwaysSurvive);

    const result = transformer(goCommand('south'), world);
    expect(result.action).toBe('if.action.going');
  });

  it('grue path: invalid exit redirects to death (walked_into)', () => {
    const transformer = createGrueDeathTransformer(alwaysGruePath);

    const result = transformer(goCommand('south'), world);
    expect(result.action).toBe(GRUE_DEATH_ACTION_ID);
    expect(result.extras?.grueDeathType).toBe('walked_into');
    expect(result.extras?.reason).toBe('invalid_exit');
  });

  it('grue path: blocked exit (closed door) redirects to death (slithered)', () => {
    const transformer = createGrueDeathTransformer(alwaysGruePath);

    const result = transformer(goCommand('north'), world);
    expect(result.action).toBe(GRUE_DEATH_ACTION_ID);
    expect(result.extras?.grueDeathType).toBe('slithered');
    expect(result.extras?.reason).toBe('blocked_exit');
  });

  it('grue path: dark destination redirects to death (walked_into)', () => {
    const transformer = createGrueDeathTransformer(alwaysGruePath);

    const result = transformer(goCommand('east'), world);
    expect(result.action).toBe(GRUE_DEATH_ACTION_ID);
    expect(result.extras?.grueDeathType).toBe('walked_into');
    expect(result.extras?.reason).toBe('dark_destination');
  });

  it('grue path: lit destination survives', () => {
    const transformer = createGrueDeathTransformer(alwaysGruePath);

    const result = transformer(goCommand('west'), world);
    expect(result.action).toBe('if.action.going');
    expect(result.extras?.grueDeathType).toBeUndefined();
  });

  it('GDT immortality bypasses the grue entirely', () => {
    setGDTFlags(world, { ...getGDTFlags(world), immortal: true });
    const transformer = createGrueDeathTransformer(alwaysGruePath);

    const result = transformer(goCommand('east'), world);
    expect(result.action).toBe('if.action.going');
  });

  it('non-going actions are never intercepted', () => {
    const transformer = createGrueDeathTransformer(alwaysGruePath);

    const waitCommand = {
      ...goCommand('east'),
      action: 'if.action.waiting',
      extras: {}
    } as IParsedCommand;

    const result = transformer(waitCommand, world);
    expect(result.action).toBe('if.action.waiting');
  });
});
