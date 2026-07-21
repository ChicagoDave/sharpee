/**
 * `killPlayer` — the single Sharpee-Way player-death primitive (ADR-224 Decision 2).
 *
 * Every death mechanism (combat, a deadly-room verb-allowlist, a probabilistic
 * grue, a gas interceptor, a scheduler daemon) calls this instead of hand-mutating
 * a dead flag or hand-emitting an ad-hoc event. It applies the lethal transition to
 * the player's `HealthTrait` (the single mortality substrate, ADR-226) and returns
 * the canonical {@link PLAYER_DIED_EVENT}; the caller routes that event into its
 * event stream (an action's report list, an interceptor's effects, a daemon's
 * returned events). The engine observes the event and owns game-over routing.
 *
 * Public interface: `killPlayer`.
 * Owner context: `@sharpee/stdlib` — the player-death primitive (ADR-224).
 */

import type { ISemanticEvent } from '@sharpee/core';
import { createEvent } from '@sharpee/core';
import type { IFEntity, WorldModel } from '@sharpee/world-model';
import { TraitType, HealthTrait, HealthBehavior } from '@sharpee/world-model';
import { PLAYER_DIED_EVENT, IPlayerDiedPayload } from './player-death-events.js';

/**
 * Options for {@link killPlayer}.
 */
export interface IKillPlayerOptions {
  /** Cause of death, recorded on the event and on `HealthTrait.causeOfDeath`. */
  cause: string;

  /** Optional death-text message id (language layer renders it — never English here). */
  messageId?: string;

  /**
   * Terminal-death intent (ADR-224 Q-2). Defaults to `true`. A story reincarnation
   * policy reads this off the event but the engine's decision is the player's derived
   * life-state after dispatch, so `terminal:false` alone does not keep the game running.
   */
  terminal?: boolean;
}

/**
 * Kill the player: apply a terminal lethal transition to the player's `HealthTrait`
 * and produce the canonical death event.
 *
 * Lazily attaches a `HealthTrait` if the player has none — a death-capable game must
 * always give `killPlayer`'s lethal transition a target (ADR-223 AC-1 caveat), so the
 * `HealthTrait` opt-in rule does not apply to the player in such a game.
 *
 * Idempotent: if the player is already `dead`, this is a no-op that returns `null`, so
 * a second call in the same turn does not re-emit the event or double-route game-over.
 *
 * @param world the world model (unused today; kept for signature stability and future scope resolution)
 * @param player the player entity to kill
 * @param opts cause, optional message id, terminal intent (default `true`)
 * @returns the canonical `if.event.player.died` event, or `null` if the player was already dead
 */
export function killPlayer(
  world: WorldModel,
  player: IFEntity,
  opts: IKillPlayerOptions,
): ISemanticEvent | null {
  const { cause, messageId, terminal = true } = opts;

  let health = player.get(TraitType.HEALTH) as HealthTrait | undefined;

  // Already dead → no-op (idempotent; prevents double game-over routing).
  if (health && !HealthBehavior.isAlive(health)) {
    return null;
  }

  // Death-capable game: the player must carry a HealthTrait (ADR-223 AC-1 caveat).
  if (!health) {
    health = new HealthTrait();
    player.add(health);
  }

  HealthBehavior.kill(health, cause);

  const payload: IPlayerDiedPayload = { cause, terminal };
  if (messageId !== undefined) payload.messageId = messageId;

  return createEvent(
    PLAYER_DIED_EVENT,
    payload as unknown as Record<string, unknown>,
    { actor: player.id },
  );
}
