/**
 * ScoringEventProcessor - Declarative scoring hooks for common patterns
 *
 * Provides a clean API for story authors to configure scoring without
 * manually wiring event handlers. Supports:
 * - Treasure scoring (take points + container bonus)
 * - Room visit scoring (first-visit points)
 * - Event sequences (ordered chains like rituals)
 * - Aggregate goals (collect all X)
 * - Conditional unlocks (state changes when conditions met)
 *
 * @see docs/work/scoring/assessment.md
 */

import { IWorldModel, TreasureTrait } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { IScoringService } from './scoring-service';

/**
 * Interface for event processor registration
 * Matches the EventProcessor.registerHandler signature
 */
export interface IEventProcessorRegistration {
  registerHandler(eventType: string, handler: (event: ISemanticEvent, query: unknown) => unknown[]): void;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for a treasure's scoring behavior
 */
export interface TreasureConfig {
  /** Entity ID of the treasure */
  entityId: string;
  /** Points awarded when first taking the treasure */
  takePoints?: number;
  /** Points awarded when placing in the scoring container */
  containerPoints?: number;
  /** Entity ID of the container that awards bonus points (e.g., trophy case) */
  containerId?: string;
}

/**
 * Configuration for room visit scoring
 */
export interface RoomVisitConfig {
  /** Room entity ID */
  roomId: string;
  /** Points awarded on first visit */
  points: number;
}

/**
 * A step in an event sequence
 */
export interface SequenceStep {
  /** Event type to match (e.g., 'if.event.taken') */
  event: string;
  /** Filter to match event data (all properties must match) */
  filter?: Record<string, unknown>;
  /** Optional name for this step (for debugging/display) */
  name?: string;
}

/**
 * Configuration for an event sequence (chained events)
 */
export interface SequenceConfig {
  /** Ordered steps that must happen in sequence */
  steps: SequenceStep[];
  /** Number of turns before sequence resets (optional) */
  timeout?: number;
  /** Called when sequence completes */
  onComplete: (processor: ScoringEventProcessor) => void;
  /** Called after each step completes (optional) */
  onStep?: (stepIndex: number, processor: ScoringEventProcessor) => void;
  /** Whether sequence can be repeated (default: false) */
  repeatable?: boolean;
}

/**
 * Condition types for goals and unlocks
 */
export type GoalCondition =
  | { type: 'item_in_container'; itemId: string; containerId: string }
  | { type: 'item_taken'; itemId: string }
  | { type: 'room_visited'; roomId: string }
  | { type: 'achievement'; id: string }
  | { type: 'sequence_complete'; sequenceId: string }
  | { type: 'score_reached'; score: number }
  | { type: 'custom'; check: (world: IWorldModel) => boolean };

/**
 * Configuration for an aggregate goal
 */
export interface GoalConfig {
  /** Human-readable description */
  description?: string;
  /** List of conditions that must all be met */
  conditions?: GoalCondition[];
  /** Dynamic condition function (alternative to conditions list) */
  conditionFn?: (world: IWorldModel) => boolean;
  /** Called when goal is completed */
  onComplete: (processor: ScoringEventProcessor) => void;
  /** Called when progress changes (optional) */
  onProgress?: (progress: GoalProgress, processor: ScoringEventProcessor) => void;
}

/**
 * Configuration for a conditional unlock
 */
export interface UnlockConfig {
  /** Conditions that trigger the unlock */
  conditions: GoalCondition[];
  /** Called when unlock triggers */
  onUnlock: (processor: ScoringEventProcessor) => void;
}

// ============================================================================
// State Types
// ============================================================================

/**
 * Runtime state for a sequence
 */
export interface SequenceState {
  /** Current step index (0-based) */
  currentStep: number;
  /** Turn when last step was completed */
  lastStepTurn: number;
  /** Whether sequence has been completed */
  completed: boolean;
}

/**
 * Progress information for a goal
 */
export interface GoalProgress {
  /** Number of conditions met */
  completed: number;
  /** Total number of conditions */
  total: number;
  /** Percentage complete (0-100) */
  percentage: number;
  /** IDs of remaining conditions (for condition lists) */
  remaining: string[];
  /** Whether goal is fully complete */
  isComplete: boolean;
}

/**
 * Serializable state for save/restore
 */
export interface ScoringProcessorState {
  /** Set of treasures that have been taken (for take points) */
  takenTreasures: string[];
  /** Set of treasures placed in scoring container (for container points) */
  containerTreasures: string[];
  /** Set of rooms visited (for visit points) */
  visitedRooms: string[];
  /** Sequence states by ID */
  sequences: Record<string, SequenceState>;
  /** Set of completed goals */
  completedGoals: string[];
  /** Set of triggered unlocks */
  triggeredUnlocks: string[];
  /** Current turn count (for sequence timeouts) */
  currentTurn: number;
}

// ============================================================================
// Main Class
// ============================================================================

/**
 * Event processor for declarative scoring configuration
 */
export class ScoringEventProcessor {
  // Registrations
  private treasures: Map<string, TreasureConfig> = new Map();
  private roomVisits: Map<string, RoomVisitConfig> = new Map();
  private sequences: Map<string, SequenceConfig> = new Map();
  private goals: Map<string, GoalConfig> = new Map();
  private unlocks: Map<string, UnlockConfig> = new Map();

