/**
 * NPC Trait (ADR-070)
 *
 * Marks an entity as a Non-Player Character that can act autonomously.
 * NPCs participate in the turn cycle and can have behaviors.
 */

import { ITrait } from '../trait';
import { EntityId } from '@sharpee/core';

/**
 * Interface for NPC trait data
 */
export interface INpcData {
  /** Whether this NPC is currently alive */
  isAlive?: boolean;

  /** Whether this NPC is conscious (can act) */
  isConscious?: boolean;

  /** Whether this NPC is hostile to the player */
  isHostile?: boolean;

  /** Whether this NPC can move between rooms */
  canMove?: boolean;

  /** Rooms this NPC is allowed to enter (undefined = any room) */
  allowedRooms?: EntityId[];

  /** Rooms this NPC cannot enter */
  forbiddenRooms?: EntityId[];

  /** ID of the behavior to use for this NPC */
  behaviorId?: string;

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
  isAlive: boolean;
  isConscious: boolean;
  isHostile: boolean;

  // Movement properties
  canMove: boolean;
  allowedRooms?: EntityId[];
  forbiddenRooms?: EntityId[];

  // Behavior reference
  behaviorId?: string;

  // Interaction state
  conversationState?: string;
  knowledge?: Record<string, unknown>;
  goals?: string[];

  // Custom properties
  customProperties?: Record<string, unknown>;

  constructor(data: INpcData = {}) {
    // Set defaults and merge with provided data
    this.isAlive = data.isAlive ?? true;
    this.isConscious = data.isConscious ?? true;
    this.isHostile = data.isHostile ?? false;
    this.canMove = data.canMove ?? false;
    this.allowedRooms = data.allowedRooms;
    this.forbiddenRooms = data.forbiddenRooms;
    this.behaviorId = data.behaviorId;
    this.conversationState = data.conversationState;
    this.knowledge = data.knowledge;
    this.goals = data.goals;
    this.customProperties = data.customProperties;
  }

  /**
   * Check if NPC can act (alive and conscious)
   */
  get canAct(): boolean {
    return this.isAlive && this.isConscious;
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
   * Knock out this NPC (unconscious but alive)
   */
  knockOut(): void {
    this.isConscious = false;
  }

  /**
   * Wake up this NPC
   */
  wakeUp(): void {
    if (this.isAlive) {
      this.isConscious = true;
    }
  }

  /**
   * Kill this NPC
   */
  kill(): void {
    this.isAlive = false;
    this.isConscious = false;
  }

  /**
   * Revive this NPC
   */
  revive(): void {
    this.isAlive = true;
    this.isConscious = true;
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
