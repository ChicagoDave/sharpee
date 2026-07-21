// packages/world-model/src/traits/listener/listenerTrait.ts

/**
 * Listener trait — marks an entity as eligible to receive
 * `AudibilityEvent`s from the propagation function (ADR-172).
 *
 * Per ADR-172 §Multi-listener dispatch:
 *  - The **player** gets this trait automatically during engine
 *    initialization (Phase 4 wires this); story authors do not add it
 *    manually.
 *  - **NPCs** opt in by attaching the trait (used by L2+ for NPC
 *    reactivity — e.g., an NPC hears a scream and runs toward it).
 *  - **Devices** may also be Listeners (an intercom microphone, a
 *    phone receiver, a recorder); see ADR-172 §Active acoustic
 *    devices (deferred composition pattern).
 *
 * Phase 2 ships the trait as a presence flag — no data fields. Future
 * fields (per-listener sensitivity, deafness, kind filters) require a
 * future ADR.
 *
 * Owner context: `@sharpee/world-model` — sensory primitives.
 *
 * @see ADR-172 — Spatial Sound Propagation
 */

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';

/**
 * Listener trait — presence flag. Entities carrying it are enumerated
 * by the propagation function and receive `AudibilityEvent`s.
 *
 * @example
 * // Engine player init (Phase 4) attaches automatically:
 * player.add(new ListenerTrait());
 *
 * // Story-side NPC opt-in:
 * const guard = author.createEntity('guard', EntityType.ACTOR);
 * guard.add(new ListenerTrait());
 */
export class ListenerTrait implements ITrait {
  static readonly type = TraitType.LISTENER;
  readonly type = TraitType.LISTENER;
}
