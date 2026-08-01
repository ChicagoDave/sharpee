import { ISemanticEvent } from '@sharpee/core';
import { TurnPluginContext } from './turn-plugin-context.js';

/**
 * A turn-cycle plugin: code that runs once after each successful player action
 * to contribute additional world changes and events (ADR-120).
 *
 * The engine invokes every registered plugin's {@link TurnPlugin.onAfterAction}
 * in descending {@link TurnPlugin.priority} order (NPC behaviour at 100, state
 * machines at 75, the scheduler at 50). Plugins do not run for meta-commands or
 * for failed actions.
 */
export interface TurnPlugin {
  /** Unique plugin identifier. Registering two plugins with the same id throws. */
  id: string;
  /** Run order within a turn; higher priority runs first. */
  priority: number;
  /**
   * Called once per successful player action. Return the semantic events the
   * plugin produces; the engine merges a non-empty array into the turn's event
   * stream. Return an empty array to contribute nothing.
   */
  onAfterAction(context: TurnPluginContext): ISemanticEvent[];
  /** Optional: return serializable state to persist when the game is saved. */
  getState?(): unknown;
  /** Optional: restore previously-saved state when the game is loaded. */
  setState?(state: unknown): void;
  /**
   * Optional: receive the session seed before the first turn (ADR-293).
   * The engine calls this once at `start()` with a seed derived from the
   * session's master seed and this plugin's id, so a plugin that owns its
   * own RNG (e.g. the scheduler) becomes seed-reproducible without
   * coupling to engine internals. Plugins without internal randomness
   * simply omit it.
   */
  onSessionSeed?(seed: number): void;
}
