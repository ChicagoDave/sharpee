/**
 * NpcService — the decision layer (ADR-070; ADR-328 D5).
 *
 * The service decides WHO acts and hands each behavior a context to act
 * THROUGH; it executes nothing itself. These tests pin that seam: a
 * behavior's `context.act` reaches the execution entry with the NPC as
 * actor, the entry's events join the tick's stream in order, `narrate`
 * emits a `game.message` sourced by the NPC, and eligibility (dead,
 * unconscious, the protagonist) gates the hooks. The standard behaviors
 * are checked for the acts they choose.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NpcService,
  createNpcService,
  NpcBehavior,
  NpcContext,
  NpcMessages,
  guardBehavior,
  passiveBehavior,
  createWandererBehavior,
  createFollowerBehavior,
  type ExecutionEntry,
  type ActResult,
} from '../../../src/npc';
import { IFActions } from '../../../src/actions/constants';
import { createFixtureRandomService } from '../../test-utils/fixture-random-service';
import { IFEntity, WorldModel, TraitType, NpcTrait, HealthTrait, CombatantTrait, CombatBehavior } from '@sharpee/world-model';

// Helper to create mock entity
function createMockEntity(
  id: string,
  name: string,
  traits: Record<string, unknown> = {}
): IFEntity {
  const entity = {
    id,
    name,
    has: vi.fn((type: string) => type in traits),
    get: vi.fn((type: string) => traits[type]),
    traits,
  } as unknown as IFEntity;
  return entity;
}

// Helper to create mock world
function createMockWorld(entities: IFEntity[] = []): WorldModel {
  const entityMap = new Map(entities.map(e => [e.id, e]));

  return {
    getEntity: vi.fn((id: string) => entityMap.get(id)),
    getLocation: vi.fn().mockReturnValue('room-1'),
    getContents: vi.fn().mockReturnValue([]),
    getPlayer: vi.fn().mockReturnValue({ id: 'player' }),
    getAllEntities: vi.fn().mockReturnValue(entities),
    moveEntity: vi.fn(),
  } as unknown as WorldModel;
}

/** An execution entry that records every invocation and answers with canned events. */
function recordingEntry(result: Partial<ActResult> = {}): ExecutionEntry & { calls: Parameters<ExecutionEntry>[] } {
  const calls: Parameters<ExecutionEntry>[] = [];
  const entry = ((actorId, actionId, slots) => {
    calls.push([actorId, actionId, slots]);
    return {
      success: result.success ?? true,
      events: result.events ?? [{ id: `act-${calls.length}`, type: 'if.event.acted', timestamp: 0, entities: { actor: actorId }, data: { actionId } }],
    };
  }) as ExecutionEntry & { calls: Parameters<ExecutionEntry>[] };
  entry.calls = calls;
  return entry;
}

/** A behavior context over mocks — for exercising the standard behaviors directly. */
function behaviorContext(overrides: Partial<NpcContext> = {}): NpcContext & { entry: ReturnType<typeof recordingEntry>; narrated: unknown[] } {
  const entry = recordingEntry();
  const narrated: unknown[] = [];
  const npc = overrides.npc ?? createMockEntity('npc', 'NPC', {});
  const context = {
    npc,
    world: createMockWorld(),
    random: createFixtureRandomService(12345),
    turnCount: 1,
    playerLocation: 'room-1',
    npcLocation: 'room-1',
    npcInventory: [],
    playerVisible: true,
    getEntitiesInRoom: () => [],
    getAvailableExits: () => [],
    act: (actionId: string, slots?: Parameters<ExecutionEntry>[2]) => entry(npc.id, actionId, slots),
    narrate: (message: unknown, params?: unknown) => { narrated.push({ message, params }); },
    ...overrides,
  } as NpcContext & { entry: typeof entry; narrated: unknown[] };
  context.entry = entry;
  context.narrated = narrated;
  return context;
}