  // Runtime state
  private takenTreasures: Set<string> = new Set();
  private containerTreasures: Set<string> = new Set();
  private visitedRooms: Set<string> = new Set();
  private sequenceStates: Map<string, SequenceState> = new Map();
  private completedGoals: Set<string> = new Set();
  private triggeredUnlocks: Set<string> = new Set();
  private currentTurn: number = 0;

  // Default container for all treasures (e.g., trophy case)
  private defaultContainerId?: string;

  // Dynamic treasure mode (check entity properties instead of registration)
  private dynamicTreasureMode: boolean = false;
  private dynamicContainerName?: string;

  // Custom scoring callbacks (for story-specific scoring services)
  private onTreasureTake?: (treasureId: string, points: number) => void;
  private onTreasurePlace?: (treasureId: string, points: number) => void;

  constructor(
    private scoringService: IScoringService,
    private world: IWorldModel
  ) {}

  // ==========================================================================
  // Configuration API
  // ==========================================================================

  /**
   * Set the default container for treasure bonus points
   */
  setDefaultContainer(containerId: string): this {
    this.defaultContainerId = containerId;
    return this;
  }

  /**
   * Enable dynamic treasure mode - detects treasures by entity properties
   * instead of explicit registration.
   *
   * In this mode, entities with these properties are treated as treasures:
   * - isTreasure: boolean (must be true)
   * - treasureValue: number (points for taking)
   * - trophyCaseValue: number (points for placing in container)
   * - treasureId: string (unique ID, defaults to entity ID)
   *
   * @param containerName - Name of the scoring container (e.g., 'trophy case')
   */
  enableDynamicTreasures(containerName: string): this {
    this.dynamicTreasureMode = true;
    this.dynamicContainerName = containerName;
    return this;
  }

  /**
   * Set custom callback for treasure take scoring
   * Use this to integrate with story-specific scoring services
   */
  setTreasureTakeCallback(callback: (treasureId: string, points: number) => void): this {
    this.onTreasureTake = callback;
    return this;
  }

  /**
   * Set custom callback for treasure placement scoring
   * Use this to integrate with story-specific scoring services
   */
  setTreasurePlaceCallback(callback: (treasureId: string, points: number) => void): this {
    this.onTreasurePlace = callback;
    return this;
  }

  /**
   * Register a treasure for scoring
   */
  registerTreasure(config: TreasureConfig): this {
    // Use default container if not specified
    if (!config.containerId && this.defaultContainerId) {
      config = { ...config, containerId: this.defaultContainerId };
    }
    this.treasures.set(config.entityId, config);
    return this;
  }

  /**
   * Register multiple treasures at once
   */
  registerTreasures(configs: TreasureConfig[]): this {
    for (const config of configs) {
      this.registerTreasure(config);
    }
    return this;
  }

  /**
   * Register a room for first-visit scoring
   */
  registerRoomVisit(roomId: string, points: number): this {
    this.roomVisits.set(roomId, { roomId, points });
    return this;
  }

  /**
   * Register an event sequence
   */
  registerSequence(id: string, config: SequenceConfig): this {
    this.sequences.set(id, config);
    this.sequenceStates.set(id, {
      currentStep: 0,
      lastStepTurn: 0,
      completed: false,
    });
    return this;
  }

  /**
   * Register an aggregate goal
   */
  registerGoal(id: string, config: GoalConfig): this {
    this.goals.set(id, config);
    return this;
  }

  /**
   * Register a conditional unlock
   */
  registerUnlock(id: string, config: UnlockConfig): this {
    this.unlocks.set(id, config);
    return this;
  }

  // ==========================================================================
  // Event Handlers - Call these from your story's event handlers
  // ==========================================================================

