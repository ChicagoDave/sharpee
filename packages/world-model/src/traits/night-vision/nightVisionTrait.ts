// packages/world-model/src/traits/night-vision/nightVisionTrait.ts

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';

/**
 * Night vision marks an observer that sees in the dark (ADR-328 D5).
 *
 * Darkness is a rule about the observer, not the room: a room with no
 * light hides its contents from anyone who needs light to see. An entity
 * carrying this trait does not — the underground thief who robs by feel,
 * a cat, a creature of the deep. Its presence is the fact; there is no data.
 *
 * Checked by `VisibilityBehavior` at the two darkness gates (`canSee`,
 * `getVisible`). It says nothing about light itself: a room stays dark for
 * everyone else, and the observer's own arrival description still reads as
 * a dark room's.
 */
export class NightVisionTrait implements ITrait {
  static readonly type = TraitType.NIGHT_VISION;
  readonly type = TraitType.NIGHT_VISION;
}
