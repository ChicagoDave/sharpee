/**
 * ExpansePlaceBehavior — where a thing is in an expanse.
 *
 * A system in ADR-379's sense: one answer to "where is this in an
 * expanse?", consulted by sight, reach, the vehicle machine, setting a
 * course and the story's conditions alike. An entity directly in an
 * expanse room holds a cell of its own (an open vehicle, a floating thing,
 * a player out of the vehicle); a landmark room's cell is its row; an open
 * vehicle moored at a landmark holds no cell (ADR-376 D5) and is at that
 * landmark's row. `holderOf` names the positioned thing an entity is in or
 * is, whose place is the entity's for sight and reach.
 *
 * Public interface: `placeOf` with its result `ExpansePlace`, `holderOf`.
 * Owner context: world-model — expanse place (the system's home). Nothing
 * here mutates.
 *
 * References: ADR-376 D2 (landmarks occupy their cells), D5 (a vehicle at a
 * landmark holds no position), D6 and D10 (a held thing's place is its
 * holder's).
 */

import type { WorldModel } from './WorldModel.js';
import type { IFEntity } from '../entities/if-entity.js';
import { TraitType } from '../traits/trait-types.js';
import { ExpanseTrait, type IExpanseCell } from '../traits/expanse/expanseTrait.js';
import { FloatingTrait } from '../traits/expanse/floatingTrait.js';
import { VehicleTrait } from '../traits/vehicle/vehicleTrait.js';
import { expanseOfLandmark, landmarkCellOf } from '../traits/expanse/expanseBehavior.js';

/**
 * Where something is in an expanse: the expanse room, its trait, and the
 * cell — and, when the cell is a landmark's row, that landmark room.
 */
export interface ExpansePlace {
  expanse: IFEntity;
  trait: ExpanseTrait;
  cell: IExpanseCell;
  /**
   * The landmark room whose row this is: the room itself, or the room an
   * open vehicle is moored in. Absent for a cell held in the open.
   */
  landmark?: IFEntity;
}

/** The cell an entity's own trait holds: an open vehicle's or a floating trait's. */
function positionHeld(entity: IFEntity): IExpanseCell | null | undefined {
  const floating = entity.getTrait(FloatingTrait);
  if (floating) return floating.position;
  const vehicle = entity.getTrait(VehicleTrait);
  return vehicle?.movement?.kind === 'open' ? vehicle.movement.position : undefined;
}

/** A landmark room's place: its expanse and its row, or undefined when it is no landmark. */
function landmarkPlace(world: WorldModel, room: IFEntity): ExpansePlace | undefined {
  const expanse = expanseOfLandmark(world, room.id);
  const trait = expanse?.get(ExpanseTrait);
  const cell = trait ? landmarkCellOf(trait, room.id) : undefined;
  return expanse && trait && cell ? { expanse, trait, cell, landmark: room } : undefined;
}

/**
 * The place of an entity in an expanse.
 *
 * @param world - The world model
 * @param entity - A landmark room; an open vehicle, positioned or moored at
 *   a landmark; a floating thing; an actor out of a vehicle
 * @returns the place, or undefined when the entity is in no expanse
 */
export function placeOf(world: WorldModel, entity: IFEntity): ExpansePlace | undefined {
  if (entity.has(TraitType.ROOM)) return landmarkPlace(world, entity);
  const position = positionHeld(entity);
  const location = world.getLocation(entity.id);
  const here = location !== undefined ? world.getEntity(location) : undefined;
  if (position) {
    const trait = here?.get(ExpanseTrait);
    return here && trait ? { expanse: here, trait, cell: { x: position.x, y: position.y } } : undefined;
  }
  // ADR-376 D5: an open vehicle at a landmark holds no position; it is at
  // the landmark's row.
  const moored = position === null && entity.getTrait(VehicleTrait)?.movement?.kind === 'open' && here?.has(TraitType.ROOM);
  return moored ? landmarkPlace(world, here!) : undefined;
}

/**
 * The positioned thing an entity is, or is held in at any depth: an open
 * vehicle, a floating thing, or an actor out of a vehicle with a position;
 * or the landmark room it is in. Undefined when nothing on the way up is
 * placed. The holder's place is the entity's place for sight and reach
 * (D6, D10): a lamp in a distant ship is as far off as the ship, and a
 * vehicle moored at a landmark is wherever its room is.
 *
 * @param world - The world model
 * @param entity - Any entity
 */
export function holderOf(world: WorldModel, entity: IFEntity): IFEntity | undefined {
  const seen = new Set<string>();
  let current: IFEntity | undefined = entity;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.hasTrait(TraitType.ROOM)) return expanseOfLandmark(world, current.id) ? current : undefined;
    if (positionHeld(current)) return current;
    const location = world.getLocation(current.id);
    current = location !== undefined ? world.getEntity(location) : undefined;
  }
  return undefined;
}
