/**
 * vehicles.ts — what every `vehicle` block declares, collected once so the
 * statements, conditions and anchors written anywhere in the story can be
 * checked against the vehicle's movement type before its own block is built.
 *
 * The registry reads the parsed lines only; names stay unresolved here and
 * are resolved by whoever asks, with the resolver they already hold. The
 * movement table is ADR-366 D5's table, written down once: the lines each
 * type takes and requires, whether it is steered and started on a heading,
 * and which drives, command sets, statements and conditions it takes. Its
 * keys are the IR's `MOVEMENT_TYPES`, so a new type is one row here.
 *
 * Public interface: VehicleDecl, VehicleMovement, VehicleDrive,
 * collectVehicles(), isVehicleDecl(), vehicleLineOf(), MOVEMENT_TABLE,
 * placeIdsOf().
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-366 D5 — the table; D5a–D5d, D5i — each type's lines and sets.
 * - ADR-366 D7 — rooms aboard, the `outside` exit.
 */
import type { CreateDecl, NameRef, VehicleLine } from '../ast.js';
import type { IRVehicleMovement } from '../ir.js';
import { entityIdOf, isKindDecl } from './declared.js';

/** The base types (ADR-366 D5) and `open`, contributed by `use expanses` (ADR-376 D3). */
export type VehicleMovement = IRVehicleMovement;
export type VehicleDrive = 'state' | 'control' | 'player';

/** One vehicle block's declared lines, by key, names unresolved. */
export interface VehicleDecl {
  /** The entity id the block's name derives (the collection pass's derivation). */
  readonly id: string;
  readonly name: string;
  readonly decl: CreateDecl;
  readonly movement: VehicleMovement | null;
  readonly drive: VehicleDrive | null;
  readonly stops: NameRef[];
  readonly destinations: NameRef[];
  readonly aboard: NameRef[];
}

/** A line the type cannot do without, required under every drive or only the listed ones. */
export interface RequiredLine {
  line: 'pace' | 'direction' | 'stride' | 'sight' | 'seen-from-afar';
  drives?: ReadonlySet<VehicleDrive>;
}

/** What each movement type takes (ADR-366 D5's table). */
export interface MovementRow {
  /** The colon lines the type admits, beyond `movement:` and `carries:`. */
  lines: ReadonlySet<VehicleLine['key']>;
  /** The lines whose absence is a fault; a list's count (`stops:`, `destinations:`) is its own check. */
  required: readonly RequiredLine[];
  /** True when the vehicle chooses where it goes, so a room's `admits:` may name it (D6). */
  steered: boolean;
  /** True when `start` under `drive: control` takes `heading <direction>`, and requires it (D5c; ADR-376 D3). */
  heading: boolean;
  /** Whether the type takes a `position` block (`drive: state` only). */
  position: boolean;
  drives: ReadonlySet<VehicleDrive>;
  /** The command sets a `drive: player` vehicle of this type may list. */
  sets: ReadonlySet<string>;
  /** `start`, `stop` and `send`, with the drives each is legal under. */
  statements: ReadonlyMap<'start' | 'stop' | 'send', ReadonlySet<VehicleDrive>>;
  /** `under-way`, `at`, `heading`, `within` (ADR-376 D7, open vehicles), and `in-irons` (ADR-375 D5, under `use sailing`). */
  conditions: ReadonlySet<'under-way' | 'at' | 'heading' | 'within' | 'in-irons'>;
}

const aboardLines: VehicleLine['key'][] = ['aboard', 'boarded-through'];
const set = <T>(...items: T[]): ReadonlySet<T> => new Set(items);
const stmts = (entries: Array<['start' | 'stop' | 'send', VehicleDrive[]]>): MovementRow['statements'] =>
  new Map(entries.map(([verb, drives]) => [verb, new Set(drives)]));

