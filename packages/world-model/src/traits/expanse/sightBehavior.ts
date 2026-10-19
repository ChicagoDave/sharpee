/**
 * Sight Behavior - where a looker looks from in an expanse, how far they see, and what is in sight
 *
 * Public interface: `lookoutOf` with its result `Lookout` (the place a
 * looker sees from and their naked sight there), `sightOf` (the sight in
 * use, through an instrument or not, capped by the expanse), `sightingOf`
 * with its result `Sighting` (one thing's distance, band and direction from
 * a lookout), `inSight`, and `sightings` (everything in sight from a
 * lookout, nearest first — the looking report's rows and scope's additions).
 *
 * Owner context: world-model expanse behavior. A looker is an actor: aboard
 * an open vehicle they see from its cell with its sight; out of it in the
 * expanse they see from their own floating position with the sight of the
 * open vehicles in that cell, since they are beside one; in a landmark room
 * they see from its row with its `sight:`, and nothing without the line.
 * Scope reads this (sight is scope in an expanse, D6) and so do the sight
 * conditions and the looking report. Nothing here mutates.
 *
 * References:
 * - ADR-376 D6 — sight, bands, instruments, the visibility cap, a landmark's outlook.
 * - ADR-376 D7 — the sight conditions read the same answers.
 * - ADR-376 D9 — the player out of the vehicle sees with the vehicle's sight.
 */

import type { WorldModel } from '../../world/WorldModel.js';
import type { IFEntity } from '../../entities/if-entity.js';
import { TraitType } from '../trait-types.js';
import { RoomTrait } from '../room/roomTrait.js';
import { VehicleTrait } from '../vehicle/vehicleTrait.js';
import { getVehicleAboard } from '../vehicle/vehicleBehavior.js';
import { sameCell } from './expanseTrait.js';
import { FloatingTrait } from './floatingTrait.js';
import { SightTrait } from './sightTrait.js';
import { sightBandOf, directionOf, distance, placeOf, type CompassHeading, type ExpansePlace, type SightBand } from './expanseBehavior.js';

/** Where a looker sees from, and how far with the naked eye. */
export interface Lookout extends ExpansePlace {
  /** Naked sight from here, before the expanse's cap; zero from a landmark room without `sight:`. */
  sight: number;
}

/**
 * The lookout of an actor (D6, D9): their vehicle's place and sight when
 * aboard an open vehicle in an expanse, their own place beside the open
 * vehicles of their cell when out of it, or their landmark room's row and
 * outlook. Undefined when the actor is positioned in no expanse.
 *
 * @param world - The world model
 * @param actor - The looker
 */
export function lookoutOf(world: WorldModel, actor: IFEntity): Lookout | undefined {
  const vehicle = getVehicleAboard(world, actor.id);
  const model = vehicle?.get(VehicleTrait)?.model;
  if (vehicle && model?.kind === 'open') {
    const place = placeOf(world, vehicle);
    return place ? { ...place, sight: model.sight } : undefined;
  }
  const own = placeOf(world, actor);
  if (own) {
    const beside = world.getContents(own.expanse.id).map((e) => e.get(VehicleTrait)?.model).filter((m) => m?.kind === 'open' && m.position && sameCell(m.position, own.cell));
    const sight = beside.reduce((best, m) => Math.max(best, m?.kind === 'open' ? m.sight : 0), 0);
    return { ...own, sight };
  }
  const room = world.getContainingRoom(actor.id);
  if (!room) return undefined;
  const place = placeOf(world, room);
  return place ? { ...place, sight: room.get(RoomTrait)?.sight ?? 0 } : undefined;
}

/**
 * The sight in use from a lookout (D6): the instrument's when looking
 * through one, else the naked sight, either capped by the expanse's
 * `visibility` when it has one.
 *
 * @param lookout - Where the looker looks from
 * @param instrument - A thing with `SightTrait`, when looking through it
 */
export function sightOf(lookout: Lookout, instrument?: IFEntity): number {
  const reach = instrument?.get(SightTrait)?.sight ?? lookout.sight;
  const cap = lookout.trait.visibility;
  return cap === undefined ? reach : Math.min(reach, cap);
}

/** One thing seen from a lookout: how far, in which band, which way. */
export interface Sighting {
  thing: IFEntity;
  distance: number;
  band: SightBand;
  /** Undefined when the thing shares the looker's cell. */
  direction: CompassHeading | undefined;
}

/**
 * The sighting of a thing from a lookout, or undefined when it is in
 * another expanse, in no expanse, or beyond the sight in use. Rooms never
 * see rooms: a landmark room is a thing here only when the looker is not
 * in one.
 *
 * @param world - The world model
 * @param lookout - Where the looker looks from
 * @param thing - An open vehicle, a floating thing or a landmark room
 * @param instrument - A thing with `SightTrait`, when looking through it
 */
export function sightingOf(world: WorldModel, lookout: Lookout, thing: IFEntity, instrument?: IFEntity): Sighting | undefined {
  const place = placeOf(world, thing);
  if (!place || place.expanse.id !== lookout.expanse.id) return undefined;
  if (thing.has(TraitType.ROOM) && sameCell(place.cell, lookout.cell)) return undefined;
  const d = distance(lookout.cell, place.cell);
  const band = sightBandOf(d, sightOf(lookout, instrument));
  return band ? { thing, distance: d, band, direction: directionOf(lookout.cell, place.cell) } : undefined;
}

/**
 * Everything in sight from a lookout (D6): the expanse's landmark rooms,
 * its open vehicles and its floating things within the sight in use,
 * nearest first, never the looker's own holder. The looking report's rows
 * and scope's additions both read this.
 *
 * @param world - The world model
 * @param lookout - Where the looker looks from
 * @param instrument - A thing with `SightTrait`, when looking through it
 * @param ownHolderId - The vehicle the looker is aboard, or the looker
 *   themself out of it, excluded from the list
 */
export function sightings(world: WorldModel, lookout: Lookout, instrument?: IFEntity, ownHolderId?: string): Sighting[] {
  const candidates: IFEntity[] = [];
  for (const roomId of Object.keys(lookout.trait.landmarks)) {
    const room = world.getEntity(roomId);
    if (room) candidates.push(room);
  }
  for (const thing of world.getContents(lookout.expanse.id)) {
    if (thing.id === ownHolderId) continue;
    const model = thing.get(VehicleTrait)?.model;
    const positioned = (model?.kind === 'open' && model.position) || (thing.has(TraitType.FLOATING) && !thing.has(TraitType.ACTOR) && thing.get(FloatingTrait)?.position);
    if (positioned) candidates.push(thing);
  }
  const out: Sighting[] = [];
  for (const thing of candidates) {
    const sighting = sightingOf(world, lookout, thing, instrument);
    if (sighting) out.push(sighting);
  }
  return out.sort((a, b) => a.distance - b.distance);
}

/**
 * Whether a thing is within an actor's sight in their expanse (D6, D7).
 * False when either is positioned in no expanse.
 */
export function inSight(world: WorldModel, actor: IFEntity, thing: IFEntity, instrument?: IFEntity): boolean {
  const lookout = lookoutOf(world, actor);
  return lookout !== undefined && sightingOf(world, lookout, thing, instrument) !== undefined;
}
