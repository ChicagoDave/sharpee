/**
 * Expanse Behavior - the geometry of an expanse, where things in it are, and the drift of what floats
 *
 * Public interface: the compass over cells (`COMPASS_HEADINGS`,
 * `headingVector`, `directionOf`), `distance`, the distance bands
 * (`SightBand`, `sightBandOf`), `landmarkAt`, `landmarkCellOf`, `expanseOfLandmark`,
 * `floatingThingsAt`, `receiveInExpanse` (what becomes of a thing that
 * lands in an expanse), `clearFloatingPosition`, and the drift step
 * `driftExpanse` with its result `DriftStep`. Where a thing is in an
 * expanse is a system of its own (`world/ExpansePlaceBehavior.ts`), as is
 * sight across one (`world/SightBehavior.ts`).
 *
 * Owner context: world-model expanse behavior. Every answer is read from the
 * world and the traits; nothing here keeps a position of its own. The
 * mutations are drift (a floating thing's cell, or a wash-up into a
 * landmark's room), a thing received by the expanse (afloat at a cell, or
 * lost offstage, D9/D10), and a floating thing taken out of it. The vehicle's own
 * stepping is `vehicleBehavior.ts`, which reads this module for the
 * landmarks, the floating things and the compass.
 *
 * References:
 * - ADR-376 D2 — landmarks occupy their cells; the expanse is the room between them.
 * - ADR-376 D3 — x grows east, y grows north; the eight headings.
 * - ADR-376 D6 — distance bands at thirds of the sight in use, with a direction.
 * - ADR-376 D10 — drift: one unit a random way per interval, never past an edge,
 *   washing up on a landmark; drawn from the seeded random service (ADR-293).
 */

import { definePoint, type ChoicePoint, type RandomService } from '@sharpee/core';
import type { WorldModel } from '../../world/WorldModel.js';
import type { IFEntity } from '../../entities/if-entity.js';
import { TraitType } from '../trait-types.js';
import { ExpanseTrait, isInsideExpanse, sameCell, type IExpanseCell } from './expanseTrait.js';
import { FloatingTrait } from './floatingTrait.js';

/** The eight compass headings a vehicle or a drift may take, in the world's direction spelling. */
export const COMPASS_HEADINGS = ['NORTH', 'NORTHEAST', 'EAST', 'SOUTHEAST', 'SOUTH', 'SOUTHWEST', 'WEST', 'NORTHWEST'] as const;
export type CompassHeading = typeof COMPASS_HEADINGS[number];

const VECTORS: Record<CompassHeading, IExpanseCell> = {
  NORTH: { x: 0, y: 1 },
  NORTHEAST: { x: 1, y: 1 },
  EAST: { x: 1, y: 0 },
  SOUTHEAST: { x: 1, y: -1 },
  SOUTH: { x: 0, y: -1 },
  SOUTHWEST: { x: -1, y: -1 },
  WEST: { x: -1, y: 0 },
  NORTHWEST: { x: -1, y: 1 },
};

/**
 * The unit vector of a heading (D3: x east, y north) — one of the eight
 * words, or a bearing in degrees (ADR-375 D2, 0 north, clockwise) — or
 * undefined for a word that is not one of the eight.
 */
export function headingVector(heading: string | number): IExpanseCell | undefined {
  if (typeof heading === 'number') {
    const radians = (heading * Math.PI) / 180;
    // Rounded so a cardinal bearing has an exact zero component: a ship
    // heading east is not heading north by a hair (the edge rule reads the sign).
    const tidy = (n: number) => Math.round(n * 1e12) / 1e12;
    return { x: tidy(Math.sin(radians)), y: tidy(Math.cos(radians)) };
  }
  const word = heading.toUpperCase();
  return (COMPASS_HEADINGS as readonly string[]).includes(word) ? VECTORS[word as CompassHeading] : undefined;
}

/** A compass word's bearing (ADR-375 D2), or undefined for any other word. */
export function bearingOf(heading: string | number): number | undefined {
  if (typeof heading === 'number') return ((heading % 360) + 360) % 360;
  const index = (COMPASS_HEADINGS as readonly string[]).indexOf(heading.toUpperCase());
  return index < 0 ? undefined : index * 45;
}

/**
 * The angle between a bearing and the bearing a wind comes from (ADR-375
 * D5): 0 dead into the wind, 180 dead before it.
 */
export function angleOffWind(heading: number, wind: number): number {
  const signed = ((((heading - wind + 180) % 360) + 360) % 360) - 180;
  return Math.abs(signed);
}

/**
 * The compass direction from one cell to another, to the nearest of the
 * eight points; undefined when they are the same cell.
 */
export function directionOf(from: IExpanseCell, to: IExpanseCell): CompassHeading | undefined {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return undefined;
  // Angle from north, clockwise, in eighths of a turn.
  const turns = Math.atan2(dx, dy) / (2 * Math.PI);
  const eighth = Math.round(((turns % 1) + 1) * 8) % 8;
  return COMPASS_HEADINGS[eighth];
}

/** The straight-line distance between two cells, in units. */
export function distance(a: IExpanseCell, b: IExpanseCell): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** The three distance bands (D6), fixed at thirds of the sight in use. */
export type SightBand = 'close-by' | 'in-the-distance' | 'on-the-horizon';

/**
 * The band a distance falls in for a given sight, or undefined when it is
 * out of sight. Thirds: close by to a third, in the distance to two thirds,
 * on the horizon to the sight itself.
 */
export function sightBandOf(d: number, sight: number): SightBand | undefined {
  if (d > sight) return undefined;
  if (d <= sight / 3) return 'close-by';
  if (d <= (2 * sight) / 3) return 'in-the-distance';
  return 'on-the-horizon';
}

