/**
 * NPC Service (ADR-070)
 *
 * Manages NPC behaviors, executes NPC actions, and handles the NPC turn phase.
 */

import { ISemanticEvent, EntityId, SeededRandom } from '@sharpee/core';
import { IFEntity, WorldModel, TraitType, NpcTrait, HealthTrait, HealthBehavior, RoomTrait, IExitInfo, DirectionType, CharacterModelTrait, getOppositeDirection } from '@sharpee/world-model';
import type { PerSenseRenderings } from '@sharpee/if-services';
import {
  NpcBehavior,
  NpcContext,
  NpcAction,
} from './types.js';
import { NpcMessages } from './npc-messages.js';
import { processLucidityDecay } from './lucidity-decay.js';
import { nounPhraseFor } from '../utils/index.js';
/**
 * A tick phase handler that runs during NPC turn processing.
 * Registered by higher-level packages (e.g., @sharpee/character).
 */
export type NpcTickPhase = (
  npcs: IFEntity[],
  context: NpcTickContext,
) => ISemanticEvent[];

/**
 * NPC Combat Resolver function type.
 *
 * Stories register a resolver to handle NPC→target combat resolution.
 * Without a resolver, NPC attack actions emit a bare `npc.attacked` event
 * with no combat resolution (no damage, no death).
 */
export type NpcCombatResolver = (
  npc: IFEntity,
  target: IFEntity,
  world: WorldModel,
  random: SeededRandom
) => ISemanticEvent[];

/**
 * Module-level NPC combat resolver. Set via registerNpcCombatResolver().
 * Uses globalThis to share across module boundaries (same pattern as interceptor registry).
 */
const NPC_COMBAT_RESOLVER_KEY = '__sharpee_npc_combat_resolver__';

function getNpcCombatResolver(): NpcCombatResolver | undefined {
  return (globalThis as Record<string, unknown>)[NPC_COMBAT_RESOLVER_KEY] as NpcCombatResolver | undefined;
}

/**
 * Register an NPC combat resolver.
 *
 * Call this in your story's initializeWorld() to provide combat resolution
 * for NPC attack actions. Without a resolver, NPC attacks produce bare events.
 *
 * @param resolver - Function that resolves NPC→target combat and returns events
 */
export function registerNpcCombatResolver(resolver: NpcCombatResolver): void {
  (globalThis as Record<string, unknown>)[NPC_COMBAT_RESOLVER_KEY] = resolver;
}

/**
 * Clear the NPC combat resolver. Used for testing cleanup.
 */
