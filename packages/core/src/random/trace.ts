/**
 * Random trace types — the per-firing trace record and sink (ADR-293 D16).
 *
 * Public interface: `IRandomTraceData`, `RandomTraceSink`.
 * Owner context: @sharpee/core random substrate. Core owns the trace/coverage
 * types (D5); engine's `RandomService` implementation produces the records and
 * emits them as `ISystemEvent`s (`subsystem: Subsystems.RANDOM`, severity
 * 'debug') when a sink is installed. Emission is off by default and a published
 * game emits none (D16).
 */

import type { RandomForceMode } from './force.js';

/**
 * One firing of a declared point — drawn or forced (D16's logical record:
 * point, class, value, provenance, draws-consumed, plus the occurrence index
 * and, for forced firings, the matched force's mode and key index).
 */
export interface IRandomTraceData {
  /** The point's dotted name (D2). */
  readonly point: string;
  /** 1-based firing index of this point within the session (D9's occurrence). */
  readonly occurrence: number;
  /** Outcome class — present for classed firings (`chance`/`resolve`), absent for class-less draws (`int`/`pick`). */
  readonly cls?: string;
  /** The produced value: the drawn/materialized result, or the pick's label when one was declared. */
  readonly value: unknown;
  /** Whether the outcome was drawn on the point's stream or substituted by a force (D8). */
  readonly provenance: 'drawn' | 'forced';
  /** Stream draws consumed by this firing — always 0 when forced (D8 rule 2). */
  readonly drawsConsumed: number;
  /** Mode of the matched force; present only when `provenance` is 'forced'. */
  readonly forceMode?: RandomForceMode;
  /** Occurrence index the matched force key carried, if it was indexed (`point#N`). */
  readonly forceOccurrence?: number;
}

/**
 * Receiver for trace records. Installed on the engine's `RandomService`
 * implementation by opted-in surfaces (transcript runner, `--play`, IDE);
 * absent by default, in which case no record is built at all.
 */
export type RandomTraceSink = (record: IRandomTraceData) => void;