/** The landmark room at a cell, by id, or undefined when the cell is open. */
export function landmarkAt(expanse: ExpanseTrait, cell: IExpanseCell): string | undefined {
  for (const [roomId, at] of Object.entries(expanse.landmarks)) {
    if (sameCell(at, cell)) return roomId;
  }
  return undefined;
}

/** A landmark room's cell in an expanse, or undefined when the room is not one of its landmarks. */
export function landmarkCellOf(expanse: ExpanseTrait, roomId: string): IExpanseCell | undefined {
  const cell = expanse.landmarks[roomId];
  return cell ? { x: cell.x, y: cell.y } : undefined;
}

/**
 * The expanse a room is a landmark of, or undefined. A room is a landmark
 * of at most one expanse; the first match is the answer.
 */
export function expanseOfLandmark(world: WorldModel, roomId: string): IFEntity | undefined {
  return world.findByTrait(TraitType.EXPANSE).find((e) => e.get(ExpanseTrait)?.landmarks[roomId] !== undefined);
}

/**
 * The floating things (not actors) in an expanse room at a cell.
 *
 * @param world - The world model
 * @param expanseId - The expanse room
 * @param cell - The cell to look at
 */
export function floatingThingsAt(world: WorldModel, expanseId: string, cell: IExpanseCell): IFEntity[] {
  return world.getContents(expanseId).filter((e) => {
    if (e.has(TraitType.ACTOR)) return false;
    const position = e.get(FloatingTrait)?.position;
    return position !== undefined && position !== null && sameCell(position, cell);
  });
}

/** What became of a thing that landed in an expanse (D9, D10). */
export type ExpanseReceipt = 'floats' | 'lost';

/**
 * A thing lands in an expanse at a cell (D9, D10): one that floats takes the
 * cell and is in the expanse room; anything else is lost — offstage, with
 * no position. The caller reports `lost-overboard`; the move itself is the
 * ordinary `WorldModel.moveEntity`.
 *
 * @param world - The world model
 * @param thing - The thing dropped, thrown or moved into the expanse
 * @param expanseId - The expanse room
 * @param cell - Where it lands, the dropper's cell
 */
export function receiveInExpanse(world: WorldModel, thing: IFEntity, expanseId: string, cell: IExpanseCell): ExpanseReceipt {
  const floating = thing.get(FloatingTrait);
  if (floating) {
    floating.position = { x: cell.x, y: cell.y };
    world.moveEntity(thing.id, expanseId);
    return 'floats';
  }
  world.moveEntity(thing.id, null);
  return 'lost';
}

/**
 * A floating thing leaves the expanse (D10, retrieved; D9, the player boards
 * again): its position is dropped. The move that takes it out is the
 * caller's — taking's, entering's.
 *
 * @returns true when the thing held a position
 */
export function clearFloatingPosition(thing: IFEntity): boolean {
  const floating = thing.get(FloatingTrait);
  if (!floating?.position) return false;
  floating.position = null;
  return true;
}

/** What one drift step did to one floating thing (D10). */
export type DriftStep =
  | { kind: 'drifted'; thingId: string; heading: CompassHeading; cell: IExpanseCell }
  | { kind: 'held'; thingId: string; heading: CompassHeading }
  | { kind: 'washed-up'; thingId: string; heading: CompassHeading; roomId: string };

const driftPoints = new Map<string, ChoicePoint>();

function driftPoint(expanseId: string): ChoicePoint {
  let point = driftPoints.get(expanseId);
  if (!point) {
    point = definePoint(`vehicle.drift.${expanseId}`);
    driftPoints.set(expanseId, point);
  }
  return point;
}

/**
 * One turn of an expanse's drift (ADR-376 D10). Every `drift` turns, each
 * floating thing in the expanse (actors never drift, D9) moves one unit in
 * a compass direction drawn from the seeded service at the point
 * `vehicle.drift.<expanseId>`: a drift that would leave the expanse is not
 * taken, and one that enters a landmark's cell washes the thing up into
 * that room, where it holds no position. The interval is the trait's
 * `turnsToDrift`, so a drift due survives a save.
 *
 * @param world - The world model
 * @param expanse - The expanse room; nothing happens without a `drift:`
 * @param random - The session's random service
 * @returns what moved this turn, empty between drift steps
 */
export function driftExpanse(world: WorldModel, expanse: IFEntity, random: RandomService): DriftStep[] {
  const trait = expanse.get(ExpanseTrait);
  if (!trait || trait.drift === undefined) return [];
  trait.turnsToDrift -= 1;
  if (trait.turnsToDrift > 0) return [];
  trait.turnsToDrift = trait.drift;

  const steps: DriftStep[] = [];
  const point = driftPoint(expanse.id);
  for (const thing of world.getContents(expanse.id)) {
    if (thing.has(TraitType.ACTOR)) continue;
    const floating = thing.get(FloatingTrait);
    if (!floating?.position) continue;
    const heading = random.pick(point, COMPASS_HEADINGS);
    const vector = VECTORS[heading];
    const cell = { x: floating.position.x + vector.x, y: floating.position.y + vector.y };
    if (!isInsideExpanse(trait, cell)) {
      steps.push({ kind: 'held', thingId: thing.id, heading });
      continue;
    }
    const landmark = landmarkAt(trait, cell);
    if (landmark !== undefined) {
      floating.position = null;
      world.moveEntity(thing.id, landmark);
      steps.push({ kind: 'washed-up', thingId: thing.id, heading, roomId: landmark });
      continue;
    }
    floating.position = cell;
    steps.push({ kind: 'drifted', thingId: thing.id, heading, cell });
  }
  return steps;
}