  /**
   * Initialize event handlers via EventProcessor
   *
   * IMPORTANT: Must be called in onEngineReady(), not initializeWorld()!
   * The EventProcessor doesn't exist during initializeWorld(), and
   * world.registerEventHandler() handlers get overwritten by the engine.
   *
   * @param eventProcessor - The EventProcessor from engine.getEventProcessor()
   */
  initializeHandlers(eventProcessor: IEventProcessorRegistration): this {
    // Handler for treasure take points
    eventProcessor.registerHandler('if.event.taken', (event) => {
      this.handleTaken(event);
      return [];
    });

    // Handler for container placement (trophy case)
    eventProcessor.registerHandler('if.event.put_in', (event) => {
      this.handlePutIn(event);
      return [];
    });

    // Handler for room entry
    eventProcessor.registerHandler('if.event.player_moved', (event) => {
      this.handlePlayerMoved(event);
      return [];
    });

    // Handler for room entry (alternate event name)
    eventProcessor.registerHandler('if.event.actor_moved', (event) => {
      this.handlePlayerMoved(event);
      return [];
    });

    return this;
  }

  /**
   * Handle a taken event (item picked up)
   */
  handleTaken(event: ISemanticEvent): void {
    // Get itemId - try data property first (IGameEvent), then top-level (raw event)
    const eventAny = event as unknown as Record<string, unknown>;
    const data = eventAny.data as Record<string, unknown> | undefined;
    const itemId = (data?.itemId ?? eventAny.itemId) as string | undefined;
    if (!itemId) return;

    // Try registered treasure first
    const config = this.treasures.get(itemId);
    if (config && config.takePoints) {
      if (!this.takenTreasures.has(itemId)) {
        this.takenTreasures.add(itemId);
        if (this.onTreasureTake) {
          this.onTreasureTake(itemId, config.takePoints);
        } else {
          this.scoringService.addPoints(config.takePoints, `Took ${itemId}`);
        }
        this.checkGoalsAndUnlocks();
      }
      return;
    }

    // Dynamic treasure mode - check TreasureTrait
    if (this.dynamicTreasureMode) {
      const item = this.world.getEntity(itemId);
      if (!item) return;

      const treasure = item.get(TreasureTrait);
      if (!treasure) return;

      const treasureValue = treasure.treasureValue || 0;
      const treasureId = treasure.treasureId || item.id;

      if (treasureValue > 0 && !this.takenTreasures.has(treasureId)) {
        this.takenTreasures.add(treasureId);
        if (this.onTreasureTake) {
          this.onTreasureTake(treasureId, treasureValue);
        } else {
          this.scoringService.addPoints(treasureValue, `Took ${treasureId}`);
        }
        this.checkGoalsAndUnlocks();
      }
    }
  }

  /**
   * Handle a put_in event (item placed in container)
   */
  handlePutIn(event: ISemanticEvent): void {
    // Get itemId/targetId - try data property first (IGameEvent), then top-level (raw event)
    const eventAny = event as unknown as Record<string, unknown>;
    const data = eventAny.data as Record<string, unknown> | undefined;
    const itemId = (data?.itemId ?? eventAny.itemId) as string | undefined;
    const targetId = (data?.targetId ?? eventAny.targetId) as string | undefined;
    if (!itemId || !targetId) return;

    // Try registered treasure first
    const config = this.treasures.get(itemId);
    if (config && config.containerPoints) {
      if (config.containerId && config.containerId !== targetId) return;
      if (!this.containerTreasures.has(itemId)) {
        this.containerTreasures.add(itemId);
        if (this.onTreasurePlace) {
          this.onTreasurePlace(itemId, config.containerPoints);
        } else {
          this.scoringService.addPoints(config.containerPoints, `Placed ${itemId} in container`);
        }
        this.checkGoalsAndUnlocks();
      }
      return;
    }

    // Dynamic treasure mode - check TreasureTrait
    if (this.dynamicTreasureMode && this.dynamicContainerName) {
      // Check if target is the scoring container
      const target = this.world.getEntity(targetId);
      if (!target) return;

      const identity = target.get('identity') as { name?: string } | undefined;
      if (identity?.name !== this.dynamicContainerName) return;

      // Check if item is a treasure
      const item = this.world.getEntity(itemId);
      if (!item) return;

      const treasure = item.get(TreasureTrait);
      if (!treasure) return;

      const trophyCaseValue = treasure.trophyCaseValue || 0;
      const treasureId = treasure.treasureId || item.id;

      if (trophyCaseValue > 0 && !this.containerTreasures.has(treasureId)) {
        this.containerTreasures.add(treasureId);
        if (this.onTreasurePlace) {
          this.onTreasurePlace(treasureId, trophyCaseValue);
        } else {
          this.scoringService.addPoints(trophyCaseValue, `Placed ${treasureId} in container`);
        }
        this.checkGoalsAndUnlocks();
      }
    }
  }

