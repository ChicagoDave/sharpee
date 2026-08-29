/**
 * NPC decision-layer types (ADR-070; ADR-328 D5).
 *
 * A behavior DECIDES what an NPC does each turn; the platform EXECUTES it.
 * The seam between the two is `NpcContext.act`: the behavior names a
 * standard action and its slots, and the engine runs that action's four
 * phases for the NPC through the same execution entry the player's
 * commands take (ADR-328 D1/D2). There is no second action universe — an
 * NPC's take can be refused by a trait, intercepted, witnessed, and
 * narrated exactly as the player's can, because it IS the same action.
 *
 * Public interface: NpcBehavior, NpcContext, ActSlots, ActResult,
 * ExecutionEntry.
 * Owner context: stdlib / npc (decision layer; the engine owns the tick).
 */

import { type ISemanticEvent, type EntityId, type RandomService } from '@sharpee/core';
import { IFEntity, WorldModel, type DirectionType } from '@sharpee/world-model';

/**
 * The resolved slots of an action an NPC performs. There is no parser
 * step, so the behavior has already chosen the entities; the action's own
 * `validate()` still applies every actor-relative check to them.
 */
export interface ActSlots {
  /** Direct object, if the action takes one */
  directObject?: IFEntity;
  /** Indirect object, if the action takes one */
  indirectObject?: IFEntity;
  /** Instrument (ADR-080), if the action takes one */
  instrument?: IFEntity;
  /** Direction of travel, for `if.action.going` */
  direction?: DirectionType;
}

/**
 * What came back from running an action as an NPC: whether the action
 * genuinely ran (false when `validate()` refused it) and the events it
 * produced. The engine's `TurnResult` satisfies this shape; the decision
 * layer sees only these two facts.
 */
export interface ActResult {
  /** True when the action ran its execute/report phases; false when refused */
  success: boolean;
  /** Every semantic event the action emitted (refusals included) */
  events: ISemanticEvent[];
}

/**
 * The execution entry as the actor phase sees it — `(actor, action, slots)`
 * to the four phases (ADR-328 D2). Supplied by the engine, which owns the
 * `CommandExecutor`; the decision layer never constructs one.
 */
export type ExecutionEntry = (actorId: EntityId, actionId: string, slots?: ActSlots) => ActResult;

/**
 * Context passed to NPC behavior hooks: what the NPC can see of the world,
 * plus the two things a behavior can DO — act, and narrate.
 */
export interface NpcContext {
  /** The NPC entity */
  npc: IFEntity;

  /** The world model */
  world: WorldModel;

  /** Seeded random number generator */
  random: RandomService;

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

  /** Get exits from the NPC's current room the NPC is allowed to take */
  getAvailableExits(): { direction: DirectionType; destination: EntityId }[];

  /**
   * Perform a standard action as this NPC, right now, through the real
   * execution entry (ADR-328 D5). Runs synchronously: the world has
   * changed (or the action was refused) by the time this returns, so a
   * behavior can act on the outcome — a refused take is `success: false`.
   * The action's events join this turn's stream in the order acted.
   *
   * @param actionId - A standard action id, e.g. `if.action.taking`
   * @param slots - The entities (and direction) the action operates on
   * @returns Whether the action ran, and the events it emitted
   */
  act(actionId: string, slots?: ActSlots): ActResult;

  /**
   * Say something to the player about this NPC that is not an action —
   * a growl, a greeting, a blocking line. Emits one `game.message` fact
   * with this NPC as its actor at the NPC's current location, so presence
   * tagging (ADR-328 D3) decides whether the player witnesses it and actor
   * voice (D4) renders it in the NPC's person.
   *
   * @param message - A message id resolved by the language layer, or
   *   `{ text }` for a line the behavior has already written in full
   * @param params - Template parameters for a message id
   */
  narrate(message: string | { text: string }, params?: Record<string, unknown>): void;
}

/**
 * NPC behavior interface — the decision layer.
 *
 * Each hook is called with an {@link NpcContext} and does its work through
 * `context.act` and `context.narrate`; hooks return nothing. A behavior
 * that wants to wait simply does neither.
 */
export interface NpcBehavior {
  /** Unique identifier for this behavior */
  id: string;

  /** Human-readable name for debugging */
  name?: string;

  /**
   * Called each turn for this NPC.
   * This is the main hook for autonomous NPC behavior.
   */
  onTurn(context: NpcContext): void;

  /**
   * Called when the player enters the NPC's room
   */
  onPlayerEnters?(context: NpcContext): void;

  /**
   * Called when the player leaves the NPC's room
   */
  onPlayerLeaves?(context: NpcContext): void;

  /**
   * Optional: Get serializable state for save/load
   */
  getState?(npc: IFEntity): Record<string, unknown>;

  /**
   * Optional: Restore state after load
   */
  setState?(npc: IFEntity, state: Record<string, unknown>): void;
}
