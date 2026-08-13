/**
 * Choice points — declared draw sites and the process-global catalog (ADR-293 D2, D4).
 *
 * Public interface: `ChoicePoint<C>`, `definePoint(name, opts?)`, `getRegisteredPoints()`,
 * `getPoint(name)`.
 * Owner context: @sharpee/core random substrate. Core holds static metadata only —
 * no state that draws lives here (D5); stream state is per-engine, per-session.
 *
 * The catalog is process-global BY DESIGN (D2, amended A1): entries are immutable,
 * idempotent metadata holding no stream, which is what makes import-time registration
 * safe where D6 kills module-scope *streams*. In a multi-story process the
 * catalog holds the union; consumers filter by story id / package prefix, which works
 * because entries retain their D2 name prefix.
 */

/**
 * A declared draw site. With `classes` it is a choice point (traced, counted in
 * coverage, forceable); without, it is a plain draw (seeded and traced only) — D4.
 */
export interface ChoicePoint<C extends string = string> {
  /** Dotted, first segment is the story/package id, no abbreviations (D2): 'dungeo.melee.blow.hero' */
  readonly name: string;
  /** Outcome classes; absent ⇒ plain draw (D4) */
  readonly classes?: readonly C[];
}

// Anchored on globalThis so the catalog stays one-per-process even if this module
// is loaded more than once (CJS + ESM builds of core in the same process).
const CATALOG_KEY = Symbol.for('sharpee.core.random.catalog');

type Catalog = Map<string, ChoicePoint>;

function catalog(): Catalog {
  const host = globalThis as { [CATALOG_KEY]?: Catalog };
  return (host[CATALOG_KEY] ??= new Map());
}

/**
 * Declare a choice point (or, with no classes, a plain draw) and register it in the
 * process-global catalog. The draw API accepts only the returned handle (D2).
 *
 * Idempotent: redeclaring the same name with identical classes returns the original
 * handle. Immutable: redeclaring with different classes throws — the catalog never
 * mutates an entry.
 *
 * @param name - dotted point name; first segment is the story or package id (D2)
 * @param opts - `classes`: the point's outcome classes; omit for a plain draw (D4)
 * @returns the frozen, catalog-registered handle
 * @throws Error if `name` is empty, or already registered with different classes
 */
export function definePoint<C extends string>(
  name: string,
  opts?: { classes: readonly C[] }
): ChoicePoint<C> {
  if (name.length === 0) {
    throw new Error('definePoint: name must be non-empty');
  }
  const existing = catalog().get(name);
  if (existing) {
    if (sameClasses(existing.classes, opts?.classes)) {
      return existing as ChoicePoint<C>;
    }
    throw new Error(
      `definePoint: '${name}' is already registered with classes ` +
        `[${(existing.classes ?? []).join(', ')}]; the catalog is immutable (ADR-293 D2)`
    );
  }
  const point: ChoicePoint<C> = Object.freeze({
    name,
    ...(opts ? { classes: Object.freeze([...opts.classes]) as readonly C[] } : {}),
  });
  catalog().set(name, point);
  return point;
}

/**
 * Snapshot of every registered point, for engine's story-start snapshot and
 * `catalog − fired` coverage. Returns a fresh array; the entries themselves are frozen.
 */
export function getRegisteredPoints(): readonly ChoicePoint[] {
  return [...catalog().values()];
}

/**
 * Look up a registered point by name.
 *
 * @returns the handle, or undefined if no point with that name is declared
 */
export function getPoint(name: string): ChoicePoint | undefined {
  return catalog().get(name);
}

function sameClasses(
  a: readonly string[] | undefined,
  b: readonly string[] | undefined
): boolean {
  if (a === undefined || b === undefined) return a === b;
  return a.length === b.length && a.every((cls, i) => cls === b[i]);
}
