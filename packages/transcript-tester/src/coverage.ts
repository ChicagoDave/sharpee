/**
 * coverage.ts — outcome-class coverage over the trace stream (ADR-293 D15).
 *
 * Purpose: accumulate per-point firings from the engine's `system.draw` trace
 *   events across one run (a `--chain` run is ONE session and produces ONE
 *   report — D15's aggregation ruling), then cross the process-global catalog
 *   (`getRegisteredPoints()`) against what fired: `catalog − fired` needs no
 *   static scan because declaration is the capability to draw (D2).
 * Public interface: `CoverageTracker`, `CoverageReport` (re-exported
 *   ide-protocol shapes), `formatCoverageSummary`, `formatCoverageBreakdown`.
 * Owner context: @sharpee/transcript-tester. The ide-protocol import is
 *   TYPE-ONLY (ADR-277 D1's standing rule for this package).
 */

import { getRegisteredPoints } from '@sharpee/core';
import type { CoveragePoint } from '@sharpee/ide-protocol';

/** The report payload — the {@link CoverageRecord} minus its wire framing. */
export interface CoverageReport {
  /** Every declared point in scope, sorted by name. */
  points: CoveragePoint[];
  /** Count of points with `fired > 0`. */
  pointsFired: number;
  /** Count of points never fired (`catalog − fired`, D2). */
  pointsNeverFired: number;
  /** Total declared classes never observed, across all points. */
  classesUnobserved: number;
}

/** The slice of a trace record coverage consumes (core's `IRandomTraceData`). */
interface TraceLike {
  point: string;
  cls?: string;
}

/**
 * Accumulates firings across a run. One tracker per run — the CLI creates it
 * before the transcript loop and reads the report after, so a chain's members
 * all land in one report (D15).
 */
export class CoverageTracker {
  private firings = new Map<string, { count: number; observed: Set<string> }>();

  /** Record one firing (drawn or forced — D8 reports class coverage). */
  record(trace: TraceLike): void {
    let entry = this.firings.get(trace.point);
    if (!entry) {
      entry = { count: 0, observed: new Set() };
      this.firings.set(trace.point, entry);
    }
    entry.count++;
    if (trace.cls !== undefined) {
      entry.observed.add(trace.cls);
    }
  }

  /**
   * Collect every `system.draw` trace event from a command's event batch —
   * the shape the engine re-emits trace records in (`type: 'system.draw'`,
   * `data: IRandomTraceData`). Non-trace events are ignored.
   */
  collectFrom(events?: Array<{ type: string; data?: unknown }>): void {
    if (!events) return;
    for (const event of events) {
      if (event.type !== 'system.draw') continue;
      const data = event.data as TraceLike | undefined;
      if (data && typeof data.point === 'string') {
        this.record(data);
      }
    }
  }

  /**
   * Cross the catalog against the accumulated firings (D15): every declared
   * point in scope, its firing count, and — for choice points — observed and
   * unobserved classes.
   *
   * @param prefixes - keep only points whose first dotted segment is listed
   *   (the D2/A1 multi-story filter; also what isolates a report from other
   *   test files' catalog entries, since the catalog is process-global).
   *   Omit to report the whole catalog — correct in a single-story CLI run.
   */
  buildReport(prefixes?: readonly string[]): CoverageReport {
    const inScope = getRegisteredPoints()
      .filter((p) => !prefixes || prefixes.includes(p.name.split('.')[0]))
      .sort((a, b) => a.name.localeCompare(b.name));

    const points: CoveragePoint[] = inScope.map((p) => {
      const hit = this.firings.get(p.name);
      const fired = hit?.count ?? 0;
      if (!p.classes) {
        return { name: p.name, fired };
      }
      const observed = [...(hit?.observed ?? [])].sort();
      const unobserved = p.classes.filter((cls) => !observed.includes(cls));
      return { name: p.name, classes: [...p.classes], fired, observed, unobserved };
    });

    return {
      points,
      pointsFired: points.filter((p) => p.fired > 0).length,
      pointsNeverFired: points.filter((p) => p.fired === 0).length,
      classesUnobserved: points.reduce((sum, p) => sum + (p.unobserved?.length ?? 0), 0)
    };
  }
}

/**
 * The one-line end-of-run summary D15 rules always prints — the never-fired
 * count is worthless if it has to be asked for.
 */
export function formatCoverageSummary(report: CoverageReport): string {
  const total = report.points.length;
  return (
    `Coverage: ${report.pointsFired} of ${total} points fired, ` +
    `${report.pointsNeverFired} never fired, ` +
    `${report.classesUnobserved} classes unobserved`
  );
}

/**
 * The full per-point breakdown (D15's `--output-dir` / `--coverage` surface):
 * one line per point — firing count, then unobserved classes for choice
 * points or a plain-draw marker.
 */
export function formatCoverageBreakdown(report: CoverageReport): string {
  const width = Math.max(0, ...report.points.map((p) => p.name.length));
  const lines = report.points.map((p) => {
    const name = p.name.padEnd(width);
    const fired = p.fired > 0 ? `fired ${p.fired}` : 'never fired';
    if (!p.classes) {
      return `  ${name}  ${fired}  (plain draw)`;
    }
    const classes =
      (p.unobserved?.length ?? 0) === 0
        ? 'all classes observed'
        : `unobserved: ${p.unobserved!.join(', ')}`;
    return `  ${name}  ${fired}  ${classes}`;
  });
  return [`Coverage (${report.points.length} points):`, ...lines].join('\n');
}
