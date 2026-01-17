/**
 * NPC Service (ADR-070)
 *
 * Manages NPC behaviors, executes NPC actions, and handles the NPC turn phase.
 */

import { ISemanticEvent, EntityId, SeededRandom } from '@sharpee/core';
import { IFEntity, WorldModel, TraitType, NpcTrait, CombatantTrait } from '@sharpee/world-model';
import {
  NpcBehavior,
  NpcContext,
  NpcAction,
  Direction,
} from './types';
import { NpcMessages } from './npc-messages';
import { CombatService, applyCombatResult, findWieldedWeapon, CombatMessages } from '../combat';

/**
 * Context for NPC tick (simplified version of SchedulerContext)
 */
export interface NpcTickContext {
  world: WorldModel;
  turn: number;
  random: SeededRandom;
  playerLocation: EntityId;
  playerId: EntityId;
}

/**
 * NPC Service interface
 */
export interface INpcService {
  /** Register a behavior for use by NPCs */
  registerBehavior(behavior: NpcBehavior): void;

  /** Remove a behavior */
  removeBehavior(id: string): void;

  /** Get a behavior by ID */
  getBehavior(id: string): NpcBehavior | undefined;

  /** Execute the NPC turn phase */
  tick(context: NpcTickContext): ISemanticEvent[];

  /** Notify NPCs that player entered a room */
  onPlayerEnters(
    world: WorldModel,
    roomId: EntityId,
    random: SeededRandom,
    turn: number
  ): ISemanticEvent[];

  /** Notify NPCs that player left a room */
  onPlayerLeaves(
    world: WorldModel,
    roomId: EntityId,
    random: SeededRandom,
    turn: number
  ): ISemanticEvent[];

  /** Handle player speaking to an NPC */
  onPlayerSpeaks(
    world: WorldModel,
    npcId: EntityId,
    words: string,
    random: SeededRandom,
    turn: number
  ): ISemanticEvent[];

  /** Handle player attacking an NPC */
  onNpcAttacked(
    world: WorldModel,
    npcId: EntityId,
    attackerId: EntityId,
    random: SeededRandom,
    turn: number
  ): ISemanticEvent[];
}

/**
 * Create an event ID
 */
function createEventId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a semantic event
 */
function createEvent(
  type: string,
  data: Record<string, unknown>,
  npcId?: EntityId
): ISemanticEvent {
  return {
    id: createEventId('npc'),
    type,
    timestamp: Date.now(),
    entities: npcId ? { actor: npcId } : {},
    data,
  };
}

/**
 * NPC Service implementation
 */
export class NpcService implements INpcService {
  private behaviors: Map<string, NpcBehavior> = new Map();

  registerBehavior(behavior: NpcBehavior): void {
    this.behaviors.set(behavior.id, behavior);
  }

  removeBehavior(id: string): void {
    this.behaviors.delete(id);
  }

  getBehavior(id: string): NpcBehavior | undefined {
    return this.behaviors.get(id);
  }

  /**
   * Execute the NPC turn phase
   */
  tick(context: NpcTickContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const { world, turn, random, playerLocation, playerId } = context;

    // Find all NPCs that can act
    const npcs = this.getActiveNpcs(world);

    // Process each NPC
    for (const npc of npcs) {
      const npcTrait = npc.get(TraitType.NPC) as NpcTrait;
      if (!npcTrait || !npcTrait.canAct) continue;

      const behavior = this.getBehaviorForNpc(npc);
      if (!behavior) continue;

      const npcLocation = world.getLocation(npc.id) || '';
      const npcContext = this.createNpcContext(
        npc,
        world,
        random,
        turn,
        playerLocation,
        npcLocation
      );

      // Call onTurn hook
      const actions = behavior.onTurn(npcContext);
      const actionEvents = this.executeActions(npc, actions, world, random);
      events.push(...actionEvents);
    }

    return events;
  }

