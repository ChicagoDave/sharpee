/**
 * Going action × computed exits (ADR-295).
 *
 * Covers the ADR's stdlib acceptance criteria:
 * - A2: validate executes no resolver code (repeated probing draws nothing)
 * - A5: a blocked resolution leaves the actor's location unchanged
 * - A7: declared-but-unresolvable directions refuse, never crash
 * - A8: event data carries the room actually departed under a redirect
 * Plus: redirect world-state, narration forwarding order, computed-only
 * existence, and the D7 destination-slot posture (no entering_room
 * consultation for computed directions).
 *
 * The declaring trait is synthetic — never a real story trait.
 */

import { describe, test, expect, vi, afterEach } from 'vitest';
import { goingAction } from '../../../src/actions/standard/going';
import { IFActions } from '../../../src/actions/constants';
import {
  TraitType,
  Direction,
  RoomTrait,
  IFEntity,
  WorldModel,
  type ExitResolver
} from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  executeWithValidation,
  createCommand,
  TEST_MARKER_TRAIT
} from '../../test-utils';

const CARRIER_TYPE = 'test.scrambled_exits';

interface ComputedExitFixture {
  world: WorldModel;
  player: IFEntity;
  room: IFEntity;
  staticDestination: IFEntity;
  redirectDestination: IFEntity;
}

/**
 * room --north(static)--> staticDestination, plus a third room reachable
 * only through resolution. The carrier trait is added per-test.
 */
function setupComputedExitWorld(): ComputedExitFixture {
  const { world, player, room } = setupBasicWorld();

  const staticDestination = world.createEntity('Static Destination', 'object');
  staticDestination.add({ type: TraitType.ROOM });
  const redirectDestination = world.createEntity('Redirect Destination', 'object');
  redirectDestination.add({ type: TraitType.ROOM });

  const roomTrait = room.getTrait(RoomTrait)!;
  roomTrait.exits = {
    [Direction.NORTH]: { destination: staticDestination.id }
  };

  return { world, player, room, staticDestination, redirectDestination };
}

function addCarrier(
  room: IFEntity,
  declaration:
    | { computedExitsAll: { candidates: string[] } }
    | { computedExits: Record<string, { candidates: string[] }> }
): void {
  room.add({ type: CARRIER_TYPE, ...declaration } as any);
}

