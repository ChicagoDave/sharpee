/**
 * NPC System Types (ADR-070)
 *
 * Types for NPC behaviors and actions.
 */

import { ISemanticEvent, EntityId, SeededRandom } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';

/**
 * Direction for NPC movement
 */
export type Direction =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'northeast'
  | 'northwest'
  | 'southeast'
  | 'southwest'
  | 'up'
  | 'down'
  | 'in'
  | 'out';

/**
 * Context passed to NPC behavior hooks
 */
export interface NpcContext {
  /** The NPC entity */
  npc: IFEntity;

  /** The world model */
  world: WorldModel;

  /** Seeded random number generator */
  random: SeededRandom;

  /** Current turn number */
  turnCount: number;

  /** Player's current location */
  playerLocation: EntityId;

  /** NPC's current location */
  npcLocation: EntityId;

  /** Items in NPC's inventory */
  npcInventory: IFEntity[];

  /** Whether the player is in the same room as the NPC */
  playerVisible: boolean;

  /** Get entities in the NPC's current room */
  getEntitiesInRoom(): IFEntity[];

  /** Get exits from the NPC's current room */
  getAvailableExits(): { direction: Direction; destination: EntityId }[];
}

/**
 * Actions an NPC can take
 *
 * All actions use semantic data (message IDs, entity IDs) rather than raw text.
 */
export type NpcAction =
  | { type: 'move'; direction: Direction }
  | { type: 'moveTo'; roomId: EntityId }
  | { type: 'take'; target: EntityId }
  | { type: 'drop'; target: EntityId }
  | { type: 'attack'; target: EntityId }
  | { type: 'speak'; messageId: string; data?: Record<string, unknown> }
  | { type: 'emote'; messageId: string; data?: Record<string, unknown> }
  | { type: 'wait' }
  | { type: 'custom'; handler: () => ISemanticEvent[] };

/**
 * NPC behavior interface
 *
 * Defines hooks that are called at various points during the game.
 * Each hook returns an array of NpcActions to be executed.
 */
export interface NpcBehavior {
  /** Unique identifier for this behavior */
  id: string;

  /** Human-readable name for debugging */
  name?: string;

  /**
   * Called each turn for this NPC
   * This is the main hook for autonomous NPC behavior.
   */
  onTurn(context: NpcContext): NpcAction[];

  /**
   * Called when the player enters the NPC's room
   */
  onPlayerEnters?(context: NpcContext): NpcAction[];

  /**
   * Called when the player leaves the NPC's room
   */
  onPlayerLeaves?(context: NpcContext): NpcAction[];

  /**
   * Called when the player speaks to/at the NPC
   */
  onSpokenTo?(context: NpcContext, words: string): NpcAction[];

  /**
   * Called when the NPC is attacked
   */
  onAttacked?(context: NpcContext, attacker: IFEntity): NpcAction[];

  /**
   * Called when the NPC observes a player action
   */
  onObserve?(context: NpcContext, actionType: string, actionData: unknown): NpcAction[];

  /**
   * Optional: Get serializable state for save/load
   */
  getState?(npc: IFEntity): Record<string, unknown>;

  /**
   * Optional: Restore state after load
   */
  setState?(npc: IFEntity, state: Record<string, unknown>): void;
}

/**
 * Events emitted by NPC actions
 */
export interface NpcEvent extends ISemanticEvent {
  type:
    | 'npc.moved'
    | 'npc.spoke'
    | 'npc.took'
    | 'npc.dropped'
    | 'npc.attacked'
    | 'npc.emoted'
    | 'npc.died'
    | 'npc.stateChanged';
}

/**
 * Data for NPC movement events
 */
export interface NpcMovedData {
  npc: EntityId;
  from: EntityId;
  to: EntityId;
  direction?: Direction;
}

/**
 * Data for NPC speech events
 */
export interface NpcSpokeData {
  npc: EntityId;
  messageId: string;
  data?: Record<string, unknown>;
}

/**
 * Data for NPC item manipulation events
 */
export interface NpcItemData {
  npc: EntityId;
  target: EntityId;
}

/**
 * Data for NPC emote events
 */
export interface NpcEmoteData {
  npc: EntityId;
  messageId: string;
  data?: Record<string, unknown>;
}

/**
 * Result of NPC combat
 */
export interface NpcCombatData {
  npc: EntityId;
  target: EntityId;
  hit: boolean;
  damage: number;
  targetKilled: boolean;
}