  /**
   * Handle a player_moved event (room entry)
   */
  handlePlayerMoved(event: ISemanticEvent): void {
    // Get toRoom - try data property first (IGameEvent), then top-level (raw event)
    const eventAny = event as unknown as Record<string, unknown>;
    const data = eventAny.data as Record<string, unknown> | undefined;
    const toRoomId = (data?.toRoom ?? eventAny.toRoom) as string | undefined;
    if (!toRoomId) return;

    // Check if this room has visit points
    const config = this.roomVisits.get(toRoomId);
    if (!config) return;

    // Award visit points (only once)
    if (!this.visitedRooms.has(toRoomId)) {
      this.visitedRooms.add(toRoomId);
      this.scoringService.addPoints(config.points, `Visited ${toRoomId}`);
      this.checkGoalsAndUnlocks();
    }
  }

  /**
   * Process any event for sequence advancement
   */
  processEventForSequences(event: ISemanticEvent): void {
    for (const [id, config] of this.sequences) {
      const state = this.sequenceStates.get(id);
      if (!state || state.completed) continue;

      // Check for timeout
      if (config.timeout && state.currentStep > 0) {
        const turnsSinceLastStep = this.currentTurn - state.lastStepTurn;
        if (turnsSinceLastStep > config.timeout) {
          // Reset sequence
          state.currentStep = 0;
          state.lastStepTurn = 0;
        }
      }

      // Check if current step matches this event
      const currentStep = config.steps[state.currentStep];
      if (!currentStep) continue;

      if (this.eventMatchesStep(event, currentStep)) {
        // Advance to next step
        state.currentStep++;
        state.lastStepTurn = this.currentTurn;

        // Call onStep callback
        if (config.onStep) {
          config.onStep(state.currentStep - 1, this);
        }

        // Check for completion
        if (state.currentStep >= config.steps.length) {
          state.completed = true;
          config.onComplete(this);

          // Reset if repeatable
          if (config.repeatable) {
            state.currentStep = 0;
            state.completed = false;
          }

          this.checkGoalsAndUnlocks();
        }
      }
    }
  }

  /**
   * Increment the turn counter (call at end of each turn)
   */
  incrementTurn(): void {
    this.currentTurn++;
  }

  // ==========================================================================
  // Query API
  // ==========================================================================

  /**
   * Get progress for a sequence
   */
  getSequenceProgress(id: string): SequenceState | undefined {
    return this.sequenceStates.get(id);
  }

  /**
   * Get progress for a goal
   */
  getGoalProgress(id: string): GoalProgress | undefined {
    const config = this.goals.get(id);
    if (!config) return undefined;

    if (config.conditionFn) {
      // Dynamic condition - binary complete/incomplete
      const isComplete = config.conditionFn(this.world);
      return {
        completed: isComplete ? 1 : 0,
        total: 1,
        percentage: isComplete ? 100 : 0,
        remaining: isComplete ? [] : ['condition'],
        isComplete,
      };
    }

    if (config.conditions) {
      const total = config.conditions.length;
      const remaining: string[] = [];
      let completed = 0;

      for (let i = 0; i < config.conditions.length; i++) {
        const condition = config.conditions[i];
        if (this.checkCondition(condition)) {
          completed++;
        } else {
          remaining.push(this.getConditionId(condition, i));
        }
      }

      return {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 100,
        remaining,
        isComplete: completed === total,
      };
    }

    return {
      completed: 0,
      total: 0,
      percentage: 100,
      remaining: [],
      isComplete: true,
    };
  }

  /**
   * Check if a goal is complete
   */
  isGoalComplete(id: string): boolean {
    return this.completedGoals.has(id);
  }

  /**
   * Check if an unlock has been triggered
   */
  isUnlockTriggered(id: string): boolean {
    return this.triggeredUnlocks.has(id);
  }

  /**
   * Check if a treasure's take points have been awarded
   */
  hasTakenTreasure(entityId: string): boolean {
    return this.takenTreasures.has(entityId);
  }

  /**
   * Check if a treasure's container points have been awarded
   */
  hasPlacedTreasure(entityId: string): boolean {
    return this.containerTreasures.has(entityId);
  }

  /**
   * Check if a room has been visited (for points)
   */
  hasVisitedRoom(roomId: string): boolean {
    return this.visitedRooms.has(roomId);
  }

  // ==========================================================================
  // Direct Scoring API
  // ==========================================================================