describe('NpcService', () => {
  let service: NpcService;
  let random: ReturnType<typeof createFixtureRandomService>;

  beforeEach(() => {
    service = new NpcService();
    random = createFixtureRandomService(12345);
    vi.clearAllMocks();
  });

  describe('behavior management', () => {
    it('should register a behavior', () => {
      const behavior: NpcBehavior = {
        id: 'test-behavior',
        onTurn: () => undefined,
      };

      service.registerBehavior(behavior);
      expect(service.getBehavior('test-behavior')).toBe(behavior);
    });

    it('should remove a behavior', () => {
      const behavior: NpcBehavior = {
        id: 'test-behavior',
        onTurn: () => undefined,
      };

      service.registerBehavior(behavior);
      service.removeBehavior('test-behavior');
      expect(service.getBehavior('test-behavior')).toBeUndefined();
    });

    it('should return undefined for unknown behavior', () => {
      expect(service.getBehavior('unknown')).toBeUndefined();
    });
  });

  describe('tick', () => {
    const tickWith = (world: WorldModel, act: ExecutionEntry = recordingEntry()) =>
      service.tick({ world, turn: 1, random, playerLocation: 'room-1', playerId: 'player', act });

    it('should call onTurn for active NPCs', () => {
      const onTurnFn = vi.fn();
      service.registerBehavior({ id: 'test-behavior', onTurn: onTurnFn });

      const npc = createMockEntity('npc-1', 'Guard', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'test-behavior' }),
      });
      const world = createMockWorld([npc]);

      tickWith(world);

      expect(onTurnFn).toHaveBeenCalled();
    });

    it('should not call onTurn for dead NPCs', () => {
      const onTurnFn = vi.fn();
      service.registerBehavior({ id: 'test-behavior', onTurn: onTurnFn });

      const npc = createMockEntity('npc-1', 'Dead Guard', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'test-behavior' }),
        [TraitType.HEALTH]: new HealthTrait({ dead: true, causeOfDeath: 'combat' }), // life-state (ADR-226)
      });

      tickWith(createMockWorld([npc]));

      expect(onTurnFn).not.toHaveBeenCalled();
    });

    it('should not call onTurn for unconscious NPCs', () => {
      const onTurnFn = vi.fn();
      service.registerBehavior({ id: 'test-behavior', onTurn: onTurnFn });

      const npc = createMockEntity('npc-1', 'Sleeping Guard', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'test-behavior' }),
        [TraitType.HEALTH]: new HealthTrait({ health: 1, maxHealth: 10 }), // <=20% → unconscious (ADR-226)
      });

      tickWith(createMockWorld([npc]));

      expect(onTurnFn).not.toHaveBeenCalled();
    });

    it('does not drive the character currently being played (ADR-327 D9)', () => {
      const onTurnFn = vi.fn();
      service.registerBehavior({ id: 'test-behavior', onTurn: onTurnFn });

      const npc = createMockEntity('player', 'Protagonist', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'test-behavior' }),
      });

      tickWith(createMockWorld([npc]));

      expect(onTurnFn).not.toHaveBeenCalled();
    });

    it("a behavior's act reaches the execution entry with the NPC as actor, and its events join the stream", () => {
      const lamp = createMockEntity('lamp', 'brass lamp');
      service.registerBehavior({
        id: 'taker',
        onTurn: (context) => {
          const result = context.act(IFActions.TAKING, { directObject: lamp });
          expect(result.success).toBe(true);
        },
      });
      const npc = createMockEntity('npc-1', 'Thief', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'taker' }),
      });
      const entry = recordingEntry();

      const events = tickWith(createMockWorld([npc]), entry);

      expect(entry.calls).toEqual([['npc-1', IFActions.TAKING, { directObject: lamp }]]);
      expect(events.map(e => e.type)).toEqual(['if.event.acted']);
      expect(events[0].entities.actor).toBe('npc-1');
    });

    it('a refused act comes back success: false and its refusal events still join the stream', () => {
      let seen: ActResult | undefined;
      service.registerBehavior({
        id: 'taker',
        onTurn: (context) => { seen = context.act(IFActions.TAKING); },
      });
      const npc = createMockEntity('npc-1', 'Thief', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'taker' }),
      });
      const refusal = { id: 'r', type: 'if.event.taken', timestamp: 0, entities: {}, data: { blocked: true } };

      const events = tickWith(createMockWorld([npc]), recordingEntry({ success: false, events: [refusal] }));

      expect(seen?.success).toBe(false);
      expect(events).toEqual([refusal]);
    });

    it('narrate emits one game.message sourced by the NPC at its current location, in act order', () => {
      service.registerBehavior({
        id: 'talker',
        onTurn: (context) => {
          context.act(IFActions.GOING, { direction: 'NORTH' });
          context.narrate(NpcMessages.NPC_NOTICES_PLAYER, { speaker: 'x' });
          context.narrate({ text: 'BEEP.' });
        },
      });
      const npc = createMockEntity('npc-1', 'Bot', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'talker' }),
      });
      const world = createMockWorld([npc]);
      (world.getLocation as ReturnType<typeof vi.fn>).mockReturnValue('room-2');

      const events = tickWith(world);

      expect(events.map(e => e.type)).toEqual(['if.event.acted', 'game.message', 'game.message']);
      expect(events[1].entities).toEqual({ actor: 'npc-1', location: 'room-2' });
      expect(events[1].data).toEqual({ messageId: NpcMessages.NPC_NOTICES_PLAYER, params: { speaker: 'x' } });
      expect(events[2].data).toEqual({ text: 'BEEP.' });
    });

    it('registered tick phases run after the behaviors and see the tick context', () => {
      const order: string[] = [];
      service.registerBehavior({ id: 'b', onTurn: () => { order.push('behavior'); } });
      service.registerTickPhase('phase', (npcs, ctx) => {
        order.push('phase');
        expect(npcs.map(n => n.id)).toEqual(['npc-1']);
        expect(typeof ctx.act).toBe('function');
        return [];
      });
      const npc = createMockEntity('npc-1', 'Guard', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'b' }),
      });

      tickWith(createMockWorld([npc]));

      expect(order).toEqual(['behavior', 'phase']);
    });
  });

  describe('onPlayerEnters', () => {
    it('should call onPlayerEnters for NPCs in room, with an acting context', () => {
      const onPlayerEntersFn = vi.fn((context: NpcContext) => { context.narrate({ text: 'hi' }); });
      service.registerBehavior({
        id: 'test-behavior',
        onTurn: () => undefined,
        onPlayerEnters: onPlayerEntersFn,
      });

      const npc = createMockEntity('npc-1', 'Guard', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'test-behavior' }),
      });
      const world = createMockWorld([npc]);
      (world.getContents as ReturnType<typeof vi.fn>).mockReturnValue([npc]);

      const events = service.onPlayerEnters(world, 'room-1', random, 1, recordingEntry());

      expect(onPlayerEntersFn).toHaveBeenCalled();
      expect(events.map(e => e.type)).toEqual(['game.message']);
    });
  });

  describe('onPlayerLeaves', () => {
    it('should call onPlayerLeaves for NPCs in room', () => {
      const onPlayerLeavesFn = vi.fn();
      service.registerBehavior({
        id: 'test-behavior',
        onTurn: () => undefined,
        onPlayerLeaves: onPlayerLeavesFn,
      });

      const npc = createMockEntity('npc-1', 'Guard', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'test-behavior' }),
      });
      const world = createMockWorld([npc]);
      (world.getContents as ReturnType<typeof vi.fn>).mockReturnValue([npc]);

      service.onPlayerLeaves(world, 'room-1', random, 1, recordingEntry());

      expect(onPlayerLeavesFn).toHaveBeenCalled();
    });
  });
});

