/**
 * Tests for NpcService (ADR-070)
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
} from '../../../src/npc';
import { createSeededRandom } from '@sharpee/core';
import { IFEntity, WorldModel, TraitType, NpcTrait, RoomTrait, Direction, EntityType } from '@sharpee/world-model';

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

describe('NpcService', () => {
  let service: NpcService;
  let random: ReturnType<typeof createSeededRandom>;

  beforeEach(() => {
    service = new NpcService();
    random = createSeededRandom(12345);
    vi.clearAllMocks();
  });

  describe('behavior management', () => {
    it('should register a behavior', () => {
      const behavior: NpcBehavior = {
        id: 'test-behavior',
        onTurn: () => [],
      };

      service.registerBehavior(behavior);
      expect(service.getBehavior('test-behavior')).toBe(behavior);
    });

    it('should remove a behavior', () => {
      const behavior: NpcBehavior = {
        id: 'test-behavior',
        onTurn: () => [],
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
    it('should call onTurn for active NPCs', () => {
      const onTurnFn = vi.fn().mockReturnValue([]);

      service.registerBehavior({
        id: 'test-behavior',
        onTurn: onTurnFn,
      });

      const npc = createMockEntity('npc-1', 'Guard', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'test-behavior' }),
      });

      const world = createMockWorld([npc]);
      (world.getAllEntities as ReturnType<typeof vi.fn>).mockReturnValue([npc]);

      service.tick({
        world,
        turn: 1,
        random,
        playerLocation: 'room-1',
        playerId: 'player',
      });

      expect(onTurnFn).toHaveBeenCalled();
    });

    it('should not call onTurn for dead NPCs', () => {
      const onTurnFn = vi.fn().mockReturnValue([]);

      service.registerBehavior({
        id: 'test-behavior',
        onTurn: onTurnFn,
      });

      const npc = createMockEntity('npc-1', 'Dead Guard', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'test-behavior', isAlive: false }),
      });

      const world = createMockWorld([npc]);
      (world.getAllEntities as ReturnType<typeof vi.fn>).mockReturnValue([npc]);

      service.tick({
        world,
        turn: 1,
        random,
        playerLocation: 'room-1',
        playerId: 'player',
      });

      expect(onTurnFn).not.toHaveBeenCalled();
    });

    it('should not call onTurn for unconscious NPCs', () => {
      const onTurnFn = vi.fn().mockReturnValue([]);

      service.registerBehavior({
        id: 'test-behavior',
        onTurn: onTurnFn,
      });

      const npc = createMockEntity('npc-1', 'Sleeping Guard', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'test-behavior', isConscious: false }),
      });

      const world = createMockWorld([npc]);
      (world.getAllEntities as ReturnType<typeof vi.fn>).mockReturnValue([npc]);

      service.tick({
        world,
        turn: 1,
        random,
        playerLocation: 'room-1',
        playerId: 'player',
      });

      expect(onTurnFn).not.toHaveBeenCalled();
    });
  });

  describe('onPlayerEnters', () => {
    it('should call onPlayerEnters for NPCs in room', () => {
      const onPlayerEntersFn = vi.fn().mockReturnValue([]);

      service.registerBehavior({
        id: 'test-behavior',
        onTurn: () => [],
        onPlayerEnters: onPlayerEntersFn,
      });

      const npc = createMockEntity('npc-1', 'Guard', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'test-behavior' }),
      });

      const world = createMockWorld([npc]);
      (world.getContents as ReturnType<typeof vi.fn>).mockReturnValue([npc]);

      service.onPlayerEnters(world, 'room-1', random, 1);

      expect(onPlayerEntersFn).toHaveBeenCalled();
    });
  });

  describe('onPlayerLeaves', () => {
    it('should call onPlayerLeaves for NPCs in room', () => {
      const onPlayerLeavesFn = vi.fn().mockReturnValue([]);

      service.registerBehavior({
        id: 'test-behavior',
        onTurn: () => [],
        onPlayerLeaves: onPlayerLeavesFn,
      });

      const npc = createMockEntity('npc-1', 'Guard', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'test-behavior' }),
      });

      const world = createMockWorld([npc]);
      (world.getContents as ReturnType<typeof vi.fn>).mockReturnValue([npc]);

      service.onPlayerLeaves(world, 'room-1', random, 1);

      expect(onPlayerLeavesFn).toHaveBeenCalled();
    });
  });

  describe('onPlayerSpeaks', () => {
    it('should call onSpokenTo when player speaks', () => {
      const onSpokenToFn = vi.fn().mockReturnValue([{ type: 'speak', messageId: 'hello' }]);

      service.registerBehavior({
        id: 'test-behavior',
        onTurn: () => [],
        onSpokenTo: onSpokenToFn,
      });

      const npc = createMockEntity('npc-1', 'Guard', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'test-behavior' }),
      });

      const world = createMockWorld([npc]);

      service.onPlayerSpeaks(world, 'npc-1', 'hello', random, 1);

      expect(onSpokenToFn).toHaveBeenCalled();
      expect(onSpokenToFn.mock.calls[0][1]).toBe('hello');
    });

    it('should return default response if no handler', () => {
      service.registerBehavior({
        id: 'silent-behavior',
        onTurn: () => [],
        // No onSpokenTo
      });

      const npc = createMockEntity('npc-1', 'Silent Guard', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'silent-behavior' }),
      });

      const world = createMockWorld([npc]);

      const events = service.onPlayerSpeaks(world, 'npc-1', 'hello', random, 1);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('npc.spoke');
      expect((events[0].data as Record<string, unknown>).messageId).toBe(NpcMessages.NPC_NO_RESPONSE);
    });
  });

  describe('onNpcAttacked', () => {
    it('should call onAttacked when NPC is attacked', () => {
      const onAttackedFn = vi.fn().mockReturnValue([{ type: 'attack', target: 'player' }]);

      service.registerBehavior({
        id: 'fighter-behavior',
        onTurn: () => [],
        onAttacked: onAttackedFn,
      });

      const npc = createMockEntity('npc-1', 'Fighter', {
        [TraitType.NPC]: new NpcTrait({ behaviorId: 'fighter-behavior' }),
      });

      const attacker = createMockEntity('player', 'Player', {});

      const world = createMockWorld([npc, attacker]);

      service.onNpcAttacked(world, 'npc-1', 'player', random, 1);

      expect(onAttackedFn).toHaveBeenCalled();
    });
  });
});

describe('standard behaviors', () => {
  describe('guardBehavior', () => {
    it('should not move on turn', () => {
      const context = {
        npc: createMockEntity('guard', 'Guard', {}),
        world: createMockWorld(),
        random: createSeededRandom(12345),
        turnCount: 1,
        playerLocation: 'room-1',
        npcLocation: 'room-1',
        npcInventory: [],
        playerVisible: true,
        getEntitiesInRoom: () => [],
        getAvailableExits: () => [],
      } as NpcContext;

      const actions = guardBehavior.onTurn(context);
      expect(actions).toHaveLength(0);
    });

    it('should emote when player enters', () => {
      const context = {
        npc: createMockEntity('guard', 'Guard', {}),
        world: createMockWorld(),
        random: createSeededRandom(12345),
        turnCount: 1,
        playerLocation: 'room-1',
        npcLocation: 'room-1',
        npcInventory: [],
        playerVisible: true,
        getEntitiesInRoom: () => [],
        getAvailableExits: () => [],
      } as NpcContext;

      const actions = guardBehavior.onPlayerEnters!(context);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('emote');
      expect((actions[0] as Record<string, unknown>).messageId).toBe(NpcMessages.GUARD_BLOCKS);
    });

    it('should counterattack when attacked', () => {
      const attacker = createMockEntity('player', 'Player', {});
      const context = {
        npc: createMockEntity('guard', 'Guard', {}),
        world: createMockWorld(),
        random: createSeededRandom(12345),
        turnCount: 1,
        playerLocation: 'room-1',
        npcLocation: 'room-1',
        npcInventory: [],
        playerVisible: true,
        getEntitiesInRoom: () => [],
        getAvailableExits: () => [],
      } as NpcContext;

      const actions = guardBehavior.onAttacked!(context, attacker);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('attack');
      expect((actions[0] as Record<string, unknown>).target).toBe('player');
    });
  });

  describe('passiveBehavior', () => {
    it('should do nothing on turn', () => {
      const context = {
        npc: createMockEntity('npc', 'NPC', {}),
      } as NpcContext;

      const actions = passiveBehavior.onTurn(context);
      expect(actions).toHaveLength(0);
    });
  });

  describe('wandererBehavior', () => {
    it('should sometimes move', () => {
      const wanderer = createWandererBehavior({ moveChance: 1.0 }); // Always move

      const context = {
        npc: createMockEntity('npc', 'Wanderer', {}),
        world: createMockWorld(),
        random: createSeededRandom(12345),
        turnCount: 1,
        playerLocation: 'room-2',
        npcLocation: 'room-1',
        npcInventory: [],
        playerVisible: false,
        getEntitiesInRoom: () => [],
        getAvailableExits: () => [{ direction: 'north' as const, destination: 'room-2' }],
      } as NpcContext;

      const actions = wanderer.onTurn(context);
      expect(actions.some(a => a.type === 'move')).toBe(true);
    });

    it('should not move when no exits', () => {
      const wanderer = createWandererBehavior({ moveChance: 1.0 });

      const context = {
        npc: createMockEntity('npc', 'Wanderer', {}),
        world: createMockWorld(),
        random: createSeededRandom(12345),
        turnCount: 1,
        playerLocation: 'room-2',
        npcLocation: 'room-1',
        npcInventory: [],
        playerVisible: false,
        getEntitiesInRoom: () => [],
        getAvailableExits: () => [], // No exits
      } as NpcContext;

      const actions = wanderer.onTurn(context);
      expect(actions.filter(a => a.type === 'move')).toHaveLength(0);
    });
  });
});

describe('NpcService - movement announcements (#159)', () => {
  let service: NpcService;
  let random: ReturnType<typeof createSeededRandom>;

  beforeEach(() => {
    service = new NpcService();
    random = createSeededRandom(12345);
    vi.clearAllMocks();
  });

  /**
   * Build a real WorldModel with two connected rooms (A ⇄ B), a player, and an
   * NPC. The NPC's behavior is supplied per-test via a 'mover' behavior so we can
   * drive a specific move/moveTo through the public `tick` path.
   */
  function setupMoveWorld(npcData: Partial<ConstructorParameters<typeof NpcTrait>[0]> = {}) {
    const world = new WorldModel();

    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add({ type: TraitType.ACTOR, isPlayer: true });
    world.setPlayer(player.id);

    const roomA = world.createEntity('Room A', EntityType.ROOM);
    const roomB = world.createEntity('Room B', EntityType.ROOM);
    roomA.add(new RoomTrait({ exits: { [Direction.EAST]: { destination: roomB.id } } }));
    roomB.add(new RoomTrait({ exits: { [Direction.WEST]: { destination: roomA.id } } }));

    const npc = world.createEntity('Sam', EntityType.ACTOR);
    npc.add(new NpcTrait({ behaviorId: 'mover', canMove: true, ...npcData }));

    return { world, player, roomA, roomB, npc };
  }

  /** Run one NPC turn where the NPC performs the given action. */
  function tickWithAction(
    world: WorldModel,
    npcId: string,
    playerLocation: string,
    action: { type: 'move'; direction: string } | { type: 'moveTo'; roomId: string }
  ): ISemanticEvent[] {
    service.registerBehavior({ id: 'mover', onTurn: () => [action as never] });
    return service.tick({
      world,
      turn: 1,
      random,
      playerLocation,
      playerId: world.getPlayer()!.id,
    });
  }

  function witnessed(events: ISemanticEvent[]): ISemanticEvent | undefined {
    return events.find((e) => e.type === 'npc.moved.witnessed');
  }

  function renderings(event: ISemanticEvent): {
    sight?: { messageId: string; params: Record<string, unknown> };
    hearing?: { messageId: string; params: Record<string, unknown> };
  } {
    return (event.data as { renderings: never }).renderings;
  }

  // Test 0 — the critical world-state mutation.
  it('relocates the NPC and emits npc.moved (state mutation is the contract)', () => {
    const { world, roomA, roomB, npc } = setupMoveWorld({ announcesMovement: true });
    world.moveEntity(npc.id, roomA.id);

    // PRECONDITION
    expect(world.getLocation(npc.id)).toBe(roomA.id);

    const events = tickWithAction(world, npc.id, roomA.id, { type: 'move', direction: Direction.EAST });

    // POSTCONDITION — the move actually happened
    expect(world.getLocation(npc.id)).toBe(roomB.id);
    expect(events.some((e) => e.type === 'npc.moved')).toBe(true);
  });

  // Test 1 — default departure.
  it('announces a default departure from the player room (npc.leaves + heard_departs)', () => {
    const { world, roomA, npc } = setupMoveWorld({ announcesMovement: true });
    world.moveEntity(npc.id, roomA.id);

    const events = tickWithAction(world, npc.id, roomA.id, { type: 'move', direction: Direction.EAST });

    const w = witnessed(events);
    expect(w).toBeDefined();
    expect(renderings(w!).sight).toEqual({
      messageId: 'npc.leaves',
      params: { npcName: 'Sam', direction: Direction.EAST },
    });
    expect(renderings(w!).hearing!.messageId).toBe('npc.heard_departs');
  });

  // Test 2 — default arrival uses the opposite direction.
  it('announces a default arrival into the player room with the opposite direction', () => {
    const { world, roomA, roomB, npc } = setupMoveWorld({ announcesMovement: true });
    world.moveEntity(npc.id, roomB.id); // NPC starts away from the player

    // NPC moves WEST from B into A (the player's room); player sees it arrive from the EAST.
    const events = tickWithAction(world, npc.id, roomA.id, { type: 'move', direction: Direction.WEST });

    const w = witnessed(events);
    expect(w).toBeDefined();
    expect(renderings(w!).sight).toEqual({
      messageId: 'npc.enters',
      params: { npcName: 'Sam', direction: Direction.EAST },
    });
    expect(renderings(w!).hearing!.messageId).toBe('npc.heard_arrives');
  });

  // Test 3 — directionless moveTo.
  it('announces a directionless moveTo with npc.departs / npc.arrives and no direction param', () => {
    const { world, roomA, roomB, npc } = setupMoveWorld({ announcesMovement: true });
    world.moveEntity(npc.id, roomA.id);

    const events = tickWithAction(world, npc.id, roomA.id, { type: 'moveTo', roomId: roomB.id });

    const w = witnessed(events);
    expect(w).toBeDefined();
    expect(renderings(w!).sight).toEqual({ messageId: 'npc.departs', params: { npcName: 'Sam' } });
    expect(renderings(w!).hearing!.messageId).toBe('npc.heard_departs');
  });

  // Test 4 — silent when the flag is off.
  it('stays silent (no witnessed fact) when announcesMovement is off', () => {
    const { world, roomA, npc } = setupMoveWorld({ announcesMovement: false });
    world.moveEntity(npc.id, roomA.id);

    const events = tickWithAction(world, npc.id, roomA.id, { type: 'move', direction: Direction.EAST });

    expect(events.some((e) => e.type === 'npc.moved')).toBe(true);
    expect(witnessed(events)).toBeUndefined();
  });

  // Test 5 — silent when the move does not cross the player's room.
  it('stays silent when the move touches neither the player room', () => {
    const { world, roomA, roomB, npc } = setupMoveWorld({ announcesMovement: true });
    const elsewhere = world.createEntity('Far Room', EntityType.ROOM);
    world.moveEntity(npc.id, roomA.id);

    // Player is in a third room; NPC moves A→B, witnessing neither end.
    const events = tickWithAction(world, npc.id, elsewhere.id, { type: 'move', direction: Direction.EAST });

    expect(world.getLocation(npc.id)).toBe(roomB.id);
    expect(witnessed(events)).toBeUndefined();
  });

  // Test 6 — per-NPC override of the sight rendering.
  it('uses a per-NPC movementMessages override for the sight rendering only', () => {
    const { world, roomA, npc } = setupMoveWorld({
      announcesMovement: true,
      movementMessages: { leaves: 'zoo.sam.leaves' },
    });
    world.moveEntity(npc.id, roomA.id);

    const events = tickWithAction(world, npc.id, roomA.id, { type: 'move', direction: Direction.EAST });

    const w = witnessed(events);
    expect(renderings(w!).sight!.messageId).toBe('zoo.sam.leaves');
    expect(renderings(w!).sight!.params).toEqual({ npcName: 'Sam', direction: Direction.EAST });
    expect(renderings(w!).hearing!.messageId).toBe('npc.heard_departs');
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
