/**
 * NPC tick phase implementations (ADR-144, 145, 146)
 *
 * Factory functions that create tick phase handlers for propagation,
 * goal pursuit, and influence evaluation. Register these with
 * NpcService.registerTickPhase() during story initialization.
 *
 * Public interface: createPropagationPhase, createGoalPhase,
 *   createInfluencePhase, CharacterPhaseConfig.
 * Owner context: @sharpee/character
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import {
  IFEntity,
  WorldModel,
  TraitType,
  CharacterModelTrait,
  RoomTrait,
  IExitInfo,
} from '@sharpee/world-model';
import {
  PropagationProfile,
  PropagationContext,
  RoomOccupant,
  evaluatePropagation,
  transferFact,
  getVisibilityResult,
  AlreadyToldRecord,
} from './propagation';
import {
  GoalDef,
  MovementProfile,
  GoalManager,
  GoalStepContext,
  evaluateGoalStep,
  SimpleRoomGraph,
} from './goals';
import {
  InfluenceDef,
  ResistanceDef,
  InfluenceRoomEntity,
  evaluatePassiveInfluences,
  InfluenceTracker,
} from './influence';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Tick context — mirrors NpcTickContext from stdlib. */
interface TickContext {
  world: WorldModel;
  turn: number;
  random: unknown;
  playerLocation: EntityId;
  playerId: EntityId;
}

/** Per-NPC character configuration for tick phases. */
export interface CharacterPhaseConfig {
  propagationProfile?: PropagationProfile;
  goalDefs?: GoalDef[];
  movementProfile?: MovementProfile;
  influenceDefs?: InfluenceDef[];
  resistanceDefs?: ResistanceDef[];
}

/** Manages per-NPC configs and shared state for tick phases. */
export class CharacterPhaseRegistry {
  private configs: Map<string, CharacterPhaseConfig> = new Map();
  private goalManagers: Map<string, GoalManager> = new Map();
  readonly influenceTracker: InfluenceTracker = new InfluenceTracker();
  readonly alreadyToldRecord: AlreadyToldRecord = new AlreadyToldRecord();

  /**
   * Register character configuration for an NPC.
   *
   * @param entityId - NPC entity ID
   * @param config - Configuration from AppliedCharacter
   */
  register(entityId: string, config: CharacterPhaseConfig): void {
    this.configs.set(entityId, config);
    if (config.goalDefs && config.goalDefs.length > 0) {
      const manager = new GoalManager();
      manager.registerGoals(config.goalDefs);
      this.goalManagers.set(entityId, manager);
    }
  }

  /** Get config for an NPC. */
  getConfig(entityId: string): CharacterPhaseConfig | undefined {
    return this.configs.get(entityId);
  }

  /** Get goal manager for an NPC. */
  getGoalManager(entityId: string): GoalManager | undefined {
    return this.goalManagers.get(entityId);
  }

  /** Check if any NPCs have been registered. */
  get hasConfigs(): boolean {
    return this.configs.size > 0;
  }

  /**
   * Export serializable state for save/restore.
   * Configs are authored (re-registered on load), so only mutable state is saved.
   */
  toJSON(): {
    goalStates: Record<string, ReturnType<GoalManager['toJSON']>>;
    influenceEffects: ReturnType<InfluenceTracker['toJSON']>;
    alreadyTold: ReturnType<AlreadyToldRecord['toJSON']>;
  } {
    const goalStates: Record<string, ReturnType<GoalManager['toJSON']>> = {};
    for (const [id, manager] of this.goalManagers) {
      goalStates[id] = manager.toJSON();
    }
    return {
      goalStates,
      influenceEffects: this.influenceTracker.toJSON(),
      alreadyTold: this.alreadyToldRecord.toJSON(),
    };
  }

