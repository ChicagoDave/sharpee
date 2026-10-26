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
 * `getVisible`) and by `isDarkFor`, which looking, arrival and the
 * perception filter ask, so a night-vision observer also sees the dark room
 * it stands in (ADR-374 D5). It says nothing about light itself: the room
 * stays dark for everyone else, and `isDark(room)` is unchanged.
 */
export class NightVisionTrait implements ITrait {
  static readonly type = TraitType.NIGHT_VISION;
  readonly type = TraitType.NIGHT_VISION;
}
