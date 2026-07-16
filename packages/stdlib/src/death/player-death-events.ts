/**
 * Canonical player-death event — the single wire shape for ADR-224.
 *
 * One typed event, `if.event.player.died`, that both the emitter (`killPlayer`,
 * this module) and the consumers (the stdlib `death` channel and the engine's
 * game-over routing) import from here. Defining the type string and payload once,
 * imported by both sides, is the co-located wire-type discipline (DEVARCH rule 8b):
 * a change to the payload compiles — or fails to compile — every side in the same
 * commit, so the four-way event-name drift ADR-224 catalogued cannot recur.
 *
 * The engine (`@sharpee/engine`) depends on stdlib, not the reverse, so this is the
 * correct home: the lower layer owns the vocabulary, the runtime consumes it.
 *
 * Public interface: `PLAYER_DIED_EVENT`, `IPlayerDiedPayload`.
 * Owner context: `@sharpee/stdlib` — the player-death primitive (ADR-224).
 */

/**
 * The canonical death event type (ADR-224 Q-3). Lives in the platform
 * `if.event.*` namespace because death is not combat-specific — combat is one
 * `cause` among falls, grue, and gas. Retires the pre-ADR-224 split across
 * `combat.player_died`, `if.event.death` (player case), and the bare `player.died`.
 */
export const PLAYER_DIED_EVENT = 'if.event.player.died' as const;

/**
 * Payload of a {@link PLAYER_DIED_EVENT}. Carried on the event's `data` field.
 */
export interface IPlayerDiedPayload {
  /** What killed the player: `'combat'`, `'gas'`, `'grue'`, `'fall'`, etc. Also recorded on the player's `HealthTrait.causeOfDeath`. */
  cause: string;

  /**
   * Terminal-death intent (ADR-224 Q-2). `true` means the engine routes to
   * `game.lost` unless a story policy vetoes first. The engine's final word is
   * the player's derived life-state after dispatch, not this flag (see the
   * routing contract); the flag is the story policy's signal.
   */
  terminal: boolean;

  /** Optional message id for the death text (rendered by the language layer, never an English string here — ADR-158). */
  messageId?: string;
}
