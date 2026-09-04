/**
 * NPC Service (ADR-070; ADR-328 D5) — the decision layer.
 *
 * Holds the registered behaviors and tick phases, decides which NPCs may
 * act this turn, and gives each behavior a context to act through. It
 * executes nothing itself: every act a behavior chooses runs through the
 * execution entry the engine supplies on the tick context (`act`), which
 * is the same four-phase path the player's commands take. The engine owns
 * the per-turn tick (`CLAUDE.md` Logic Location: the NPC turn phase is the
 * engine's); this service is what that phase calls.
 *
 * Public interface: NpcService / createNpcService, INpcService,
 * NpcTickContext, NpcTickPhase.
 * Owner context: stdlib / npc.
 */

import { type ISemanticEvent, type EntityId, type RandomService } from '@sharpee/core';
import type { ISound } from '@sharpee/if-domain';
import { IFEntity, WorldModel, TraitType, NpcTrait, HealthTrait, HealthBehavior, RoomTrait, type IExitInfo, type DirectionType } from '@sharpee/world-model';
import {
  type NpcBehavior,
  type NpcContext,
  type ExecutionEntry,
} from './types.js';

/**
 * A tick phase handler that runs during NPC turn processing.
 * Registered by higher-level packages (e.g., @sharpee/character).
 */
export type NpcTickPhase = (
  npcs: IFEntity[],
  context: NpcTickContext,
) => ISemanticEvent[];

/**
 * Context for one NPC tick — what the engine hands the service each turn.
 */
export interface NpcTickContext {
  world: WorldModel;
  turn: number;
  random: RandomService;
  playerLocation: EntityId;
  playerId: EntityId;
  /**
   * The execution entry (ADR-328 D2/D5): how a behavior's chosen act, and
   * a tick phase's, becomes a real `(action, actorId)` invocation. The
   * engine supplies it; the service curries it per NPC as `NpcContext.act`.
   */
  act: ExecutionEntry;
  /**
   * The player action's events this turn (ADR-310 Phase 5) — input for
   * observation-driven tick phases (the character model's observe
   * sub-step). Optional and additive: callers without action events
   * (tests, bare harnesses) simply produce no observations.
   */
  actionEvents?: ISemanticEvent[];
  /**
   * Feed the engine's per-turn sound buffer (ADR-172; ADR-320 Phase 8) —
   * NPC↔NPC scene moves emit conversation sounds through this seam so
   * eavesdropping rides the spatial propagation path. Optional and
   * additive: absent on callers without the sound subsystem.
   */
  emitSound?: (sound: ISound) => void;
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

  /** Per-NPC behaviour state not held in the world model, by entity id (#226). */
  getBehaviorStates?(): Record<string, Record<string, unknown>>;
  /** Restore per-NPC behaviour state saved by `getBehaviorStates`. */
  setBehaviorStates?(states: Record<string, Record<string, unknown>>): void;

  /** Register a tick phase handler (ADR-142/144/145/146) */
  registerTickPhase(name: string, handler: NpcTickPhase): void;

  /** Run the NPC turn: every eligible NPC's `onTurn`, then the tick phases */
  tick(context: NpcTickContext): ISemanticEvent[];

  /** Notify NPCs that player entered a room */
  onPlayerEnters(
    world: WorldModel,
    roomId: EntityId,
    random: RandomService,
    turn: number,
    act: ExecutionEntry
  ): ISemanticEvent[];

  /** Notify NPCs that player left a room */
  onPlayerLeaves(
    world: WorldModel,
    roomId: EntityId,
    random: RandomService,
    turn: number,
    act: ExecutionEntry
  ): ISemanticEvent[];
}

/**
 * Create an event ID
 */
function createEventId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a semantic event sourced by an NPC at a location.
 */
function createEvent(
  type: string,
  data: Record<string, unknown>,
  npcId: EntityId,
  locationId?: EntityId
): ISemanticEvent {
  return {
    id: createEventId('npc'),
    type,
    timestamp: Date.now(),
    entities: { actor: npcId, ...(locationId ? { location: locationId } : {}) },
    data,
  };
}

/**
 * NPC Service implementation
 */
