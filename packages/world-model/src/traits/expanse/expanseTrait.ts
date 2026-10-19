/**
 * Expanse Trait - a bounded space with coordinates, held by the room an expanse lowers to
 *
 * Public interface: `ExpanseTrait` (data: the size, the landmark rooms and
 * their cells, the optional sight cap and drift interval, the edge phrases,
 * and the drift machine's state), `IExpanseCell`, `ExpanseSide`,
 * `IExpanseData`, `isExpanseTrait`, `isInsideExpanse`, `sameCell`.
 *
 * Owner context: world-model traits. An expanse is a room (its heading,
 * looking and scope read it as one) carrying this trait, so an open vehicle
 * or a floating thing between landmarks is simply *in* that room, and where
 * in it is the position on the holder's own trait. The expanse stores its
 * size and its landmarks, never its cells, so a thousand-unit sea costs what
 * a twenty-unit pond does. Coordinates are whole units: `x` runs east from 0
 * to `width - 1`, `y` runs north from 0 to `height - 1`.
 *
 * References:
 * - ADR-376 D2 — the expanse kind, its size and landmarks; it lowers to a room.
 * - ADR-376 D6 — `visibility:` caps every looker's sight in it.
 * - ADR-376 D8 — edges, one phrase per side, never crossed.
 * - ADR-376 D10 — `drift:`, the interval floating things move on.
 * - ADR-375 D4 — `wind:`, the bearing the wind comes from, or a calm.
 * - ADR-375 D2 — a sailing vehicle's coordinates are fractional; a cell is a rounded coordinate.
 * - ADR-366 D5g — machine state is trait data, so `turnsToDrift` rides a save.
 */

import { TraitType } from '../trait-types.js';
import { ITrait } from '../trait.js';

/** A cell of an expanse: whole-unit coordinates, x east, y north. */
export interface IExpanseCell {
  x: number;
  y: number;
}

/** The four sides an expanse's edge lines may name (ADR-376 D8). */
export type ExpanseSide = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

/** A wind (ADR-375 D4): the bearing it comes from, 0 north clockwise, or a calm. */
export type ExpanseWind = number | 'calm';

export interface IExpanseData {
  /** `size: <w> by <h>` — cells run 0..width-1 east. One or more. */
  width: number;
  /** `size: <w> by <h>` — cells run 0..height-1 north. One or more. */
  height: number;
  /** The landmark rooms by entity id, each at its cell inside the size. */
  landmarks?: Record<string, IExpanseCell>;
  /** `visibility: <n>` — a cap on every looker's sight here; absent means uncapped. */
  visibility?: number;
  /** `drift: 1 unit every <n> turns` — turns between drift steps; absent means floating things hold still. */
  drift?: number;
  /** The phrase key of each written edge line, by side; an unwritten side uses the stock line. */
  edges?: Partial<Record<ExpanseSide, string>>;
  /** Machine state: turns left before the next drift step. */
  turnsToDrift?: number;
  /** `wind: from <bearing>` / `wind: calm` (ADR-375 D4); absent means the expanse carries no wind. */
  wind?: ExpanseWind;
}

/**
 * Trait for an expanse. The landmark map is the one record of where a
 * landmark room lies; a vehicle at that landmark holds no coordinates of
 * its own (ADR-376 D5).
 */
export class ExpanseTrait implements ITrait, IExpanseData {
  static readonly type = TraitType.EXPANSE;
  readonly type = TraitType.EXPANSE;

  width: number;
  height: number;
  landmarks: Record<string, IExpanseCell>;
  visibility?: number;
  drift?: number;
  edges: Partial<Record<ExpanseSide, string>>;
  turnsToDrift: number;
  wind?: ExpanseWind;

  /**
   * Build the trait, holding the invariants the analyzer reports first: a
   * size of whole units one or more on each axis, every landmark inside it,
   * a drift interval of one turn or more, a visibility of zero or more.
   * @throws when an invariant is broken
   */
  constructor(data: IExpanseData) {
    if (!isWholeAtLeast(data.width, 1) || !isWholeAtLeast(data.height, 1)) {
      throw new Error('ExpanseTrait: a size is whole units, one or more on each axis');
    }
    this.width = data.width;
    this.height = data.height;
    this.landmarks = {};
    for (const [roomId, cell] of Object.entries(data.landmarks ?? {})) {
      if (!isInsideExpanse(this, cell)) {
        throw new Error(`ExpanseTrait: landmark ${roomId} at ${cell.x}, ${cell.y} lies outside ${this.width} by ${this.height}`);
      }
      this.landmarks[roomId] = { x: cell.x, y: cell.y };
    }
    if (data.visibility !== undefined) {
      if (typeof data.visibility !== 'number' || data.visibility < 0) {
        throw new Error('ExpanseTrait: visibility is zero or more');
      }
      this.visibility = data.visibility;
    }
    if (data.drift !== undefined) {
      if (!isWholeAtLeast(data.drift, 1)) {
        throw new Error('ExpanseTrait: a drift interval is a whole number of turns, one or more');
      }
      this.drift = data.drift;
    }
    this.edges = { ...(data.edges ?? {}) };
    this.turnsToDrift = data.turnsToDrift ?? data.drift ?? 0;
    if (data.wind !== undefined) {
      if (data.wind !== 'calm' && (!Number.isInteger(data.wind) || data.wind < 0 || data.wind > 359)) {
        throw new Error('ExpanseTrait: a wind is a bearing of 0 to 359, or calm');
      }
      this.wind = data.wind;
    }
  }
}

function isWholeAtLeast(value: unknown, floor: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= floor;
}

/**
 * Whether a cell lies inside an expanse's size.
 *
 * @param expanse - The expanse's trait
 * @param cell - The cell to test
 */
export function isInsideExpanse(expanse: Pick<IExpanseData, 'width' | 'height'>, cell: IExpanseCell): boolean {
  const c = cellOf(cell);
  return c.x >= 0 && c.x < expanse.width && c.y >= 0 && c.y < expanse.height;
}

/** The cell a coordinate lies in: each axis rounded (ADR-375 D2, fractional positions under sail). */
export function cellOf(at: IExpanseCell): IExpanseCell {
  return { x: Math.round(at.x), y: Math.round(at.y) };
}

/** Whether two coordinates lie in the same cell. */
export function sameCell(a: IExpanseCell, b: IExpanseCell): boolean {
  return Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y);
}

/**
 * Type guard for ExpanseTrait
 */
export function isExpanseTrait(trait: ITrait): trait is ExpanseTrait {
  return trait.type === TraitType.EXPANSE;
}