  /**
   * Restore mutable state from saved data.
   * Call after re-registering all NPC configs.
   */
  restoreState(saved: {
    goalStates?: Record<string, ReturnType<GoalManager['toJSON']>>;
    influenceEffects?: ReturnType<InfluenceTracker['toJSON']>;
    alreadyTold?: ReturnType<AlreadyToldRecord['toJSON']>;
  }): void {
    // Restore goal manager states
    if (saved.goalStates) {
      for (const [id, states] of Object.entries(saved.goalStates)) {
        const manager = this.goalManagers.get(id);
        if (manager) {
          manager.restoreState(states);
        }
      }
    }

    // Restore influence tracker
    if (saved.influenceEffects) {
      const restored = InfluenceTracker.fromJSON(saved.influenceEffects);
      // Copy effects into the existing tracker
      for (const effect of restored.toJSON()) {
        this.influenceTracker.track(
          effect.influenceName, effect.influencerId, effect.targetId,
          effect.effect, effect.duration, effect.appliedAtTurn,
          effect.expiresAtTurn !== undefined ? effect.expiresAtTurn - effect.appliedAtTurn : undefined,
          effect.clearCondition,
        );
      }
    }

    // Restore already-told record
    if (saved.alreadyTold) {
      const restored = AlreadyToldRecord.fromJSON(saved.alreadyTold);
      // The alreadyToldRecord is readonly, so we need to record each entry
      for (const [speakerId, listeners] of Object.entries(saved.alreadyTold)) {
        for (const [listenerId, topics] of Object.entries(listeners)) {
          for (const topic of topics) {
            this.alreadyToldRecord.record(speakerId, listenerId, topic);
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Event helper
// ---------------------------------------------------------------------------

function createEvent(
  type: string,
  data: Record<string, unknown>,
  npcId?: string,
): ISemanticEvent {
  return {
    id: `${type}_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
    type,
    timestamp: Date.now(),
    entities: npcId ? { actor: npcId } : {},
    data,
  };
}

// ---------------------------------------------------------------------------
// Propagation phase (ADR-144)
// ---------------------------------------------------------------------------

/**
 * Create a propagation tick phase handler.
 *
 * @param registry - The character phase registry
 * @returns Tick phase handler function
 */
export function createPropagationPhase(
  registry: CharacterPhaseRegistry,
): (npcs: IFEntity[], ctx: TickContext) => ISemanticEvent[] {
  return (npcs: IFEntity[], ctx: TickContext): ISemanticEvent[] => {
    const events: ISemanticEvent[] = [];
    const { world, turn, playerLocation } = ctx;

    // Group NPCs by room
    const roomNpcs = new Map<string, IFEntity[]>();
    for (const npc of npcs) {
      const loc = world.getLocation(npc.id);
      if (!loc) continue;
      const config = registry.getConfig(npc.id);
      if (!config?.propagationProfile) continue;
      if (!npc.has(TraitType.CHARACTER_MODEL)) continue;
      const list = roomNpcs.get(loc) ?? [];
      list.push(npc);
      roomNpcs.set(loc, list);
    }

    for (const [roomId, roomNpcList] of roomNpcs) {
      if (roomNpcList.length < 2) continue;

      for (const speaker of roomNpcList) {
        const config = registry.getConfig(speaker.id)!;
        const trait = speaker.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
        if (!trait || !config.propagationProfile) continue;

        const listeners: RoomOccupant[] = roomNpcList
          .filter(n => n.id !== speaker.id)
          .map(n => ({
            id: n.id,
            trait: n.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait,
            profile: registry.getConfig(n.id)?.propagationProfile,
          }));

        const propContext: PropagationContext = {
          speaker: { id: speaker.id, trait, profile: config.propagationProfile },
          listeners,
          alreadyTold: registry.alreadyToldRecord,
          playerPresent: roomId === playerLocation,
          turn,
        };

        const transfers = evaluatePropagation(propContext);

        for (const transfer of transfers) {
          const listenerEntity = world.getEntity(transfer.listenerId);
          if (!listenerEntity) continue;
          const listenerTrait = listenerEntity.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
          if (!listenerTrait) continue;

          const listenerConfig = registry.getConfig(transfer.listenerId);
          const receivesAs = listenerConfig?.propagationProfile?.receives ?? 'as fact';

          const result = transferFact(
            transfer, listenerTrait, registry.alreadyToldRecord, turn, receivesAs,
          );

          if (roomId === playerLocation && !result.alreadyKnew) {
            const visibility = getVisibilityResult(transfer, 'present');
            if (visibility.messageId) {
              events.push(createEvent('character.propagation.witnessed', {
                speakerId: speaker.id,
                listenerId: transfer.listenerId,
                topic: transfer.topic,
                messageId: visibility.messageId,
                speakerName: speaker.name,
                listenerName: listenerEntity.name,
              }, speaker.id));
            }
          }
        }
      }
    }

    return events;
  };
}

// ---------------------------------------------------------------------------
// Goal pursuit phase (ADR-145)
// ---------------------------------------------------------------------------

/**
 * Create a goal pursuit tick phase handler.
 *
 * @param registry - The character phase registry
 * @returns Tick phase handler function
 */
export function createGoalPhase(
  registry: CharacterPhaseRegistry,
): (npcs: IFEntity[], ctx: TickContext) => ISemanticEvent[] {
  return (npcs: IFEntity[], ctx: TickContext): ISemanticEvent[] => {
    const events: ISemanticEvent[] = [];
    const { world, playerLocation } = ctx;

    for (const npc of npcs) {
      const manager = registry.getGoalManager(npc.id);
      if (!manager) continue;

      const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
      if (!trait) continue;

      manager.evaluate(trait);

      const activeGoals = manager.getActiveGoals();
      const activeGoal = activeGoals.find(g => !g.paused && !g.interrupted);
      if (!activeGoal) continue;

      const config = registry.getConfig(npc.id);
      const npcLocation = world.getLocation(npc.id) || '';
      const movement = config?.movementProfile ?? { knows: 'all' as const, access: 'all' as const };

      const stepContext: GoalStepContext = {
        npcId: npc.id,
        currentRoom: npcLocation,
        trait,
        movement,
        roomGraph: buildRoomGraph(world),
        playerPresent: npcLocation === playerLocation,
        isInRoom: (entityId, roomId) => world.getLocation(entityId) === roomId,
        getEntityRoom: (entityId) => world.getLocation(entityId) || undefined,
      };

      const stepResult = evaluateGoalStep(activeGoal, stepContext);

      if (
        (stepResult.status === 'completed' || stepResult.status === 'in-progress') &&
        stepResult.witnessed &&
        npcLocation === playerLocation
      ) {
        events.push(createEvent('character.goal.step', {
          npcId: npc.id,
          goalId: activeGoal.def.id,
          step: activeGoal.currentStep,
          messageId: stepResult.witnessed,
          npcName: npc.name,
        }, npc.id));
      }

      if (stepResult.status === 'completed') {
        manager.advanceStep(activeGoal.def.id);
      }
    }

    return events;
  };
}

// ---------------------------------------------------------------------------
// Influence phase (ADR-146)
// ---------------------------------------------------------------------------

/**
 * Create an influence evaluation tick phase handler.
 *
 * @param registry - The character phase registry
 * @returns Tick phase handler function
 */
export function createInfluencePhase(
  registry: CharacterPhaseRegistry,
): (npcs: IFEntity[], ctx: TickContext) => ISemanticEvent[] {
  return (npcs: IFEntity[], ctx: TickContext): ISemanticEvent[] => {
    const events: ISemanticEvent[] = [];
    const { world, turn, playerLocation, playerId } = ctx;

    // Group entities by room
    const roomEntities = new Map<string, InfluenceRoomEntity[]>();
    for (const npc of npcs) {
      const loc = world.getLocation(npc.id);
      if (!loc) continue;

      const config = registry.getConfig(npc.id);
      const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;

      roomEntities.set(loc, [
        ...(roomEntities.get(loc) ?? []),
        {
          id: npc.id,
          influences: config?.influenceDefs ?? [],
          resistances: config?.resistanceDefs ?? [],
          evaluatePredicate: (pred: string) => trait ? trait.evaluate(pred) : false,
        },
      ]);
    }

    // Add player as potential target in their room
    const playerList = roomEntities.get(playerLocation) ?? [];
    playerList.push({
      id: playerId,
      influences: [],
      resistances: [],
      evaluatePredicate: () => false,
    });
    roomEntities.set(playerLocation, playerList);

    // Evaluate passive influences per room
    for (const [roomId, entities] of roomEntities) {
      const results = evaluatePassiveInfluences(entities);

      for (const result of results) {
        if (result.status === 'applied') {
          const influencerConfig = registry.getConfig(result.influencerId);
          const influenceDef = influencerConfig?.influenceDefs?.find(
            d => d.name === result.influenceName,
          );

          registry.influenceTracker.track(
            result.influenceName, result.influencerId, result.targetId,
            result.effect, influenceDef?.duration ?? 'while present',
            turn, influenceDef?.lingeringTurns, influenceDef?.lingeringClearCondition,
          );

          if (roomId === playerLocation && result.witnessed) {
            const influencer = world.getEntity(result.influencerId);
            const target = world.getEntity(result.targetId);
            events.push(createEvent('character.influence.applied', {
              influencerId: result.influencerId, targetId: result.targetId,
              influenceName: result.influenceName, messageId: result.witnessed,
              influencerName: influencer?.name ?? result.influencerId,
              targetName: target?.name ?? result.targetId,
            }, result.influencerId));
          }
        } else if (result.status === 'resisted' && result.resisted && roomId === playerLocation) {
          const influencer = world.getEntity(result.influencerId);
          const target = world.getEntity(result.targetId);
          events.push(createEvent('character.influence.resisted', {
            influencerId: result.influencerId, targetId: result.targetId,
            influenceName: result.influenceName, messageId: result.resisted,
            influencerName: influencer?.name ?? result.influencerId,
            targetName: target?.name ?? result.targetId,
          }, result.influencerId));
        }
      }
    }

    // Expire effects
    const expired = registry.influenceTracker.expireTurn(turn, (targetId, pred) => {
      const entity = world.getEntity(targetId);
      if (!entity) return false;
      const trait = entity.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
      return trait ? trait.evaluate(pred) : false;
    });

    for (const effect of expired) {
      const target = world.getEntity(effect.targetId);
      const targetLoc = target ? world.getLocation(target.id) : undefined;
      if (targetLoc === playerLocation) {
        events.push(createEvent('character.influence.expired', {
          influenceName: effect.influenceName,
          targetId: effect.targetId,
          targetName: target?.name ?? effect.targetId,
        }));
      }
    }

    return events;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a SimpleRoomGraph from the world model. */
function buildRoomGraph(world: WorldModel): SimpleRoomGraph {
  const graph = new SimpleRoomGraph();
  const allEntities = world.getAllEntities();

  for (const entity of allEntities) {
    const roomTrait = entity.get(RoomTrait);
    if (!roomTrait?.exits) continue;

    for (const [direction, exitInfo] of Object.entries(roomTrait.exits)) {
      const exit = exitInfo as IExitInfo;
      if (exit.destination) {
        graph.addConnection(entity.id, exit.destination, direction);
      }
    }
  }

  return graph;
}
