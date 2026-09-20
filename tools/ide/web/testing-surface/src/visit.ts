/**
 * visit.ts — how one line of the tree divides into what is replayed and what
 * is typed live (ADR-353 D1).
 *
 * Purpose: a visited line's prefix belongs to the lines above it and its cards
 * already exist, so the prefix replays with delivery suppressed while the
 * line's OWN commands are typed live and bind to the turns they produce.
 * Getting the split wrong is silent — the engine reaches the same state either
 * way and only the binding goes missing, which is exactly how the regression
 * this module exists to pin got shipped: a branch's whole path went in as
 * suppressed replay with nothing live, so the line showed a fresh boot card
 * and no results.
 *
 * The rule lives here rather than in `main.ts` because `main.ts` is the DOM
 * entry module and exports nothing; a rule that four call sites share is worth
 * asserting on directly.
 *
 * Public interface: ReplayStep, PathStep, LineVisit, visitPlanOf().
 * Owner context: tools/ide — the testing play surface's replay driver.
 */

/** A command to type during replay, keyed for dialog outcome lookup. */
export interface ReplayStep {
  command: string;
  key: string;
}

/** One typed command on a line's full path, as the tree model names it:
 *  the line that OWNS the command, and its index within that line. */
export interface PathStep {
  command: string;
  lineId: number;
  index: number;
}

/** How a line's path divides for one visit. */
export interface LineVisit {
  /** Root through fork: replayed suppressed, because these cards exist. */
  replay: ReplayStep[];
  /** The line's own commands: typed live so their turns bind to its cards. */
  live: ReplayStep[];
}

/**
 * Divide a line's full path into the prefix to replay suppressed and the tail
 * to type live.
 *
 * @param path         the line's full path, root first, as `pathStepsOf` gives it
 * @param prefixLength how many leading steps belong to the lines above this one
 * @returns            the two step lists, together covering `path` exactly once
 *
 * A `prefixLength` outside the path clamps rather than throwing: the coverage
 * invariant — `replay ++ live === path` — is the property every caller depends
 * on, and it must hold for whatever it is handed.
 */
export function visitPlanOf(
  path: readonly PathStep[],
  prefixLength: number,
): LineVisit {
  const cut = Math.max(0, Math.min(prefixLength, path.length));
  const step = (s: PathStep): ReplayStep => ({
    command: s.command,
    key: `${s.lineId}:${s.index}`,
  });
  return {
    replay: path.slice(0, cut).map(step),
    live: path.slice(cut).map(step),
  };
}
