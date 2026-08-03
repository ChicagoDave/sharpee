/**
 * Force types — outcome forcing over declared classes (ADR-293 D8, D9).
 *
 * Public interface: `RandomForceMode`, `RandomForceSpec`, `RandomForceStatus`,
 * `forceKey`, and the typed load errors (`RandomForceLoadError` base;
 * `DuplicateForceKeyError`, `UnknownForcePointError`,
 * `UndeclaredForceClassError`).
 * Owner context: @sharpee/core random substrate. Core owns the types (D5);
 * engine's `RandomService` implementation owns the force table itself. Forces
 * are session state, never save state (D9). The load errors are typed so the
 * transcript-tester layer can catch and report them with file/line context
 * (AC-13's three FORCE-specific rejection clauses).
 */

/**
 * How a force applies across a session (D9): `once` must fire exactly once
 * (transcript default — zero firings by end of run is an error the consumer
 * enforces from `RandomForceStatus`); `sticky` applies on every reach,
 * zero-to-many firings, count reported (play default).
 */
export type RandomForceMode = 'once' | 'sticky';

/**
 * One force: replace a point's outcome with a declared class (D8 rule 1 —
 * classes, never draw indices or seeds). Keyed by point name plus optional
 * 1-based occurrence index (D9): an indexed force applies only at that firing;
 * an unindexed force applies per its mode.
 */
export interface RandomForceSpec {
  /** The point's dotted name (D2). */
  readonly point: string;
  /** 1-based firing index this force targets; absent ⇒ applies per mode. */
  readonly occurrence?: number;
  /** The declared outcome class to substitute. */
  readonly cls: string;
  /** How the force applies across the session (D9). */
  readonly mode: RandomForceMode;
}

/**
 * End-of-session status of one loaded force, surfaced as data for the
 * consumer's report (D9: unfired `once` forces are a hard error in
 * transcripts and a report line in play; `sticky` counts are reported).
 */
export interface RandomForceStatus {
  readonly spec: RandomForceSpec;
  /** Number of firings this force replaced. */
  readonly fireCount: number;
}

/**
 * Canonical table-key identity for a force: `point` or `point#occurrence`.
 * Duplicate keys within one load are a load error, not last-wins (D9).
 */
export function forceKey(spec: Pick<RandomForceSpec, 'point' | 'occurrence'>): string {
  return spec.occurrence === undefined ? spec.point : `${spec.point}#${spec.occurrence}`;
}

/**
 * Base class for force-table load rejections (AC-13) — catchable as one
 * family by the transcript-tester layer.
 */
export class RandomForceLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The same `point[#occurrence]` key declared twice in one load (D9: a load error, not last-wins). */
export class DuplicateForceKeyError extends RandomForceLoadError {
  constructor(readonly key: string) {
    super(`duplicate force key '${key}' — duplicate keys are a load error, not last-wins (ADR-293 D9)`);
  }
}

/** A force naming a point that is not in the catalog — a name is either a declared point or it does not exist (D2). */
export class UnknownForcePointError extends RandomForceLoadError {
  constructor(readonly point: string) {
    super(`force names unknown point '${point}' — no such point is declared (ADR-293 D2)`);
  }
}

/** A force naming a class the point does not declare (or a plain draw, which declares none — D4). */
export class UndeclaredForceClassError extends RandomForceLoadError {
  constructor(
    readonly point: string,
    readonly cls: string,
    readonly declared: readonly string[]
  ) {
    super(
      declared.length === 0
        ? `force on '${point}' names class '${cls}', but the point is a plain draw and declares no classes (ADR-293 D4)`
        : `force on '${point}' names undeclared class '${cls}' (declared: ${declared.join(', ')})`
    );
  }
}
