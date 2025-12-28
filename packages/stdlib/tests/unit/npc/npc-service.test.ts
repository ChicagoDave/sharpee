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
import { IFEntity, WorldModel, TraitType, NpcTrait, RoomTrait } from '@sharpee/world-model';

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
      (world.getAllEntities as any).mockReturnValue([npc]);

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
      (world.getAllEntities as any).mockReturnValue([npc]);

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
      (world.getAllEntities as any).mockReturnValue([npc]);

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
      (world.getContents as any).mockReturnValue([npc]);

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
      (world.getContents as any).mockReturnValue([npc]);

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
      expect((events[0].data as any).messageId).toBe(NpcMessages.NPC_NO_RESPONSE);
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
      expect((actions[0] as any).messageId).toBe(NpcMessages.GUARD_BLOCKS);
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
      expect((actions[0] as any).target).toBe('player');
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

describe('createNpcService', () => {
  it('should create an NPC service', () => {
    const service = createNpcService();
    expect(service).toBeDefined();
    expect(service.registerBehavior).toBeDefined();
    expect(service.tick).toBeDefined();
  });
});