  /**
   * Notify NPCs that player entered a room
   */
  onPlayerEnters(
    world: WorldModel,
    roomId: EntityId,
    random: SeededRandom,
    turn: number
  ): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const playerId = world.getPlayer()?.id || '';

    // Get NPCs in the room
    const entities = world.getContents(roomId);
    const npcs = entities.filter((e) => e.has(TraitType.NPC));

    for (const npc of npcs) {
      const npcTrait = npc.get(TraitType.NPC) as NpcTrait;
      if (!npcTrait || !npcTrait.canAct) continue;

      const behavior = this.getBehaviorForNpc(npc);
      if (!behavior?.onPlayerEnters) continue;

      const npcContext = this.createNpcContext(
        npc,
        world,
        random,
        turn,
        roomId,
        roomId
      );

      const actions = behavior.onPlayerEnters(npcContext);
      const actionEvents = this.executeActions(npc, actions, world, random);
      events.push(...actionEvents);
    }

    return events;
  }

  /**
   * Notify NPCs that player left a room
   */
  onPlayerLeaves(
    world: WorldModel,
    roomId: EntityId,
    random: SeededRandom,
    turn: number
  ): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const playerId = world.getPlayer()?.id || '';
    const playerLocation = world.getLocation(playerId) || '';

    // Get NPCs in the old room
    const entities = world.getContents(roomId);
    const npcs = entities.filter((e) => e.has(TraitType.NPC));

    for (const npc of npcs) {
      const npcTrait = npc.get(TraitType.NPC) as NpcTrait;
      if (!npcTrait || !npcTrait.canAct) continue;

      const behavior = this.getBehaviorForNpc(npc);
      if (!behavior?.onPlayerLeaves) continue;

      const npcContext = this.createNpcContext(
        npc,
        world,
        random,
        turn,
        playerLocation,
        roomId
      );

      const actions = behavior.onPlayerLeaves(npcContext);
      const actionEvents = this.executeActions(npc, actions, world, random);
      events.push(...actionEvents);
    }

    return events;
  }

  /**
   * Handle player speaking to an NPC
   */
  onPlayerSpeaks(
    world: WorldModel,
    npcId: EntityId,
    words: string,
    random: SeededRandom,
    turn: number
  ): ISemanticEvent[] {
    const npc = world.getEntity(npcId);
    if (!npc) return [];

    const npcTrait = npc.get(TraitType.NPC) as NpcTrait;
    if (!npcTrait || !npcTrait.canAct) return [];

    const behavior = this.getBehaviorForNpc(npc);
    if (!behavior?.onSpokenTo) {
      // Default response if no handler
      return [
        createEvent(
          'npc.spoke',
          {
            npc: npcId,
            messageId: NpcMessages.NPC_NO_RESPONSE,
            data: { npcName: npc.name },
          },
          npcId
        ),
      ];
    }

    const playerId = world.getPlayer()?.id || '';
    const playerLocation = world.getLocation(playerId) || '';
    const npcLocation = world.getLocation(npcId) || '';

    const npcContext = this.createNpcContext(
      npc,
      world,
      random,
      turn,
      playerLocation,
      npcLocation
    );

    const actions = behavior.onSpokenTo(npcContext, words);
    return this.executeActions(npc, actions, world, random);
  }

  /**
   * Handle player attacking an NPC
   */
  onNpcAttacked(
    world: WorldModel,
    npcId: EntityId,
    attackerId: EntityId,
    random: SeededRandom,
    turn: number
  ): ISemanticEvent[] {
    const npc = world.getEntity(npcId);
    if (!npc) return [];

    const npcTrait = npc.get(TraitType.NPC) as NpcTrait;
    if (!npcTrait || !npcTrait.canAct) return [];

    const behavior = this.getBehaviorForNpc(npc);
    if (!behavior?.onAttacked) return [];

    const attacker = world.getEntity(attackerId);
    if (!attacker) return [];

    const playerLocation = world.getLocation(attackerId) || '';
    const npcLocation = world.getLocation(npcId) || '';

    const npcContext = this.createNpcContext(
      npc,
      world,
      random,
      turn,
      playerLocation,
      npcLocation
    );

    const actions = behavior.onAttacked(npcContext, attacker);
    return this.executeActions(npc, actions, world, random);
  }

  // ==================== Private Helpers ====================

  private getActiveNpcs(world: WorldModel): IFEntity[] {
    const allEntities = world.getAllEntities();
    return allEntities.filter((e) => {
      if (!e.has(TraitType.NPC)) return false;
      const npcTrait = e.get(TraitType.NPC) as NpcTrait;
      return npcTrait.canAct;
    });
  }

  private getBehaviorForNpc(npc: IFEntity): NpcBehavior | undefined {
    const npcTrait = npc.get(TraitType.NPC) as NpcTrait;
    if (!npcTrait.behaviorId) return undefined;
    return this.behaviors.get(npcTrait.behaviorId);
  }

  private createNpcContext(
    npc: IFEntity,
    world: WorldModel,
    random: SeededRandom,
    turn: number,
    playerLocation: EntityId,
    npcLocation: EntityId
  ): NpcContext {
    const npcInventory = world.getContents(npc.id);

    return {
      npc,
      world,
      random,
      turnCount: turn,
      playerLocation,
      npcLocation,
      npcInventory,
      playerVisible: npcLocation === playerLocation,
      getEntitiesInRoom: () => world.getContents(npcLocation),
      getAvailableExits: () => this.getExitsFromRoom(world, npcLocation, npc),
    };
  }

  private getExitsFromRoom(
    world: WorldModel,
    roomId: EntityId,
    npc: IFEntity
  ): { direction: Direction; destination: EntityId }[] {
    const room = world.getEntity(roomId);
    if (!room) return [];

    const roomTrait = room.get(TraitType.ROOM) as any;
    if (!roomTrait?.exits) return [];

    const npcTrait = npc.get(TraitType.NPC) as NpcTrait;
    const exits: { direction: Direction; destination: EntityId }[] = [];

    for (const [direction, exit] of Object.entries(roomTrait.exits)) {
      const exitData = exit as any;
      if (exitData.destination) {
        // Check if NPC can enter this room
        if (npcTrait.canEnterRoom(exitData.destination)) {
          exits.push({
            direction: direction as Direction,
            destination: exitData.destination,
          });
        }
      }
    }

    return exits;
  }

  private executeActions(
    npc: IFEntity,
    actions: NpcAction[],
    world: WorldModel,
    random: SeededRandom
  ): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];

    for (const action of actions) {
      const actionEvents = this.executeAction(npc, action, world, random);
      events.push(...actionEvents);
    }

    return events;
  }

  private executeAction(
    npc: IFEntity,
    action: NpcAction,
    world: WorldModel,
    random: SeededRandom
  ): ISemanticEvent[] {
    switch (action.type) {
      case 'move':
        return this.executeMove(npc, action.direction, world);

      case 'moveTo':
        return this.executeMoveTo(npc, action.roomId, world);

      case 'take':
        return this.executeTake(npc, action.target, world);

      case 'drop':
        return this.executeDrop(npc, action.target, world);

      case 'attack':
        return this.executeAttack(npc, action.target, world, random);

      case 'speak':
        return [
          createEvent(
            'npc.spoke',
            {
              npc: npc.id,
              messageId: action.messageId,
              data: action.data,
            },
            npc.id
          ),
        ];

      case 'emote':
        return [
          createEvent(
            'npc.emoted',
            {
              npc: npc.id,
              messageId: action.messageId,
              data: action.data,
            },
            npc.id
          ),
        ];

      case 'wait':
        return []; // No events for waiting

      case 'custom':
        return action.handler();

      default:
        return [];
    }
  }

  private executeMove(
    npc: IFEntity,
    direction: Direction,
    world: WorldModel
  ): ISemanticEvent[] {
    const currentLocation = world.getLocation(npc.id);
    if (!currentLocation) return [];

    const currentRoom = world.getEntity(currentLocation);
    if (!currentRoom) return [];

    const roomTrait = currentRoom.get(TraitType.ROOM) as any;
    if (!roomTrait?.exits?.[direction]) return [];

    const destination = roomTrait.exits[direction].destination;
    if (!destination) return [];

    // Move the NPC
    world.moveEntity(npc.id, destination);

    return [
      createEvent(
        'npc.moved',
        {
          npc: npc.id,
          from: currentLocation,
          to: destination,
          direction,
        },
        npc.id
      ),
    ];
  }

  private executeMoveTo(
    npc: IFEntity,
    roomId: EntityId,
    world: WorldModel
  ): ISemanticEvent[] {
    const currentLocation = world.getLocation(npc.id);
    if (!currentLocation) return [];

    // Move the NPC
    world.moveEntity(npc.id, roomId);

    return [
      createEvent(
        'npc.moved',
        {
          npc: npc.id,
          from: currentLocation,
          to: roomId,
        },
        npc.id
      ),
    ];
  }

  private executeTake(
    npc: IFEntity,
    targetId: EntityId,
    world: WorldModel
  ): ISemanticEvent[] {
    const target = world.getEntity(targetId);
    if (!target) return [];

    // Move item to NPC's inventory
    world.moveEntity(targetId, npc.id);

    return [
      createEvent(
        'npc.took',
        {
          npc: npc.id,
          target: targetId,
        },
        npc.id
      ),
    ];
  }

  private executeDrop(
    npc: IFEntity,
    targetId: EntityId,
    world: WorldModel
  ): ISemanticEvent[] {
    const target = world.getEntity(targetId);
    if (!target) return [];

    const npcLocation = world.getLocation(npc.id);
    if (!npcLocation) return [];

    // Move item to NPC's location
    world.moveEntity(targetId, npcLocation);

    return [
      createEvent(
        'npc.dropped',
        {
          npc: npc.id,
          target: targetId,
        },
        npc.id
      ),
    ];
  }

  private executeAttack(
    npc: IFEntity,
    targetId: EntityId,
    world: WorldModel,
    random: SeededRandom
  ): ISemanticEvent[] {
    const target = world.getEntity(targetId);
    if (!target) return [];

    const events: ISemanticEvent[] = [];

    // Check if target is a combatant
    if (target.has(TraitType.COMBATANT)) {
      // Use CombatService for actual combat resolution
      const combatService = new CombatService();

      // Find NPC's weapon (if any)
      const npcInventory = world.getContents(npc.id);
      const weapon = findWieldedWeapon(npc, world) ||
        npcInventory.find(item => (item as any).isWeapon);

      const combatResult = combatService.resolveAttack({
        attacker: npc,
        target: target,
        weapon: weapon,
        world: world,
        random: random
      });

      // Apply combat result to target
      applyCombatResult(target, combatResult, world);

      // Emit attack event with combat result
      // Use NPC-specific message IDs (prefix with 'npc.')
      const npcMessageId = combatResult.messageId.replace('combat.attack.', 'npc.combat.attack.');
      events.push(createEvent(
        'npc.attacked',
        {
          npc: npc.id,
          npcName: npc.name,
          target: targetId,
          targetName: target.name,
          hit: combatResult.hit,
          damage: combatResult.damage,
          messageId: npcMessageId,
          targetKilled: combatResult.targetKilled,
          targetKnockedOut: combatResult.targetKnockedOut,
        },
        npc.id
      ));

      // If target was killed, emit death event
      if (combatResult.targetKilled) {
        events.push(createEvent(
          'if.event.death',
          {
            target: targetId,
            targetName: target.name,
            killedBy: npc.id
          },
          npc.id
        ));
      }
    } else {
      // Non-combatant target - just emit basic attack event
      events.push(createEvent(
        'npc.attacked',
        {
          npc: npc.id,
          target: targetId,
        },
        npc.id
      ));
    }

    return events;
  }
}

/**
 * Create a new NPC Service instance
 */
export function createNpcService(): INpcService {
  return new NpcService();
}