export class NpcService implements INpcService {
  private behaviors: Map<string, NpcBehavior> = new Map();
  /** Latest world seen by `tick` — serialization needs one to enumerate NPCs. */
  private lastWorld?: WorldModel;
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
   * Run the NPC turn. Each eligible NPC's behavior decides through its
   * context; the acts it chooses have already run, and their events sit
   * in the returned stream in the order they were acted, followed by the
   * registered tick phases' events.
   *
   * @param context - The engine's tick context for this turn
   * @returns The turn's NPC-sourced events, in order
   */
  tick(context: NpcTickContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const { world, turn, random, playerLocation, act } = context;
    this.lastWorld = world;

    // Find all NPCs that can act
    const npcs = this.getActiveNpcs(world);

    // Process each NPC
    for (const npc of npcs) {
      if (!this.canNpcAct(npc, world)) continue;

      const behavior = this.getBehaviorForNpc(npc);
      if (!behavior) continue;

      const npcLocation = world.getLocation(npc.id) || '';
      const npcContext = this.createNpcContext(
        npc,
        world,
        random,
        turn,
        playerLocation,
        npcLocation,
        act,
        events
      );

      behavior.onTurn(npcContext);
    }
    // Lucidity decay is no longer inlined here: it is the decay sub-step of
    // the registered 'character-model' tick phase (contracts.md §2, ADR-310 D15).

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
    random: RandomService,
    turn: number,
    act: ExecutionEntry
  ): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];

    // Get NPCs in the room
    const entities = world.getContents(roomId);
    const npcs = entities.filter((e) => e.has(TraitType.NPC));

    for (const npc of npcs) {
      if (!this.canNpcAct(npc, world)) continue;

      const behavior = this.getBehaviorForNpc(npc);
      if (!behavior?.onPlayerEnters) continue;

      // The player just entered roomId, so it is the player's current location.
      const npcContext = this.createNpcContext(
        npc,
        world,
        random,
        turn,
        roomId,
        roomId,
        act,
        events
      );

      behavior.onPlayerEnters(npcContext);
    }

    return events;
  }

  /**
   * Notify NPCs that player left a room
   */
  onPlayerLeaves(
    world: WorldModel,
    roomId: EntityId,
    random: RandomService,
    turn: number,
    act: ExecutionEntry
  ): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const playerId = world.getPlayer()?.id || '';
    const playerLocation = world.getLocation(playerId) || '';

    // Get NPCs in the old room
    const entities = world.getContents(roomId);
    const npcs = entities.filter((e) => e.has(TraitType.NPC));

    for (const npc of npcs) {
      if (!this.canNpcAct(npc, world)) continue;

      const behavior = this.getBehaviorForNpc(npc);
      if (!behavior?.onPlayerLeaves) continue;

      const npcContext = this.createNpcContext(
        npc,
        world,
        random,
        turn,
        playerLocation,
        roomId,
        act,
        events
      );

      behavior.onPlayerLeaves(npcContext);
    }

    return events;
  }

  // ==================== Private Helpers ====================

  /**
   * Whether an NPC can take a turn: it is an NPC, it is not the character
   * currently being played (ADR-327 D9), and — if it carries life-state —
   * is alive and conscious. An NPC with no `HealthTrait` is active by default
   * (opt-in life-state, ADR-226 §3). Reads health data via `HealthBehavior`, never a
   * trait getter, so it survives `loadJSON()`. This is the single turn-eligibility
   * source that makes the combat-kill sync bug (ADR-226 AC-2) impossible.
   */
  private canNpcAct(npc: IFEntity, world: WorldModel): boolean {
    if (!npc.has(TraitType.NPC)) return false;
    // ADR-327 D9: under PC rotation every character carries the NPC trait, so
    // what keeps the service off the protagonist is that they hold the role
    // THIS turn — asked here, never stored, so a character the role moves off
    // resumes being driven on the very next turn.
    if (npc.id === world.getPlayer()?.id) return false;
    const health = npc.get(TraitType.HEALTH) as HealthTrait | undefined;
    return !health || HealthBehavior.canAct(health);
  }

  /**
   * Per-NPC behaviour state the world model cannot express (issue #226).
   *
   * A patrol's waypoint cursor, direction and remaining dwell live in the
   * behaviour: an NPC standing in a room could be arriving, leaving, or
   * waiting there, and only the behaviour knows which. Keyed by ENTITY id
   * because `getState(npc)` takes an entity — one registered behaviour can
   * serve several NPCs, and keying by behaviour would collapse them.
   */
  getBehaviorStates(): Record<string, Record<string, unknown>> {
    const states: Record<string, Record<string, unknown>> = {};
    if (!this.lastWorld) return states;
    for (const npc of this.getActiveNpcs(this.lastWorld)) {
      const state = this.getBehaviorForNpc(npc)?.getState?.(npc);
      if (state !== undefined) states[npc.id] = state;
    }
    return states;
  }

  /**
   * Restore per-NPC behaviour state. An NPC absent from the save is reset
   * through its own `setState(npc, {})` — a restore is a reset, not a merge.
   */
  setBehaviorStates(states: Record<string, Record<string, unknown>>): void {
    if (!this.lastWorld) return;
    for (const npc of this.getActiveNpcs(this.lastWorld)) {
      this.getBehaviorForNpc(npc)?.setState?.(npc, states[npc.id] ?? {});
    }
  }

  private getActiveNpcs(world: WorldModel): IFEntity[] {
    const allEntities = world.getAllEntities();
    return allEntities.filter((e) => this.canNpcAct(e, world));
  }

  private getBehaviorForNpc(npc: IFEntity): NpcBehavior | undefined {
    const npcTrait = npc.get(TraitType.NPC) as NpcTrait;
    if (!npcTrait.behaviorId) return undefined;
    return this.behaviors.get(npcTrait.behaviorId);
  }

  /**
   * Build one NPC's context. `act` curries the execution entry to this
   * NPC and appends the act's events to `sink`; `narrate` appends one
   * `game.message` sourced by the NPC at wherever it stands when it
   * speaks — after a move, that is the new room. Both write to the same
   * sink so the turn's stream keeps the order the behavior acted in.
   */
  private createNpcContext(
    npc: IFEntity,
    world: WorldModel,
    random: RandomService,
    turn: number,
    playerLocation: EntityId,
    npcLocation: EntityId,
    entry: ExecutionEntry,
    sink: ISemanticEvent[]
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
      act: (actionId, slots) => {
        const result = entry(npc.id, actionId, slots);
        sink.push(...result.events);
        return result;
      },
      narrate: (message, params) => {
        const data = typeof message === 'string'
          ? { messageId: message, params: params ?? {} }
          : { text: message.text };
        sink.push(createEvent('game.message', data, npc.id, world.getLocation(npc.id) || undefined));
      },
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
}

/**
 * Create a new NPC Service instance
 */
export function createNpcService(): INpcService {
  return new NpcService();
}
