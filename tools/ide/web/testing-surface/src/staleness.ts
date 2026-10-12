/**
 * staleness.ts — a result goes stale; it never vanishes (ADR-357 D11).
 *
 * Purpose: when a run starts, remember what it ran against — the build id
 * the host computed, each line's path as the ordered ids of its cards from
 * the root through its fork card and then its own cards, and a fingerprint
 * per card. Afterwards, whenever the tree changes, the build changes, or the
 * page boots, decide which results still describe the tree in front of the
 * author and which describe one that has since changed. A result for a line
 * whose path, cards or build moved is stale: still shown, tinted as
 * unverified, never silently dropped. The last run and its baseline also
 * round-trip through the host's view-state sidecar, so a reload restores
 * them and judges them against the tree it boots with.
 *
 * Nothing here touches the DOM or the host. `run.ts` owns the fold; this
 * module owns the baseline, the test, and the stored shape.
 *
 * Public interface: RunBaseline, TreeShape, captureBaseline, cardFingerprint,
 *   isLineStale, areDerivedStale, evaluateStaleness, StoredRun, storedRunOf,
 *   restoreRun.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 *
 * References:
 *   - ADR-357 D6, D10 (when a result is stale), D11 (how the surface knows)
 *   - ADR-307 D7 (the view-state sidecar the last run rides in)
 *   - ADR-355 D7 (stable card ids)
 */

import type { TreeCard } from '@sharpee/branch-tester/tree-document';
import type { DerivedBranchRow, DerivedSummary } from './derived';
import type { FirstFailure, RunColumnState, TranscriptRunResult } from './run';

/** What a run ran against, captured when it started. */
export interface RunBaseline {
  /** The host's build id for the run — the story sources and the CLI it executed. Absent when the host gave none. */
  build?: string;
  /** Per line id, the ordered ids of the cards on its path, root to its last own card. */
  paths: Record<string, string[]>;
  /** Per card id, the card's fingerprint at run start. */
  fingerprints: Record<string, string>;
}

/** The tree as the baseline reads it — what `TreeSessionModel` already answers. */
export interface TreeShape {
  lineIds(): string[];
  pathCardsOf(lineId: string): TreeCard[];
}

/**
 * A card's fingerprint: its canonical JSON with `branches` and
 * `continuation` left out, so a fork added below a card is not an edit to
 * it. Keys are sorted at every depth so key order never counts as a change.
 */
export function cardFingerprint(card: TreeCard): string {
  const { branches: _branches, continuation: _continuation, ...own } = card;
  return JSON.stringify(sortKeysDeep(own));
}

/**
 * Capture the baseline for a run that is about to start.
 *
 * @param tree the tree as it stands at run start
 * @param build the host's build id for this run, when it gave one
 * @returns the baseline the run's results are later judged against
 */
export function captureBaseline(tree: TreeShape, build?: string): RunBaseline {
  const paths: Record<string, string[]> = {};
  const fingerprints: Record<string, string> = {};
  for (const lineId of tree.lineIds()) {
    const cards = tree.pathCardsOf(lineId);
    paths[lineId] = cards.map((card, index) => cardIdOf(card, index));
    cards.forEach((card, index) => {
      fingerprints[cardIdOf(card, index)] = cardFingerprint(card);
    });
  }
  return { ...(build !== undefined ? { build } : {}), paths, fingerprints };
}

/**
 * Whether a line's result is stale against the tree and build now in front
 * of the author: the build id differs, the line's path differs, or any card
 * on the path has a different fingerprint. A line the baseline never saw is
 * not judged stale: there is nothing to compare, and an unknown never marks
 * a result stale (the same rule as an unknown build). A line the baseline
 * knew that the tree no longer holds has an empty path now, so it is stale.
 *
 * @param baseline what the run ran against
 * @param tree the tree now
 * @param lineId the line to judge
 * @param currentBuild the host's current build id, when it gave one
 */
export function isLineStale(baseline: RunBaseline, tree: TreeShape, lineId: string, currentBuild?: string): boolean {
  if (buildDiffers(baseline.build, currentBuild)) return true;
  const was = baseline.paths[lineId];
  if (was === undefined) return false;
  const cards = tree.pathCardsOf(lineId);
  if (cards.length !== was.length) return true;
  for (let index = 0; index < cards.length; index += 1) {
    const id = cardIdOf(cards[index], index);
    if (id !== was[index]) return true;
    if (cardFingerprint(cards[index]) !== baseline.fingerprints[id]) return true;
  }
  return false;
}

/**
 * Whether the derived-tier results are stale: only a build change can make
 * them so, because the derived tier reads the story, not the tree.
 */
export function areDerivedStale(baseline: RunBaseline, currentBuild?: string): boolean {
  return buildDiffers(baseline.build, currentBuild);
}

/**
 * Re-judge a run column against the tree and build now in front of the
 * author (ADR-357 D11): sets `stale` on each result whose line moved and
 * deletes it from each that did not, and sets or deletes the column's
 * `derivedStale`. Without a baseline, or while a run is in flight, nothing
 * changes — there is nothing to judge against, or the results are not yet
 * the run's.
 *
 * @param state the run column
 * @param tree the tree now
 * @param currentBuild the host's current build id, when it gave one
 * @returns whether anything was judged
 */
