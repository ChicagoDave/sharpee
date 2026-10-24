/**
 * act-seats.ts — how an acting statement seats the slots it names, in one
 * home for the analyzer's goal-step lowering and the loader's acting
 * statement: each entity slot by the action's seat table, each instrument
 * slot as the instrument, whatever order the statement names them in.
 *
 * Invariants:
 * - An action's roles are its own (a story action's lines, else the
 *   standard action's manifest facts), extended in definition order by
 *   every `extend action` aimed at it — the table the action has once the
 *   story loads.
 * - A slot is seated by its name, never by its position in the statement.
 *   A name with no seat and no instrument type is refused, never guessed.
 *
 * Public interface: actionRoles, seatActBindings, ActionRoles, RoleSource,
 * ActSeating, ActSeatResult.
 * Owner context: @sharpee/chord. Browser-safe: it reads the generated
 * stdlib manifest and the pattern module, nothing of the platform runtime.
 *
 * References:
 * - ADR-383 D3, D4 — seat tables and their extension.
 * - ADR-383 D6 — dispatch and the acting statement read the seat table.
 * - ADR-329 — the acting statement and goal steps.
 */

import { seatTable, type LowerableAction, type SeatTable } from './patterns.js';
import { STDLIB_MANIFEST, type ActSlotType } from './stdlib-manifest.js';

/** What seating an action's slots needs: the seat table and the typed slots it leaves out. */
export interface ActionRoles {
  /** Each entity slot name's one seat. */
  seats: SeatTable;
  /** Each typed slot name's type (`text` for a greedy slot). */
  typed: Readonly<Record<string, ActSlotType>>;
}

/** The story's actions and grammar extensions, as the IR or the analyzer holds them. */
export interface RoleSource {
  actions: ReadonlyArray<LowerableAction & { name: string }>;
  extensions: ReadonlyArray<LowerableAction & { action: string }>;
}

/** Where an acting statement's bindings sit in the command it builds. */
export interface ActSeating<T> {
  directObject?: T;
  indirectObject?: T;
  instrument?: T;
}

/** The seating, or the first slot that has no seat, with its type when it has one. */
export type ActSeatResult<T> =
  | { ok: true; seating: ActSeating<T> }
  | { ok: false; slot: string; type?: Exclude<ActSlotType, 'instrument'> };

/**
 * The roles of the action a statement names, story-first: a story action
 * of the name shadows the standard one, as clause heads resolve. Each
 * extension of that name then adds its lines' names to the table.
 * @param name the action's bare name (`giving`, `presenting`)
 * @param source the story's actions and grammar extensions
 * @returns the seat table and the typed slots; empty for an action with neither
 */
export function actionRoles(name: string, source: RoleSource): ActionRoles {
  const own = source.actions.find((action) => action.name === name);
  const facts = STDLIB_MANIFEST.locales['en-US'];
  const standardId = `if.action.${name}`;
  let seats: SeatTable = own ? seatTable(own).table : (facts.grammarSeats[standardId] ?? {});
  const typed: Record<string, ActSlotType> = own ? typedSlotsOf(own) : { ...(facts.grammarSlotTypes[standardId] ?? {}) };
  for (const extension of source.extensions) {
    if (extension.action !== name) continue;
    seats = seatTable(extension, seats).table;
    Object.assign(typed, typedSlotsOf(extension));
  }
  return { seats, typed };
}

/** An action's typed slots from its own lines: `is an instrument`, `is a topic`, `takes the rest of the line`. */
function typedSlotsOf(action: LowerableAction): Record<string, ActSlotType> {
  const typed: Record<string, ActSlotType> = {};
  for (const slot of action.slotTypes ?? []) typed[slot.slot] = slot.type;
  for (const slot of action.greedy ?? []) typed[slot] = 'text';
  return typed;
}

/**
 * Seat an acting statement's bindings by name: an instrument slot as the
 * instrument, every other slot in the seat the action's table gives it.
 * A `direction` binding is the caller's and must not be passed.
 * @param bound the statement's bindings, in the order it names them
 * @param roles the action's roles, from `actionRoles`
 * @returns the seating, or the first slot that has no seat
 * @throws Error when two bindings land in one seat — a matched shape names
 *   each of its slots once and its table seats them apart, so only rogue
 *   input reaches this
 */
export function seatActBindings<T>(bound: ReadonlyArray<{ slot: string; value: T }>, roles: ActionRoles): ActSeatResult<T> {
  const seating: ActSeating<T> = {};
  for (const { slot, value } of bound) {
    const type = roles.typed[slot];
    if (type === 'instrument') {
      seating.instrument = value;
      continue;
    }
    const seat = roles.seats[slot];
    if (seat === undefined) return type === undefined ? { ok: false, slot } : { ok: false, slot, type };
    const role = seat === 'direct' ? 'directObject' : 'indirectObject';
    if (role in seating) throw new Error(`\`${slot}\` and another slot both take the ${seat} seat`);
    seating[role] = value;
  }
  return { ok: true, seating };
}