describe('standard behaviors', () => {
  describe('guardBehavior', () => {
    it('does nothing on its turn while not hostile', () => {
      const context = behaviorContext({ npc: createMockEntity('guard', 'Guard', {}) });

      guardBehavior.onTurn(context);

      expect(context.entry.calls).toHaveLength(0);
      expect(context.narrated).toHaveLength(0);
    });

    it('attacks the visible player each turn while hostile — a real attacking action as the guard', () => {
      const context = behaviorContext({
        npc: createMockEntity('guard', 'Guard', {
          [TraitType.COMBATANT]: new CombatantTrait({ hostile: true }),
        }),
      });

      guardBehavior.onTurn(context);

      expect(context.entry.calls).toEqual([['guard', IFActions.ATTACKING, { directObject: { id: 'player' } }]]);
    });

    it('narrates its blocking line when the player enters', () => {
      const context = behaviorContext({ npc: createMockEntity('guard', 'Guard', {}) });

      guardBehavior.onPlayerEnters!(context);

      expect(context.narrated).toHaveLength(1);
      expect((context.narrated[0] as { message: string }).message).toBe(NpcMessages.GUARD_BLOCKS);
      expect(context.entry.calls).toHaveLength(0);
    });
  });

  describe('passiveBehavior', () => {
    it('does nothing on turn', () => {
      const context = behaviorContext();

      passiveBehavior.onTurn(context);

      expect(context.entry.calls).toHaveLength(0);
      expect(context.narrated).toHaveLength(0);
    });
  });

  describe('wandererBehavior', () => {
    it('goes through an available exit — a real going action as the wanderer', () => {
      const wanderer = createWandererBehavior({ moveChance: 1.0 }); // Always move
      const context = behaviorContext({
        npc: createMockEntity('npc', 'Wanderer', {}),
        playerLocation: 'room-2',
        playerVisible: false,
        getAvailableExits: () => [{ direction: 'north' as const, destination: 'room-2' }],
      });

      wanderer.onTurn(context);

      expect(context.entry.calls).toEqual([['npc', IFActions.GOING, { direction: 'north' }]]);
    });

    it('does not act when there are no exits', () => {
      const wanderer = createWandererBehavior({ moveChance: 1.0 });
      const context = behaviorContext({
        npc: createMockEntity('npc', 'Wanderer', {}),
        playerLocation: 'room-2',
        playerVisible: false,
        getAvailableExits: () => [],
      });

      wanderer.onTurn(context);

      expect(context.entry.calls).toHaveLength(0);
    });
  });

  describe('followerBehavior', () => {
    it('follows the player through the exit they took and narrates only when the step succeeded', () => {
      const follower = createFollowerBehavior();
      const context = behaviorContext({
        npc: createMockEntity('npc', 'Dog', {}),
        playerLocation: 'room-2',
        playerVisible: false,
        getAvailableExits: () => [{ direction: 'east' as const, destination: 'room-2' }],
      });

      follower.onPlayerLeaves!(context);

      expect(context.entry.calls).toEqual([['npc', IFActions.GOING, { direction: 'east' }]]);
      expect(context.narrated).toHaveLength(1);
      expect((context.narrated[0] as { message: string }).message).toBe(NpcMessages.NPC_FOLLOWS);
    });

    it('stays silent when the world refused the step', () => {
      const follower = createFollowerBehavior();
      const refused = recordingEntry({ success: false, events: [] });
      const context = behaviorContext({
        npc: createMockEntity('npc', 'Dog', {}),
        playerLocation: 'room-2',
        playerVisible: false,
        getAvailableExits: () => [{ direction: 'east' as const, destination: 'room-2' }],
        act: (actionId, slots) => refused('npc', actionId, slots),
      });

      follower.onPlayerLeaves!(context);

      expect(refused.calls).toHaveLength(1);
      expect(context.narrated).toHaveLength(0);
    });
  });
});

