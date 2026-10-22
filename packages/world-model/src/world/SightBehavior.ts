/**
 * SightBehavior — where a looker looks from in an expanse, how far they see, and what is in sight
 *
 * A system in ADR-379's sense: one rule over the whole world, read by
 * visibility and reachability, the story's sight conditions and scheduler
 * constructs, and the looking, examining, throwing and look-through
 * actions. A looker is an actor: aboard an open vehicle under way they see
 * from its cell with its sight; out of it in the expanse they see from
 * their own floating position with the sight of the open vehicles in that
 * cell, since they are beside one; in a landmark room — aboard a vehicle
 * moored there too — they see from its row with the landmark's outlook,
 * and nothing without the line. Nothing here mutates.
 *
 * Public interface: `lookoutOf` with its result `Lookout` (the place a
 * looker sees from and their naked sight there), `sightOf` (the sight in
 * use, through an instrument or not, capped by the expanse), `sightingOf`
 * with its result `Sighting` (one thing's distance, band and direction from
 * a lookout), `inSight`, `sightings` (everything in sight from a lookout,
 * nearest first — the looking report's rows and scope's additions), and
 * `seenFromAfar` (the distant prose of a thing seen across the expanse).
 * Owner context: world-model — sight across an expanse (the system's home).
 *
 * References:
 * - ADR-376 D6 — sight, bands, instruments, the visibility cap, a landmark's outlook.
 * - ADR-376 D7 — the sight conditions read the same answers.
 * - ADR-376 D9 — the player out of the vehicle sees with the vehicle's sight.
 * - GH #612 — aboard at a landmark, the landmark's outlook.
 */

import type { WorldModel } from './WorldModel.js';
import type { IFEntity } from '../entities/if-entity.js';
import { TraitType } from '../traits/trait-types.js';
import { VehicleTrait } from '../traits/vehicle/vehicleTrait.js';
import { getVehicleAboard } from '../traits/vehicle/vehicleBehavior.js';
import { sameCell } from '../traits/expanse/expanseTrait.js';
import { SightTrait } from '../traits/expanse/sightTrait.js';
import { LandmarkTrait } from '../traits/expanse/landmarkTrait.js';
import { sightBandOf, directionOf, distance, type CompassHeading, type SightBand } from '../traits/expanse/expanseBehavior.js';
import { holderOf, placeOf, type ExpansePlace } from './ExpansePlaceBehavior.js';

/** Where a looker sees from, and how far with the naked eye. */
export interface Lookout extends ExpansePlace {
  /** Naked sight from here, before the expanse's cap; zero from a landmark room without `sight:`. */
  sight: number;
}

/**
 * The lookout of an actor (D6, D9): their vehicle's place and sight when
 * aboard an open vehicle under way in an expanse, their own place beside
 * the open vehicles of their cell when out of it, or their landmark room's
 * row and outlook — aboard a vehicle moored at that landmark too. Undefined
 * when the actor is positioned in no expanse.
 *
 * @param world - The world model
 * @param actor - The looker
 */
export function lookoutOf(world: WorldModel, actor: IFEntity): Lookout | undefined {
  const vehicle = getVehicleAboard(world, actor.id);
  const model = vehicle?.get(VehicleTrait)?.model;
  if (vehicle && model?.kind === 'open') {
    // Under way, the vehicle's cell and sight. Moored at a landmark, the
    // looker is in the landmark room and sees from its row with the room's
    // own outlook, as any looker there does — the room branch below (GH #612).
    const place = placeOf(world, vehicle);
    if (place && !place.landmark) return { ...place, sight: model.sight };
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
  return place ? { ...place, sight: room.get(LandmarkTrait)?.sight ?? 0 } : undefined;
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
 * in one. A vehicle moored at a landmark is seen as part of its room, not
 * on its own.
 *
 * @param world - The world model
 * @param lookout - Where the looker looks from
 * @param thing - An open vehicle, a floating thing or a landmark room
 * @param instrument - A thing with `SightTrait`, when looking through it
 */
export function sightingOf(world: WorldModel, lookout: Lookout, thing: IFEntity, instrument?: IFEntity): Sighting | undefined {
  const place = placeOf(world, thing);
  if (!place || place.expanse.id !== lookout.expanse.id) return undefined;
  if (place.landmark && place.landmark.id !== thing.id) return undefined;
  if (thing.has(TraitType.ROOM) && sameCell(place.cell, lookout.cell)) return undefined;
  const d = distance(lookout.cell, place.cell);
  const band = sightBandOf(d, sightOf(lookout, instrument));
  return band ? { thing, distance: d, band, direction: directionOf(lookout.cell, place.cell) } : undefined;
}

/**
 * Everything in sight from a lookout (D6): the expanse's landmark rooms,
 * its open vehicles and its floating things within the sight in use,
 * nearest first, never the looker's own holder nor an actor. The looking
 * report's rows and scope's additions both read this.
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
  // Whatever the expanse room holds is placed or is not; sightingOf asks.
  for (const thing of world.getContents(lookout.expanse.id)) {
    if (thing.id !== ownHolderId && !thing.has(TraitType.ACTOR)) candidates.push(thing);
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

/**
 * The distant prose of a thing an actor sees only from afar (D6): a
 * landmark room or an open vehicle that is placed itself (not held in
 * another), in sight, and not where the looker is — its `seen from afar:`
 * line. Undefined when the thing is near, out of sight, carries no such
 * line (a floating thing), or the looker is in no expanse; examining then
 * shows the description as ever.
 *
 * @param world - The world model
 * @param actor - The looker
 * @param thing - The thing looked at
 */
export function seenFromAfar(world: WorldModel, actor: IFEntity, thing: IFEntity): string | undefined {
  const text = thing.get(LandmarkTrait)?.seenFromAfar ?? openModelOf(thing)?.seenFromAfar;
  if (text === undefined || holderOf(world, thing)?.id !== thing.id) return undefined;
  const lookout = lookoutOf(world, actor);
  if (!lookout) return undefined;
  const sighting = sightingOf(world, lookout, thing);
  if (!sighting || sameCell(placeOf(world, thing)!.cell, lookout.cell)) return undefined;
  return text;
}

function openModelOf(thing: IFEntity) {
  const model = thing.get(VehicleTrait)?.model;
  return model?.kind === 'open' ? model : undefined;
}