export function clearNpcCombatResolver(): void {
  delete (globalThis as Record<string, unknown>)[NPC_COMBAT_RESOLVER_KEY];
}

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

  /** Register a tick phase handler (ADR-142/144/145/146) */
  registerTickPhase(name: string, handler: NpcTickPhase): void;

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
  private readonly tickPhases: { name: string; handler: NpcTickPhase }[] = [];

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
   * Register a tick phase handler (ADR-142/144/145/146).
   * Phases run in registration order after behavior onTurn processing.
   *
   * @param name - Phase name for debugging
   * @param handler - Function called with active NPCs and tick context
   */
  registerTickPhase(name: string, handler: NpcTickPhase): void {
    this.tickPhases.push({ name, handler });
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
      if (!this.canNpcAct(npc)) continue;

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
      const actionEvents = this.executeActions(npc, actions, world, random, playerLocation);
      events.push(...actionEvents);

      // Process lucidity decay for NPCs with character model (ADR-141)
      if (npc.has(TraitType.CHARACTER_MODEL)) {
        const decayEvents = processLucidityDecay(npc, world, turn);
        events.push(...decayEvents);
      }
    }

    // Registered tick phases (ADR-142/144/145/146)
    for (const phase of this.tickPhases) {
      const phaseEvents = phase.handler(npcs, context);
      events.push(...phaseEvents);
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
      if (!this.canNpcAct(npc)) continue;

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
      // The player just entered roomId, so it is the player's current location.
      const actionEvents = this.executeActions(npc, actions, world, random, roomId);
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
      if (!this.canNpcAct(npc)) continue;

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
      const actionEvents = this.executeActions(npc, actions, world, random, playerLocation);
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

    if (!this.canNpcAct(npc)) return [];

    const behavior = this.getBehaviorForNpc(npc);
    if (!behavior?.onSpokenTo) {
      // Default response if no handler
      return [
        createEvent(
          'npc.spoke',
          {
            npc: npcId,
            messageId: NpcMessages.NPC_NO_RESPONSE,
            data: { speaker: nounPhraseFor(npc) },
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
    return this.executeActions(npc, actions, world, random, playerLocation);
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

    if (!this.canNpcAct(npc)) return [];

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
    return this.executeActions(npc, actions, world, random, playerLocation);
  }

  // ==================== Private Helpers ====================

  /**
   * Whether an NPC can take a turn: it is an NPC and — if it carries life-state —
   * is alive and conscious. An NPC with no `HealthTrait` is active by default
   * (opt-in life-state, ADR-226 §3). Reads health data via `HealthBehavior`, never a
   * trait getter, so it survives `loadJSON()`. This is the single turn-eligibility
   * source that makes the combat-kill sync bug (ADR-226 AC-2) impossible.
   */
  private canNpcAct(npc: IFEntity): boolean {
    if (!npc.has(TraitType.NPC)) return false;
    const health = npc.get(TraitType.HEALTH) as HealthTrait | undefined;
    return !health || HealthBehavior.canAct(health);
  }

  private getActiveNpcs(world: WorldModel): IFEntity[] {
    const allEntities = world.getAllEntities();
    return allEntities.filter((e) => this.canNpcAct(e));
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
  ): { direction: DirectionType; destination: EntityId }[] {
    const room = world.getEntity(roomId);
    if (!room) return [];

    const roomTrait = room.get(RoomTrait);
    if (!roomTrait?.exits) return [];

    const npcTrait = npc.get(TraitType.NPC) as NpcTrait;
    const exits: { direction: DirectionType; destination: EntityId }[] = [];

    for (const [direction, exit] of Object.entries(roomTrait.exits)) {
      const exitData = exit as IExitInfo;
      if (exitData.destination) {
        // Inline canEnterRoom() — method doesn't survive loadJSON() deserialization
        const dest = exitData.destination;
        if (!npcTrait.canMove) continue;
        if (npcTrait.forbiddenRooms?.includes(dest)) continue;
        if (npcTrait.allowedRooms && !npcTrait.allowedRooms.includes(dest)) continue;

        exits.push({
          direction: direction as DirectionType,
          destination: dest,
        });
      }
    }

    return exits;
  }

  private executeActions(
    npc: IFEntity,
    actions: NpcAction[],
    world: WorldModel,
    random: SeededRandom,
    playerLocation: EntityId
  ): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];

    for (const action of actions) {
      const actionEvents = this.executeAction(npc, action, world, random, playerLocation);
      events.push(...actionEvents);
    }

    return events;
  }

  private executeAction(
    npc: IFEntity,
    action: NpcAction,
    world: WorldModel,
    random: SeededRandom,
    playerLocation: EntityId
  ): ISemanticEvent[] {
    switch (action.type) {
      case 'move':
        return this.executeMove(npc, action.direction, world, playerLocation);

      case 'moveTo':
        return this.executeMoveTo(npc, action.roomId, world, playerLocation);

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
              params: action.data,
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
              params: action.data,
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
    direction: DirectionType,
    world: WorldModel,
    playerLocation: EntityId
  ): ISemanticEvent[] {
    const currentLocation = world.getLocation(npc.id);
    if (!currentLocation) return [];

    const currentRoom = world.getEntity(currentLocation);
    if (!currentRoom) return [];

    const roomTrait = currentRoom.get(RoomTrait);
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
      // Player-witnessable announcement (opt-in; layered on top of npc.moved).
      ...this.announceMovement(npc, world, playerLocation, currentLocation, destination, direction),
    ];
  }

  private executeMoveTo(
    npc: IFEntity,
    roomId: EntityId,
    world: WorldModel,
    playerLocation: EntityId
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
      // Directionless announcement (npc.arrives / npc.departs).
      ...this.announceMovement(npc, world, playerLocation, currentLocation, roomId),
    ];
  }

  /**
   * Build the player-witnessable movement announcement for a crossing.
   *
   * Returns a single sense-neutral `npc.moved.witnessed` fact carrying a per-sense
   * `renderings` map (sight + hearing). PerceptionService selects the rendering for
   * the player's available sense; neither is derived from the other.
   *
   * @returns one `npc.moved.witnessed` event, or `[]` when the NPC does not announce
   *   movement or the move touches neither the player's room.
   */
  private announceMovement(
    npc: IFEntity,
    world: WorldModel,
    playerLocation: EntityId,
    from: EntityId,
    to: EntityId,
    direction?: DirectionType
  ): ISemanticEvent[] {
    const trait = npc.get(TraitType.NPC) as NpcTrait | undefined;
    if (!trait?.announcesMovement) return [];
    const overrides = trait.movementMessages ?? {};

    let sightId: string;
    let hearingId: string;
    let params: Record<string, unknown>;

    // Direction constants are language-neutral UPPERCASE tokens ('EAST'); the
    // npc.leaves/npc.enters templates render the param through
    // {verbatim:direction}, so bind the lowercase surface form the player
    // should read ("leaves to the east", not "to the EAST").
    if (from === playerLocation) {            // departure
      sightId = direction
        ? (overrides.leaves ?? NpcMessages.NPC_LEAVES)
        : (overrides.departs ?? NpcMessages.NPC_DEPARTS);
      hearingId = NpcMessages.NPC_HEARD_DEPARTS;
      params = {
        speaker: nounPhraseFor(npc),
        ...(direction ? { direction: direction.toLowerCase() } : {}),
      };
    } else if (to === playerLocation) {       // arrival
      sightId = direction
        ? (overrides.enters ?? NpcMessages.NPC_ENTERS)
        : (overrides.arrives ?? NpcMessages.NPC_ARRIVES);
      hearingId = NpcMessages.NPC_HEARD_ARRIVES;
      // The player sees the NPC arrive *from* the direction it came.
      const dir = direction ? getOppositeDirection(direction) : undefined;
      params = {
        speaker: nounPhraseFor(npc),
        ...(dir ? { direction: dir.toLowerCase() } : {}),
      };
    } else {
      return [];                              // a move the player can't witness
    }

    const renderings: PerSenseRenderings = {
      sight: { messageId: sightId, params },
      hearing: { messageId: hearingId, params: {} },
    };

    return [
      createEvent(
        'npc.moved.witnessed',
        { npc: npc.id, renderings },
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

    // Delegate to registered combat resolver if available
    const resolver = getNpcCombatResolver();
    if (resolver) {
      return resolver(npc, target, world, random);
    }

    // No resolver registered — emit bare attack event (no combat resolution)
    return [
      createEvent(
        'npc.attacked',
        {
          npc: npc.id,
          target: targetId,
        },
        npc.id
      ),
    ];
  }
}

/**
 * Create a new NPC Service instance
 */
export function createNpcService(): INpcService {
  return new NpcService();
}
