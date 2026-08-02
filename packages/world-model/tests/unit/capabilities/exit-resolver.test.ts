/**
 * Tests for computed exits (ADR-295): per-world exit-resolver bindings,
 * declaration-only existence, and traversal-time resolution.
 *
 * Same isolation posture as the interceptor-binding tests: the resolver map
 * is owned by each WorldModel instance, so a fresh `world` per test needs no
 * registry cleanup. The declaring trait is synthetic (never a real story
 * trait — test-story isolation).
 */

import { vi, type MockInstance } from 'vitest';
import { IFEntity } from '../../../src/entities/if-entity';
import { AuthorModel } from '../../../src/world/AuthorModel';
import { ITrait } from '../../../src/traits/trait';
import { WorldModel } from '../../../src/world/WorldModel';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { RoomBehavior } from '../../../src/traits/room/roomBehavior';
import {
  IComputedExitDeclaration,
  isComputedExitCarrier
} from '../../../src/traits/room/computedExitContract';
import type {
  ExitResolver,
  ExitResolverContext
} from '../../../src/capabilities';
import { Direction, DirectionType } from '../../../src/constants/directions';
import type { RandomService } from '@sharpee/core';

// Synthetic declaring trait — carries either declaration form via data.
class ScrambledExitsTrait implements ITrait {
  static readonly type = 'test.scrambled_exits';
  readonly type = 'test.scrambled_exits';
  computedExits?: Partial<Record<DirectionType, IComputedExitDeclaration>>;
  computedExitsAll?: IComputedExitDeclaration;

  constructor(data: {
    computedExits?: Partial<Record<DirectionType, IComputedExitDeclaration>>;
    computedExitsAll?: IComputedExitDeclaration;
  }) {
    this.computedExits = data.computedExits;
    this.computedExitsAll = data.computedExitsAll;
  }
}

class UnrelatedTrait implements ITrait {
  static readonly type = 'test.unrelated';
  readonly type = 'test.unrelated';
}

const CANDIDATES = ['room-machine', 'room-tea'];

function makeRoom(options: {
  staticExits?: Partial<Record<DirectionType, { destination: string }>>;
  trait?: ScrambledExitsTrait;
}): IFEntity {
  const room = new IFEntity('room-low', 'room');
  room.add(new RoomTrait({ exits: options.staticExits ?? {} }));
  if (options.trait) {
    room.add(options.trait);
  }
  return room;
}

function makeContext(world: WorldModel): ExitResolverContext {
  // Resolvers under test never draw; the service is a typed placeholder.
  return {
    world,
    actorId: 'player-1',
    random: {} as unknown as RandomService
  };
}

describe('isComputedExitCarrier (ADR-295 D3)', () => {
  it('detects both declaration forms and rejects non-carriers', () => {
    expect(
      isComputedExitCarrier(
        new ScrambledExitsTrait({ computedExitsAll: { candidates: CANDIDATES } })
      )
    ).toBe(true);
    expect(
      isComputedExitCarrier(
        new ScrambledExitsTrait({
          computedExits: { [Direction.EAST]: { candidates: CANDIDATES } }
        })
      )
    ).toBe(true);
    expect(isComputedExitCarrier(new UnrelatedTrait())).toBe(false);
  });
});

