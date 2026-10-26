/**
 * PushableTrait — the marker for a thing that can be pushed.
 *
 * The thing says it can be pushed; the way says whether a push moves it
 * between rooms (`admits pushing` on the exit line or the room, read by
 * `TraversalBehavior`), and a switchable thing is toggled by the press. The
 * trait itself carries no fields, as `SceneryTrait` does not: every field
 * the old shape carried either moved to the way (`pushDirection`,
 * `revealsPassage` — now `while` on the exit), or was read by nothing
 * (`pushType`, `pushSound`, `requiresStrength`, `repeatable`, `state`,
 * `pushCount`, `maxPushes`, `activates`, `effects`). A story that needs a
 * fire-once guard keeps it on its own trait.
 *
 * Public interface: PushableTrait.
 * Owner context: world-model — traits.
 *
 * References:
 * - ADR-378 D6, D6a — the marker; the way decides the move.
 */

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';

export class PushableTrait implements ITrait {
  static readonly type = TraitType.PUSHABLE;
  readonly type = TraitType.PUSHABLE;
}
