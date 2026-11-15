/**
 * PullableTrait — the marker for a thing that can be pulled.
 *
 * The thing says it can be pulled; what a pull does is the thing's own
 * clause or interceptor to say, and a pull succeeds every time it is tried.
 * The trait itself carries no fields, as `PushableTrait` and `SceneryTrait`
 * do not: every field the old shape carried was read by nothing outside the
 * pulling action (`pullType`, `activates`, `linkedTo`, `pullSound`,
 * `requiresStrength`, `repeatable`, `maxPulls`, `detachesOnPull`,
 * `effects`), and the two the action wrote (`state`, `pullCount`) made a
 * pullable thing pullable exactly once, with nothing to reset it. A story
 * that needs a fire-once guard keeps it on its own trait or says `, once`
 * on its clause; a thing fixed to another is `AttachedTrait`'s.
 *
 * Public interface: PullableTrait.
 * Owner context: world-model — traits.
 *
 * References:
 * - ADR-378 D6a — the same reduction for `PushableTrait`.
 * - GH #706 — the latch that let only the first pull through.
 */

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';

export class PullableTrait implements ITrait {
  static readonly type = TraitType.PULLABLE;
  readonly type = TraitType.PULLABLE;
}
