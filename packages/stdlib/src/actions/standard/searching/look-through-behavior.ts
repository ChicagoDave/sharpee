/**
 * Look-through behavior - an instrument's reading of `look through <instrument>` (ADR-376 D6)
 *
 * Public interface: `lookThroughBehavior` (a `CapabilityBehavior` for
 * `if.action.searching` on `SightTrait`) and `registerLookThroughBehavior`
 * (bind it on a world).
 *
 * Owner context: stdlib searching. `look through the target` maps to
 * searching; a thing with `SightTrait` claims that action (ADR-090), so the
 * engine's universal dispatch runs this behavior instead: one look with the
 * instrument's sight from wherever the looker looks — their vehicle, their
 * cell beside it, or a landmark room — rendering looking's sighting rows.
 * Out of any expanse, or with nothing in reach of the glass, it says so.
 * The host registers it per world (ADR-207), as every capability behavior
 * is registered.
 *
 * References:
 * - ADR-376 D6 — instruments; the visibility cap applies through one.
 * - ADR-090, ADR-207 — capability dispatch, per-world registration.
 */

import {
  type CapabilityBehavior,
  type CapabilityEffect,
  createEffect,
  getVehicleAboard,
  type IFEntity,
  lookoutOf,
  SightTrait,
  sightings,
  type WorldModel,
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { SIGHTING_MESSAGE_BY_BAND } from '../looking/looking.js';
import { LookingMessages } from '../looking/looking-messages.js';

export const lookThroughBehavior: CapabilityBehavior = {
  validate() {
    return { valid: true };
  },

  execute() {
    // A look mutates nothing.
  },

  report(entity: IFEntity, world: WorldModel, actorId: string): CapabilityEffect[] {
    const actor = world.getEntity(actorId);
    const lookout = actor ? lookoutOf(world, actor) : undefined;
    const target = nounPhraseFor(entity);
    if (!actor || !lookout) {
      return [createEffect('if.event.searched', { actionId: IFActions.SEARCHING, messageId: `${IFActions.SEARCHING}.looked_through_nothing`, params: { target }, targetId: entity.id }, actorId)];
    }
    const own = getVehicleAboard(world, actorId)?.id ?? actorId;
    const seen = sightings(world, lookout, entity, own);
    const effects: CapabilityEffect[] = [
      createEffect('if.event.searched', { actionId: IFActions.SEARCHING, messageId: `${IFActions.SEARCHING}.${seen.length ? 'looked_through' : 'looked_through_nothing'}`, params: { target }, targetId: entity.id, throughId: entity.id }, actorId),
    ];
    for (const sighting of seen) {
      effects.push(createEffect('if.event.sighted', {
        messageId: `${IFActions.LOOKING}.${sighting.direction ? SIGHTING_MESSAGE_BY_BAND[sighting.band] : LookingMessages.SIGHTING_HERE}`,
        params: { thing: nounPhraseFor(sighting.thing), ...(sighting.direction ? { direction: sighting.direction } : {}) },
        thingId: sighting.thing.id,
        band: sighting.band,
        direction: sighting.direction ?? null,
        distance: sighting.distance,
        throughId: entity.id,
      }, actorId));
    }
    return effects;
  },

  blocked(entity: IFEntity, _world: WorldModel, actorId: string, error: string): CapabilityEffect[] {
    return [createEffect('action.blocked', { actionId: IFActions.SEARCHING, messageId: error, params: { target: nounPhraseFor(entity) } }, actorId)];
  },
};

/**
 * Bind the look-through behavior on a world (idempotent, ADR-207): every
 * thing with `SightTrait` then answers `look through` with a sighting.
 */
export function registerLookThroughBehavior(world: WorldModel): void {
  world.registerCapabilityBehavior(SightTrait.type, IFActions.SEARCHING, lookThroughBehavior);
}