describe('createNpcService', () => {
  it('should create an NPC service', () => {
    const service = createNpcService();
    expect(service).toBeDefined();
    expect(service.registerBehavior).toBeDefined();
    expect(service.tick).toBeDefined();
  });
});

describe('ADR-226 AC-2: a combat kill removes the NPC from the turn loop', () => {
  it('stops calling onTurn once the NPC is killed via combat (one health source, no sync bug)', () => {
    const service = new NpcService();
    const random = createFixtureRandomService(12345);
    const onTurnFn = vi.fn();
    service.registerBehavior({ id: 'fighter', onTurn: onTurnFn });

    // NPC carries the daemon (NpcTrait), combat stats (CombatantTrait), and
    // life-state (HealthTrait) — the three formerly-fused layers.
    const npc = createMockEntity('npc-1', 'Troll', {
      [TraitType.NPC]: new NpcTrait({ behaviorId: 'fighter' }),
      [TraitType.COMBATANT]: new CombatantTrait({ armor: 0, dropsInventory: false }),
      [TraitType.HEALTH]: new HealthTrait({ health: 10, maxHealth: 10 }),
    });

    const world = createMockWorld([npc]);
    const tickOnce = () =>
      service.tick({ world, turn: 1, random, playerLocation: 'room-1', playerId: 'player', act: recordingEntry() });

    // Alive: the daemon runs this turn.
    tickOnce();
    expect(onTurnFn).toHaveBeenCalledTimes(1);

    // Kill through the combat path — writes HealthTrait.dead, the SAME trait turn
    // eligibility reads. Before ADR-226 this set CombatantTrait.isAlive only, while the
    // turn loop read NpcTrait.isAlive, so the "dead" NPC kept taking turns (the sync bug).
    const result = CombatBehavior.attack(npc, 100, world);
    expect(result.killed).toBe(true);
    expect((npc.get(TraitType.HEALTH) as HealthTrait).dead).toBe(true);

    // Dead: the daemon no longer runs — onTurn is not called again.
    onTurnFn.mockClear();
    tickOnce();
    expect(onTurnFn).not.toHaveBeenCalled();
  });
});
