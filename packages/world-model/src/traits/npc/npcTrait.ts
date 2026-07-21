/**
 * NPC Trait (ADR-070)
 *
 * Marks an entity as a Non-Player Character that can act autonomously.
 * NPCs participate in the turn cycle and can have behaviors.
 */

import { ITrait } from '../trait.js';
import { EntityId } from '@sharpee/core';

/**
 * Interface for NPC trait data
 */
export interface INpcData {
  /**
   * Whether this NPC is hostile to the player.
   * (Life-state — alive/conscious — lives on HealthTrait, ADR-226; hostility moves
   * to disposition in ADR-223 child C.)
   */
  isHostile?: boolean;

  /** Whether this NPC can move between rooms */
  canMove?: boolean;

  /** Rooms this NPC is allowed to enter (undefined = any room) */
  allowedRooms?: EntityId[];

  /** Rooms this NPC cannot enter */
  forbiddenRooms?: EntityId[];

  /** ID of the behavior to use for this NPC */
  behaviorId?: string;

  /** Announce this NPC's movement when it crosses the player's room (default false). */
  announcesMovement?: boolean;

  /**
   * Per-NPC message-ID overrides for movement announcements. Any key left unset
   * falls back to the platform default (npc.leaves / npc.enters / npc.arrives /
   * npc.departs). Override text receives { speaker, direction } params.
   */
  movementMessages?: {
    leaves?: string;   // departure with direction (move)
    enters?: string;   // arrival with direction (move)
    arrives?: string;  // arrival without direction (moveTo)
    departs?: string;  // departure without direction (moveTo)
  };

  /** Conversation state for dialogue */
  conversationState?: string;

  /** Knowledge state - what this NPC knows */
  knowledge?: Record<string, unknown>;

  /** Goal state - what this NPC is trying to do */
  goals?: string[];

  /** Custom NPC properties */
  customProperties?: Record<string, unknown>;
}

/**
 * NPC trait indicates an entity is an autonomous character.
 *
 * NPCs can:
 * - Act during the NPC turn phase
 * - Move between rooms (if canMove is true)
 * - Respond to player actions (speak, attack, observe)
 * - Maintain state across turns
 *
 * The actual behavior logic is defined in NpcBehavior implementations
 * registered with the NpcService.
 */
export class NpcTrait implements ITrait, INpcData {
  static readonly type = 'npc' as const;
  readonly type = 'npc' as const;

  // State properties
  isHostile: boolean;

  // Movement properties
  canMove: boolean;
  allowedRooms?: EntityId[];
  forbiddenRooms?: EntityId[];

  // Behavior reference
  behaviorId?: string;

  // Movement announcement (opt-in)
  announcesMovement: boolean;
  movementMessages?: {
    leaves?: string;
    enters?: string;
    arrives?: string;
    departs?: string;
  };

  // Interaction state
  conversationState?: string;
  knowledge?: Record<string, unknown>;
  goals?: string[];

  // Custom properties
  customProperties?: Record<string, unknown>;

  constructor(data: INpcData = {}) {
    // Set defaults and merge with provided data
    this.isHostile = data.isHostile ?? false;
    this.canMove = data.canMove ?? false;
    this.allowedRooms = data.allowedRooms;
    this.forbiddenRooms = data.forbiddenRooms;
    this.behaviorId = data.behaviorId;
    this.announcesMovement = data.announcesMovement ?? false;
    this.movementMessages = data.movementMessages;
    this.conversationState = data.conversationState;
    this.knowledge = data.knowledge;
    this.goals = data.goals;
    this.customProperties = data.customProperties;
  }

  /**
   * Check if NPC can enter a specific room
   */
  canEnterRoom(roomId: EntityId): boolean {
    if (!this.canMove) return false;

    // Check forbidden rooms first
    if (this.forbiddenRooms?.includes(roomId)) {
      return false;
    }

    // If allowed rooms is defined, room must be in list
    if (this.allowedRooms && !this.allowedRooms.includes(roomId)) {
      return false;
    }

    return true;
  }

  /**
   * Make this NPC hostile
   */
  makeHostile(): void {
    this.isHostile = true;
  }

  /**
   * Make this NPC non-hostile
   */
  makePassive(): void {
    this.isHostile = false;
  }

  /**
   * Set a knowledge item
   */
  setKnowledge(key: string, value: unknown): void {
    if (!this.knowledge) {
      this.knowledge = {};
    }
    this.knowledge[key] = value;
  }

  /**
   * Get a knowledge item
   */
  getKnowledge(key: string): unknown {
    return this.knowledge?.[key];
  }

  /**
   * Check if NPC knows something
   */
  knows(key: string): boolean {
    return this.knowledge?.[key] !== undefined;
  }

  /**
   * Add a goal
   */
  addGoal(goal: string): void {
    if (!this.goals) {
      this.goals = [];
    }
    if (!this.goals.includes(goal)) {
      this.goals.push(goal);
    }
  }

  /**
   * Remove a goal
   */
  removeGoal(goal: string): void {
    if (this.goals) {
      this.goals = this.goals.filter((g) => g !== goal);
    }
  }

  /**
   * Check if NPC has a goal
   */
  hasGoal(goal: string): boolean {
    return this.goals?.includes(goal) ?? false;
  }

  /**
   * Set a custom property
   */
  setCustomProperty(key: string, value: unknown): void {
    if (!this.customProperties) {
      this.customProperties = {};
    }
    this.customProperties[key] = value;
  }

  /**
   * Get a custom property
   */
  getCustomProperty(key: string): unknown {
    return this.customProperties?.[key];
  }
}