export const MOVEMENT_TABLE: Readonly<Record<VehicleMovement, MovementRow>> = {
  none: {
    lines: set<VehicleLine['key']>(),
    required: [],
    steered: false,
    heading: false,
    position: false,
    drives: set<VehicleDrive>(),
    sets: set<string>(),
    statements: stmts([]),
    conditions: set<'under-way' | 'at' | 'heading'>(),
  },
  line: {
    lines: set<VehicleLine['key']>('drive', 'stops', 'direction', 'pace', ...aboardLines),
    // D5a: under `drive: state` the `position` block says where it is, and `pace:` is refused.
    required: [{ line: 'direction' }, { line: 'pace', drives: set<VehicleDrive>('control') }],
    steered: false,
    heading: false,
    position: true,
    drives: set<VehicleDrive>('state', 'control'),
    sets: set<string>(),
    statements: stmts([['start', ['control']], ['stop', ['control']]]),
    conditions: set<'under-way' | 'at' | 'heading'>('under-way', 'at'),
  },
  streets: {
    lines: set<VehicleLine['key']>('drive', 'commands', ...aboardLines),
    required: [],
    steered: true,
    heading: false,
    position: false,
    drives: set<VehicleDrive>('player'),
    sets: set('compass'),
    statements: stmts([]),
    conditions: set<'under-way' | 'at' | 'heading'>('at'),
  },
  compass: {
    lines: set<VehicleLine['key']>('drive', 'commands', 'pace', ...aboardLines),
    required: [{ line: 'pace' }],
    steered: true,
    heading: true,
    position: false,
    drives: set<VehicleDrive>('player', 'control'),
    sets: set('compass'),
    statements: stmts([['start', ['control']], ['stop', ['control', 'player']]]),
    conditions: set<'under-way' | 'at' | 'heading'>('under-way', 'at', 'heading'),
  },
  flight: {
    // ADR-380 D3: a flight's step is the trip, so its trip time is `pace:`.
    lines: set<VehicleLine['key']>('drive', 'commands', 'destinations', 'pace', ...aboardLines),
    required: [{ line: 'pace' }],
    steered: false,
    heading: false,
    position: false,
    drives: set<VehicleDrive>('player', 'control'),
    sets: set('destinations'),
    statements: stmts([['send', ['control']]]),
    conditions: set<'under-way' | 'at' | 'heading'>('under-way', 'at'),
  },
  // ADR-376 D3: a position in an expanse. `start … heading` and `send` under
  // `control`; `stop` under either drive, as for a compass vehicle (ADR-366 D5f).
  // ADR-375 adds, under `use sailing`: `sails:`, `sails start:`, the `naval`
  // set and `is in irons` — each gated on the use line by the sailing builder.
  open: {
    lines: set<VehicleLine['key']>('drive', 'commands', 'pace', 'stride', 'sight', 'seen-from-afar', 'sails', 'sails-start', ...aboardLines),
    // ADR-375 D4: a `sailing` block stands in for `pace:`.
    required: [{ line: 'pace' }, { line: 'stride' }, { line: 'sight' }, { line: 'seen-from-afar' }],
    steered: false,
    heading: true,
    position: false,
    drives: set<VehicleDrive>('player', 'control'),
    sets: set('compass', 'coordinates', 'naval'),
    statements: stmts([['start', ['control']], ['send', ['control']], ['stop', ['control', 'player']]]),
    conditions: set<'under-way' | 'at' | 'heading' | 'within' | 'in-irons'>('under-way', 'at', 'heading', 'within', 'in-irons'),
  },
};

/** `a vehicle` composed on a create block. */
export function isVehicleDecl(decl: CreateDecl): boolean {
  return isKindDecl(decl, 'vehicle');
}

type LineWithKey<L, K> = L extends { key: infer KK } ? (K extends KK ? L : never) : never;
/** The `VehicleLine` member a key selects (a member whose `key` is a union answers to each of its keys). */
export type VehicleLineOf<K extends VehicleLine['key']> = LineWithKey<VehicleLine, K>;

/** The first line of a key in a block, or undefined. */
export function vehicleLineOf<K extends VehicleLine['key']>(decl: CreateDecl, key: K): VehicleLineOf<K> | undefined {
  return decl.vehicleLines.find((l): l is VehicleLineOf<K> => l.key === key);
}

/**
 * Collect every vehicle block's declaration, keyed by the entity id its name
 * derives. Rooms the vehicles list aboard are reachable through each entry.
 * @param decls the story's declarations, room groups already expanded
 */
export function collectVehicles(decls: readonly { kind: string }[]): Map<string, VehicleDecl> {
  const out = new Map<string, VehicleDecl>();
  for (const decl of decls) {
    if (decl.kind !== 'create') continue;
    const create = decl as CreateDecl;
    if (!isVehicleDecl(create)) continue;
    const id = entityIdOf(create.name.words);
    out.set(id, {
      id,
      name: create.name.words.join(' '),
      decl: create,
      movement: vehicleLineOf(create, 'movement')?.value ?? null,
      drive: vehicleLineOf(create, 'drive')?.value ?? null,
      stops: vehicleLineOf(create, 'stops')?.names ?? [],
      destinations: vehicleLineOf(create, 'destinations')?.names ?? [],
      aboard: vehicleLineOf(create, 'aboard')?.names ?? [],
    });
  }
  return out;
}

/**
 * The entity ids a list of names resolves to, unresolved names dropped —
 * the caller that owns the names has already reported them.
 * @param names the list
 * @param resolve a silent resolver
 */
export function placeIdsOf(names: readonly NameRef[], resolve: (ref: NameRef) => string | null): string[] {
  const out: string[] = [];
  for (const name of names) {
    const id = resolve(name);
    if (id !== null) out.push(id);
  }
  return out;
}