export function evaluateStaleness(state: RunColumnState, tree: TreeShape, currentBuild?: string): boolean {
  const baseline = state.baseline;
  if (baseline === undefined || state.inFlight) return false;
  for (const [lineId, result] of state.results) {
    if (isLineStale(baseline, tree, lineId, currentBuild)) result.stale = true;
    else delete result.stale;
  }
  if (areDerivedStale(baseline, currentBuild)) state.derivedStale = true;
  else delete state.derivedStale;
  return true;
}

/** Two build ids differ only when both are known; an unknown side never marks anything stale. */
function buildDiffers(was: string | undefined, now: string | undefined): boolean {
  return was !== undefined && now !== undefined && was !== now;
}

/** One line of a stored run: its verdict and its failure, never its passing commands. */
export interface StoredLine {
  id: string;
  status: TranscriptRunResult['status'];
  passed: number;
  failed: number;
  firstFailure?: FirstFailure;
  moreFailures: number;
  label?: string;
}

/**
 * The last run as the sidecar keeps it: the baseline, each line's verdict
 * and failure, the derived tier's failures and its summary. Passing commands
 * are not kept, so the stored size scales with failures, not with the tree.
 */
export interface StoredRun {
  version: 1;
  baseline: RunBaseline;
  lines: StoredLine[];
  derived: DerivedBranchRow[];
  derivedSummary?: DerivedSummary;
}

/**
 * The run column's finished run in its stored shape, or `undefined` while a
 * run is in flight or when nothing has run — the sidecar then keeps what it
 * had.
 */
export function storedRunOf(state: RunColumnState): StoredRun | undefined {
  if (state.inFlight || state.baseline === undefined) return undefined;
  if (state.results.size === 0 && state.derived.length === 0) return undefined;
  const lines: StoredLine[] = [];
  for (const [id, result] of state.results) {
    lines.push({
      id,
      status: result.status,
      passed: result.passed,
      failed: result.failed,
      ...(result.firstFailure !== undefined ? { firstFailure: result.firstFailure } : {}),
      moreFailures: result.moreFailures,
      ...(result.label !== undefined ? { label: result.label } : {}),
    });
  }
  return {
    version: 1,
    baseline: state.baseline,
    lines,
    derived: state.derived.filter((row) => row.status === 'failed' || row.status === 'error'),
    ...(state.derivedSummary !== undefined ? { derivedSummary: state.derivedSummary } : {}),
  };
}

/**
 * Restore a stored run into a fresh run column. Each line comes back with no
 * command detail — the detail was not kept — and no staleness yet; the
 * caller evaluates that against the tree it booted with.
 *
 * @returns false when the value is not a stored run this build reads, and
 *   the state is left untouched — an unreadable sidecar restores nothing
 */
export function restoreRun(state: RunColumnState, stored: unknown): boolean {
  if (!isStoredRun(stored)) return false;
  state.inFlight = false;
  state.results.clear();
  state.labels.clear();
  state.pendingCommands.clear();
  state.replaying.clear();
  for (const line of stored.lines) {
    state.results.set(line.id, {
      status: line.status,
      passed: line.passed,
      failed: line.failed,
      commands: [],
      ...(line.firstFailure !== undefined ? { firstFailure: line.firstFailure } : {}),
      moreFailures: line.moreFailures,
      ...(line.label !== undefined ? { label: line.label } : {}),
    });
    if (line.label !== undefined) state.labels.set(line.id, line.label);
  }
  state.derived = [...stored.derived];
  if (stored.derivedSummary !== undefined) state.derivedSummary = stored.derivedSummary;
  else delete state.derivedSummary;
  state.baseline = stored.baseline;
  delete state.tally;
  delete state.note;
  return true;
}

const LINE_STATUSES = new Set<string>(['passed', 'failed', 'error', 'unreached', 'skipped']);

function isStoredRun(value: unknown): value is StoredRun {
  if (typeof value !== 'object' || value === null) return false;
  const run = value as Record<string, unknown>;
  if (run.version !== 1) return false;
  const baseline = run.baseline as Record<string, unknown> | undefined;
  if (typeof baseline !== 'object' || baseline === null) return false;
  if (typeof baseline.paths !== 'object' || baseline.paths === null) return false;
  if (typeof baseline.fingerprints !== 'object' || baseline.fingerprints === null) return false;
  if (baseline.build !== undefined && typeof baseline.build !== 'string') return false;
  if (!Array.isArray(run.lines) || !Array.isArray(run.derived)) return false;
  return run.lines.every((line) => {
    if (typeof line !== 'object' || line === null) return false;
    const entry = line as Record<string, unknown>;
    return typeof entry.id === 'string'
      && typeof entry.status === 'string' && LINE_STATUSES.has(entry.status)
      && typeof entry.passed === 'number'
      && typeof entry.failed === 'number'
      && typeof entry.moreFailures === 'number';
  });
}

/** A card's id, or its position when a card has none — the reader mints ids, so this is the live-edit edge only. */
function cardIdOf(card: TreeCard, index: number): string {
  return card.id ?? `#${index}`;
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (typeof value === 'object' && value !== null) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const entry = (value as Record<string, unknown>)[key];
      if (entry !== undefined) sorted[key] = sortKeysDeep(entry);
    }
    return sorted;
  }
  return value;
}