describe('WorldModel exit-resolver bindings (ADR-295 D4)', () => {
  const resolverA: ExitResolver = () => ({ kind: 'exit', destination: 'room-machine' });
  const resolverB: ExitResolver = () => ({ kind: 'exit', destination: 'room-tea' });

  it('registers and looks up a resolver by trait type', () => {
    const world = new WorldModel();
    world.registerExitResolver(ScrambledExitsTrait.type, resolverA);

    expect(world.getExitResolver(ScrambledExitsTrait.type)).toBe(resolverA);
    expect(world.getExitResolver(UnrelatedTrait.type)).toBeUndefined();
  });

  it('overwrites on re-registration (idempotent last-wins), never throws', () => {
    const world = new WorldModel();
    world.registerExitResolver(ScrambledExitsTrait.type, resolverA);
    expect(() => world.registerExitResolver(ScrambledExitsTrait.type, resolverB)).not.toThrow();

    expect(world.getExitResolver(ScrambledExitsTrait.type)).toBe(resolverB);
    expect(world.getAllExitResolvers().size).toBe(1);
  });

  it('scopes bindings per world instance', () => {
    const worldOne = new WorldModel();
    const worldTwo = new WorldModel();
    worldOne.registerExitResolver(ScrambledExitsTrait.type, resolverA);

    expect(worldOne.getExitResolver(ScrambledExitsTrait.type)).toBe(resolverA);
    expect(worldTwo.getExitResolver(ScrambledExitsTrait.type)).toBeUndefined();
  });

  it('reflects the live per-world map through the AuthorModel delegate', () => {
    const world = new WorldModel();
    const author = new AuthorModel(world.getDataStore(), world);

    author.registerExitResolver(ScrambledExitsTrait.type, resolverA);

    // Same live map, not a copy: visible through both surfaces.
    expect(world.getExitResolver(ScrambledExitsTrait.type)).toBe(resolverA);
    expect(author.getExitResolver(ScrambledExitsTrait.type)).toBe(resolverA);
    expect(author.getAllExitResolvers().size).toBe(1);
  });
});

describe('RoomBehavior.getComputedExitDeclaration (ADR-295 D3 — existence is declaration alone)', () => {
  it('per-direction declaration governs its direction with NO static exit and NO registered resolver', () => {
    const room = makeRoom({
      trait: new ScrambledExitsTrait({
        computedExits: { [Direction.EAST]: { candidates: CANDIDATES } }
      })
    });

    const found = RoomBehavior.getComputedExitDeclaration(room, Direction.EAST);
    expect(found).not.toBeNull();
    expect(found!.declaration.candidates).toEqual(CANDIDATES);
    expect(found!.trait.type).toBe(ScrambledExitsTrait.type);
  });

  it('returns null for a direction the per-direction form does not declare', () => {
    const room = makeRoom({
      trait: new ScrambledExitsTrait({
        computedExits: { [Direction.EAST]: { candidates: CANDIDATES } }
      })
    });

    expect(RoomBehavior.getComputedExitDeclaration(room, Direction.NORTH)).toBeNull();
  });

  it('overlay form governs statically-exposed directions only (adds no existence)', () => {
    const room = makeRoom({
      staticExits: { [Direction.EAST]: { destination: 'room-machine' } },
      trait: new ScrambledExitsTrait({ computedExitsAll: { candidates: CANDIDATES } })
    });

    expect(RoomBehavior.getComputedExitDeclaration(room, Direction.EAST)).not.toBeNull();
    expect(RoomBehavior.getComputedExitDeclaration(room, Direction.NORTH)).toBeNull();
  });

  it('returns null when the room has no carrier trait', () => {
    const room = makeRoom({
      staticExits: { [Direction.EAST]: { destination: 'room-machine' } }
    });

    expect(RoomBehavior.getComputedExitDeclaration(room, Direction.EAST)).toBeNull();
  });
});