  /**
   * Award points once (with deduplication)
   */
  awardOnce(sourceId: string, points: number, reason?: string): boolean {
    if (this.scoringService.hasScored(sourceId)) {
      return false;
    }
    this.scoringService.addPoints(points, reason || sourceId);
    // Mark as scored in the service's internal tracking
    const sources = this.scoringService.getScoredSources();
    sources.push(sourceId);
    this.scoringService.restoreScoredSources(sources);
    return true;
  }

  /**
   * Get the scoring service (for direct access)
   */
  getScoringService(): IScoringService {
    return this.scoringService;
  }

  /**
   * Get the world model (for condition checking)
   */
  getWorld(): IWorldModel {
    return this.world;
  }

  // ==========================================================================
  // Save/Restore
  // ==========================================================================

  /**
   * Get serializable state for saving
   */
  getState(): ScoringProcessorState {
    const sequences: Record<string, SequenceState> = {};
    for (const [id, state] of this.sequenceStates) {
      sequences[id] = { ...state };
    }

    return {
      takenTreasures: Array.from(this.takenTreasures),
      containerTreasures: Array.from(this.containerTreasures),
      visitedRooms: Array.from(this.visitedRooms),
      sequences,
      completedGoals: Array.from(this.completedGoals),
      triggeredUnlocks: Array.from(this.triggeredUnlocks),
      currentTurn: this.currentTurn,
    };
  }

  /**
   * Restore state from save data
   */
  restoreState(state: ScoringProcessorState): void {
    this.takenTreasures = new Set(state.takenTreasures);
    this.containerTreasures = new Set(state.containerTreasures);
    this.visitedRooms = new Set(state.visitedRooms);
    this.completedGoals = new Set(state.completedGoals);
    this.triggeredUnlocks = new Set(state.triggeredUnlocks);
    this.currentTurn = state.currentTurn;

    // Restore sequence states
    for (const [id, savedState] of Object.entries(state.sequences)) {
      if (this.sequenceStates.has(id)) {
        this.sequenceStates.set(id, { ...savedState });
      }
    }
  }

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  /**
   * Check if an event matches a sequence step
   */
  private eventMatchesStep(event: ISemanticEvent, step: SequenceStep): boolean {
    // Check event type
    if (event.type !== step.event) return false;

    // Check filter if present
    if (step.filter) {
      const data = event.data as Record<string, unknown> | undefined;
      if (!data) return false;

      for (const [key, value] of Object.entries(step.filter)) {
        if (data[key] !== value) return false;
      }
    }

    return true;
  }

  /**
   * Check if a condition is met
   */
  private checkCondition(condition: GoalCondition): boolean {
    switch (condition.type) {
      case 'item_in_container': {
        const location = this.world.getLocation(condition.itemId);
        return location === condition.containerId;
      }
      case 'item_taken':
        return this.takenTreasures.has(condition.itemId);
      case 'room_visited':
        return this.visitedRooms.has(condition.roomId);
      case 'achievement':
        return this.scoringService.hasScored(condition.id);
      case 'sequence_complete': {
        const state = this.sequenceStates.get(condition.sequenceId);
        return state?.completed ?? false;
      }
      case 'score_reached':
        return this.scoringService.getScore() >= condition.score;
      case 'custom':
        return condition.check(this.world);
      default:
        return false;
    }
  }

  /**
   * Get a string ID for a condition (for progress tracking)
   */
  private getConditionId(condition: GoalCondition, index: number): string {
    switch (condition.type) {
      case 'item_in_container':
        return `${condition.itemId}→${condition.containerId}`;
      case 'item_taken':
        return condition.itemId;
      case 'room_visited':
        return condition.roomId;
      case 'achievement':
        return condition.id;
      case 'sequence_complete':
        return condition.sequenceId;
      case 'score_reached':
        return `score:${condition.score}`;
      case 'custom':
        return `custom:${index}`;
      default:
        return `unknown:${index}`;
    }
  }

  /**
   * Check all goals and unlocks after a state change
   */
  private checkGoalsAndUnlocks(): void {
    // Check goals
    for (const [id, config] of this.goals) {
      if (this.completedGoals.has(id)) continue;

      const progress = this.getGoalProgress(id);
      if (progress?.isComplete) {
        this.completedGoals.add(id);
        config.onComplete(this);
      } else if (config.onProgress && progress) {
        config.onProgress(progress, this);
      }
    }

    // Check unlocks
    for (const [id, config] of this.unlocks) {
      if (this.triggeredUnlocks.has(id)) continue;

      const allMet = config.conditions.every((c) => this.checkCondition(c));
      if (allMet) {
        this.triggeredUnlocks.add(id);
        config.onUnlock(this);
      }
    }
  }
}