function goNorth(world: WorldModel) {
  const command = createCommand(IFActions.GOING);
  command.parsed.extras = { direction: Direction.NORTH };
  return createRealTestContext(goingAction, world, command);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('goingAction × computed exits (ADR-295)', () => {
  test('redirect: actor lands in the resolved room, not the static destination (world state)', () => {
    const { world, player, room, staticDestination, redirectDestination } = setupComputedExitWorld();
    addCarrier(room, {
      computedExitsAll: { candidates: [staticDestination.id, redirectDestination.id] }
    });
    world.registerExitResolver(CARRIER_TYPE, () => ({
      kind: 'exit',
      destination: redirectDestination.id
    }));

    const context = goNorth(world);
    const events = executeWithValidation(goingAction, context);

    // THE mutation assertion: the player is where the RESOLVER said.
    expect(world.getLocation(player.id)).toBe(redirectDestination.id);
    expectEvent(events, 'if.event.room.description', {
      roomId: redirectDestination.id
    });
  });

  test('A8: actor_moved carries fromRoom = the room actually departed, under a redirect', () => {
    const { world, room, staticDestination, redirectDestination } = setupComputedExitWorld();
    addCarrier(room, {
      computedExitsAll: { candidates: [staticDestination.id, redirectDestination.id] }
    });
    world.registerExitResolver(CARRIER_TYPE, () => ({
      kind: 'exit',
      destination: redirectDestination.id
    }));

    const events = executeWithValidation(goingAction, goNorth(world));

    // The old reverse topology scan had no answer here (no static exit leads
    // north to the redirect room) and silently reported the arrival room.
    expectEvent(events, 'if.event.actor_moved', {
      fromRoom: room.id,
      toRoom: redirectDestination.id
    });
    expectEvent(events, 'if.event.actor_entered', {
      fromRoom: room.id
    });
  });

  test('narration events are forwarded verbatim, ahead of the arrival description', () => {
    const { world, room, staticDestination, redirectDestination } = setupComputedExitWorld();
    addCarrier(room, {
      computedExitsAll: { candidates: [staticDestination.id, redirectDestination.id] }
    });
    const narration = {
      id: 'test-narration-1',
      type: 'game.message',
      timestamp: 0,
      entities: {},
      data: { messageId: 'test.cannot_get_bearings' },
      narrate: true
    };
    world.registerExitResolver(CARRIER_TYPE, () => ({
      kind: 'exit',
      destination: redirectDestination.id,
      events: [narration]
    }));

    const events = executeWithValidation(goingAction, goNorth(world));

    const narrationIndex = events.findIndex(e => e.id === 'test-narration-1');
    const descriptionIndex = events.findIndex(e => e.type === 'if.event.room.description');
    expect(narrationIndex).toBeGreaterThanOrEqual(0);
    expect(descriptionIndex).toBeGreaterThanOrEqual(0);
    expect(narrationIndex).toBeLessThan(descriptionIndex);
    expect(events[narrationIndex].data).toEqual({ messageId: 'test.cannot_get_bearings' });
  });

  test('A5: blocked resolution — actor location unchanged, no movement events, resolver messageId emitted', () => {
    const { world, player, room, staticDestination, redirectDestination } = setupComputedExitWorld();
    addCarrier(room, {
      computedExitsAll: { candidates: [staticDestination.id, redirectDestination.id] }
    });
    world.registerExitResolver(CARRIER_TYPE, () => ({
      kind: 'blocked',
      messageId: 'test.exit_blocked',
      params: { flavor: 'magnetic' }
    }));

    const context = goNorth(world);
    const events = executeWithValidation(goingAction, context);

    // World-state assertion, not message-only (ADR-295 Acceptance 5).
    expect(world.getLocation(player.id)).toBe(room.id);
    expect(events.find(e => e.type === 'if.event.actor_moved')).toBeUndefined();
    expect(events.find(e => e.type === 'if.event.actor_exited')).toBeUndefined();
    expect(events.find(e => e.type === 'if.event.room.description')).toBeUndefined();
    expectEvent(events, 'if.event.went', {
      messageId: 'test.exit_blocked',
      blocked: true
    });
  });

  test('A2: validate executes no resolver code, no matter how often it runs', () => {
    const { world, room, staticDestination, redirectDestination } = setupComputedExitWorld();
    addCarrier(room, {
      computedExitsAll: { candidates: [staticDestination.id, redirectDestination.id] }
    });
    const resolver = vi.fn<ExitResolver>(() => ({
      kind: 'exit',
      destination: redirectDestination.id
    }));
    world.registerExitResolver(CARRIER_TYPE, resolver);

    const context = goNorth(world);
    for (let probe = 0; probe < 3; probe++) {
      expect(goingAction.validate(context).valid).toBe(true);
    }
    expect(resolver).not.toHaveBeenCalled();

    // One full command = exactly one resolution (ADR-295 D5).
    executeWithValidation(goingAction, goNorth(world));
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  test('computed-only existence: a declared direction with no static exit validates and traverses', () => {
    const { world, player, room, redirectDestination } = setupComputedExitWorld();
    addCarrier(room, {
      computedExits: { [Direction.EAST]: { candidates: [redirectDestination.id] } }
    });
    world.registerExitResolver(CARRIER_TYPE, () => ({
      kind: 'exit',
      destination: redirectDestination.id
    }));

    const command = createCommand(IFActions.GOING);
    command.parsed.extras = { direction: Direction.EAST };
    const context = createRealTestContext(goingAction, world, command);

    expect(goingAction.validate(context).valid).toBe(true);
    executeWithValidation(goingAction, context);
    expect(world.getLocation(player.id)).toBe(redirectDestination.id);
  });

  test('A7: declared but unregistered, with a static exit — warns and falls back to static topology', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { world, player, room, staticDestination, redirectDestination } = setupComputedExitWorld();
    addCarrier(room, {
      computedExitsAll: { candidates: [staticDestination.id, redirectDestination.id] }
    });
    // No registerExitResolver call — the wiring defect.

    const events = executeWithValidation(goingAction, goNorth(world));

    expect(world.getLocation(player.id)).toBe(staticDestination.id);
    expectEvent(events, 'if.event.actor_moved', { toRoom: staticDestination.id });
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain('no resolver is registered');
  });

  test('A7: computed-only and unregistered — standard refusal, no movement, no crash', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { world, player, room, redirectDestination } = setupComputedExitWorld();
    addCarrier(room, {
      computedExits: { [Direction.EAST]: { candidates: [redirectDestination.id] } }
    });
    // No registerExitResolver call, and EAST has no static exit.

    const command = createCommand(IFActions.GOING);
    command.parsed.extras = { direction: Direction.EAST };
    const context = createRealTestContext(goingAction, world, command);

    const events = executeWithValidation(goingAction, context);

    expect(world.getLocation(player.id)).toBe(room.id);
    expect(events.find(e => e.type === 'if.event.actor_moved')).toBeUndefined();
    expectEvent(events, 'if.event.went', {
      messageId: `${IFActions.GOING}.no_exit_that_way`,
      blocked: true
    });
    expect(warnSpy).toHaveBeenCalled();
  });

  test('D7: entering_room interceptors on a computed candidate are NOT consulted', () => {
    const { world, player, room, staticDestination, redirectDestination } = setupComputedExitWorld();
    addCarrier(room, {
      computedExitsAll: { candidates: [staticDestination.id, redirectDestination.id] }
    });
    world.registerExitResolver(CARRIER_TYPE, () => ({
      kind: 'exit',
      destination: redirectDestination.id
    }));

    // Guard on the room the resolver will actually pick.
    redirectDestination.add({ type: TEST_MARKER_TRAIT } as any);
    const preValidate = vi.fn(() => null);
    const postReport = vi.fn(() => undefined);
    world.registerActionInterceptor(TEST_MARKER_TRAIT, 'if.action.entering_room', {
      preValidate,
      postReport
    } as any);

    executeWithValidation(goingAction, goNorth(world));

    // The traversal happened...
    expect(world.getLocation(player.id)).toBe(redirectDestination.id);
    // ...but the destination slot resolved to no entity, so no hook fired.
    expect(preValidate).not.toHaveBeenCalled();
    expect(postReport).not.toHaveBeenCalled();
  });

  test('vehicle traversal: a computed-exit redirect moves the VEHICLE; the player rides along', () => {
    const { world, player, room, staticDestination, redirectDestination } = setupComputedExitWorld();
    addCarrier(room, {
      computedExitsAll: { candidates: [staticDestination.id, redirectDestination.id] }
    });
    world.registerExitResolver(CARRIER_TYPE, () => ({
      kind: 'exit',
      destination: redirectDestination.id
    }));

    const boat = world.createEntity('magic boat', 'object');
    boat.add({ type: TraitType.VEHICLE, blocksWalkingMovement: false } as any);
    boat.add({ type: TraitType.CONTAINER, enterable: true } as any);
    world.moveEntity(boat.id, room.id);
    world.moveEntity(player.id, boat.id);

    executeWithValidation(goingAction, goNorth(world));

    // The vehicle lands where the resolver said; the player never left it.
    expect(world.getLocation(boat.id)).toBe(redirectDestination.id);
    expect(world.getLocation(player.id)).toBe(boat.id);
  });

  test('static rooms are untouched: no carrier trait means no resolver consultation', () => {
    const { world, player, staticDestination } = setupComputedExitWorld();
    const resolver = vi.fn<ExitResolver>(() => ({
      kind: 'exit',
      destination: 'never'
    }));
    world.registerExitResolver(CARRIER_TYPE, resolver);
    // Room has no carrier trait.

    executeWithValidation(goingAction, goNorth(world));

    expect(world.getLocation(player.id)).toBe(staticDestination.id);
    expect(resolver).not.toHaveBeenCalled();
  });
});