describe('RoomBehavior.resolveExit (ADR-295 D2/D4)', () => {
  let warnSpy: MockInstance;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('dispatches to the registered resolver with room, trait, direction, staticExit, ctx and returns its resolution', () => {
    const world = new WorldModel();
    const trait = new ScrambledExitsTrait({ computedExitsAll: { candidates: CANDIDATES } });
    const room = makeRoom({
      staticExits: { [Direction.EAST]: { destination: 'room-machine' } },
      trait
    });
    const ctx = makeContext(world);

    const resolver = vi.fn<ExitResolver>(() => ({ kind: 'exit', destination: 'room-tea' }));
    world.registerExitResolver(ScrambledExitsTrait.type, resolver);

    const resolution = RoomBehavior.resolveExit(room, Direction.EAST, ctx);

    expect(resolution).toEqual({ kind: 'exit', destination: 'room-tea' });
    expect(resolver).toHaveBeenCalledTimes(1);
    const [gotRoom, gotTrait, gotDirection, gotStaticExit, gotCtx] = resolver.mock.calls[0];
    expect(gotRoom).toBe(room);
    expect(gotTrait).toBe(trait);
    expect(gotDirection).toBe(Direction.EAST);
    expect(gotStaticExit?.destination).toBe('room-machine');
    expect(gotCtx).toBe(ctx);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('passes staticExit as null for a per-direction computed exit with no static entry', () => {
    const world = new WorldModel();
    const room = makeRoom({
      trait: new ScrambledExitsTrait({
        computedExits: { [Direction.EAST]: { candidates: CANDIDATES } }
      })
    });

    const resolver = vi.fn<ExitResolver>(() => ({ kind: 'exit', destination: 'room-machine' }));
    world.registerExitResolver(ScrambledExitsTrait.type, resolver);

    RoomBehavior.resolveExit(room, Direction.EAST, makeContext(world));
    expect(resolver.mock.calls[0][3]).toBeNull();
  });

  it('returns undefined silently when no declaration governs the direction', () => {
    const world = new WorldModel();
    const room = makeRoom({
      staticExits: { [Direction.EAST]: { destination: 'room-machine' } }
    });
    world.registerExitResolver(ScrambledExitsTrait.type, () => ({
      kind: 'exit',
      destination: 'room-tea'
    }));

    expect(RoomBehavior.resolveExit(room, Direction.EAST, makeContext(world))).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns and falls back to static (undefined) when declared but no resolver is registered — ADR-295 Acceptance 7', () => {
    const world = new WorldModel();
    const room = makeRoom({
      trait: new ScrambledExitsTrait({
        computedExits: { [Direction.EAST]: { candidates: CANDIDATES } }
      })
    });

    expect(RoomBehavior.resolveExit(room, Direction.EAST, makeContext(world))).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('no resolver is registered');
  });

  it('warns but honors an off-candidate destination — ADR-295 Acceptance 6', () => {
    const world = new WorldModel();
    const room = makeRoom({
      trait: new ScrambledExitsTrait({
        computedExits: { [Direction.EAST]: { candidates: CANDIDATES } }
      })
    });
    world.registerExitResolver(ScrambledExitsTrait.type, () => ({
      kind: 'exit',
      destination: 'room-elsewhere'
    }));

    const resolution = RoomBehavior.resolveExit(room, Direction.EAST, makeContext(world));

    expect(resolution).toEqual({ kind: 'exit', destination: 'room-elsewhere' });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('outside the declared candidate set');
  });

  it('passes through a blocked resolution unchanged', () => {
    const world = new WorldModel();
    const room = makeRoom({
      trait: new ScrambledExitsTrait({
        computedExits: { [Direction.EAST]: { candidates: CANDIDATES } }
      })
    });
    world.registerExitResolver(ScrambledExitsTrait.type, () => ({
      kind: 'blocked',
      messageId: 'test.exit_blocked'
    }));

    expect(RoomBehavior.resolveExit(room, Direction.EAST, makeContext(world))).toEqual({
      kind: 'blocked',
      messageId: 'test.exit_blocked'
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('returns undefined (defer to static) when the resolver itself defers, without warning', () => {
    const world = new WorldModel();
    const room = makeRoom({
      staticExits: { [Direction.EAST]: { destination: 'room-machine' } },
      trait: new ScrambledExitsTrait({ computedExitsAll: { candidates: CANDIDATES } })
    });
    world.registerExitResolver(ScrambledExitsTrait.type, () => undefined);

    expect(RoomBehavior.resolveExit(room, Direction.EAST, makeContext(world))).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
