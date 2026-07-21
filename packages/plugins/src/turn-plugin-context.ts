import { EntityId, SeededRandom, ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';

/** Summary of the player action that just completed, passed to each plugin. */
export interface TurnPluginActionResult {
  /** The action's id (the verb that ran). */
  actionId: string;
  /**
   * Whether the action GENUINELY succeeded (platform-issue-sweep Phase 7):
   * false when the action was refused/blocked — including modern blocked()
   * paths that reuse the primary event type with `blocked: true` /
   * `failed: true` instead of emitting `action.error`. Plugins still run
   * after refused actions (NPC/scheduler ticks are turn-level); consumers
   * that must not react to refusals (state-machine action triggers) gate on
   * this flag.
   */
  success: boolean;
  /** The action's direct-object entity, when it had one. */
  targetId?: EntityId;
  /** Arbitrary data the action chose to share, keyed by the action. */
  sharedData?: Record<string, unknown>;
}

/** Read-only turn context the engine passes to each plugin's onAfterAction. */
export interface TurnPluginContext {
  /** The live world model. */
  world: WorldModel;
  /** The current turn number. */
  turn: number;
  /** The player entity id. */
  playerId: EntityId;
  /** The player's current location id. */
  playerLocation: EntityId;
  /**
   * The engine's seeded RNG. Use this instead of `Math.random` so turns stay
   * deterministic and replayable.
   */
  random: SeededRandom;
  /** The action that just completed this turn. */
  actionResult?: TurnPluginActionResult;
  /** The semantic events the action emitted this turn. */
  actionEvents?: ISemanticEvent[];
}
