/**
 * model.ts — the testing play surface's segment/session model (ADR-306
 * Phase 3, design-testing-play-surface.md §2–§4).
 *
 * Purpose: a transcript is a contiguous range of played turns. This module
 *   holds the pure model behind the cards column — turns as the feed
 *   delivered them, segments (tick-to-start / tick-to-end ranges), the
 *   collapse flag, merge-up / split-here restructuring, `[SKIP]` marks from
 *   merges, and route-derived auto-names (`<start>-to-<end>-<turns>`,
 *   same-room collapse, `-2` collision suffix). No DOM, no bridges: the
 *   cards layer renders what this model says, and the vitest suite pins the
 *   semantics here.
 *
 * Public interface: SessionModel (addTurn, fence, tick, untick, segmentOf,
 *   openSegment, parentOf, setCollapsed, mergeUp, splitAt, isSkipped,
 *   titleOf, snapshot, restore, turns, segments, hasOpening; authoring —
 *   claimsOf, addContains, addNotContains, setExact, addState, addEvent,
 *   addChannel, removeDefault, removeContains, removeNotContains,
 *   removeState, removeEvent, removeChannel), TurnMeta, Segment,
 *   SessionSnapshot, TurnClaims, ChannelClaim, claimsAnything, slugify.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

/** One played turn as the model needs it: ordinal 0 is the opening. */
export interface TurnMeta {
  /** The feed ordinal; 0 is the opening (prologue + banner, no command). */
  ordinal: number;
  /** The typed command; '' for the opening. */
  command: string;
  /** The room the player is in AFTER this turn (room-name capture). */
  room?: string;
  /** True for a lineage's automatic boot look (never echoed, never typed). */
  boot: boolean;
}

/** A contiguous range of turns; `end === null` while the range is open. */
export interface Segment {
  start: number;
  end: number | null;
  /** Purely visual: a collapsed segment renders as one summary card. */
  collapsed: boolean;
}

/** What one tick did — the cards layer re-renders on anything but 'noop'. */
export type TickResult =
  | 'started'   // a fresh open segment began at this turn
  | 'extended'  // the open segment's start moved down to this turn
  | 'closed'    // the open segment's end landed on this turn
  | 'noop';     // already assigned, or the extension would overlap

/** The persisted view-state shape (ADR-306 D8 sidecar — view truth only). */
export interface SessionSnapshot {
  segments: { start: number; end: number | null; collapsed: boolean }[];
  skipped: number[];
}

/** Route slug: lowercase, non-alphanumerics collapse to single hyphens. */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** One channel claim as authored by the Channel picker (design §5). */
export interface ChannelClaim {
  id: string;
  /** Exactly one of the two is set — contains-form or typed `is`. */
  contains?: string;
  is?: string | number | boolean;
}

/**
 * A turn's authored claims (design §5). All authoring happens through
 * gestures; deletion happens in the source panel. `noDefaults` records that
 * the author touched the policy defaults — deleting one KEEPS the others as
 * authored contains (narrowing, never silent abandonment).
 */
export interface TurnClaims {
  contains: string[];
  notContains: string[];
  exact: boolean;
  states: string[];
  events: string[];
  channels: ChannelClaim[];
  noDefaults: boolean;
}

const emptyClaims = (): TurnClaims => ({
  contains: [], notContains: [], exact: false,
  states: [], events: [], channels: [], noDefaults: false,
});

/** True when the turn still claims anything at all (defaults included). */
export function claimsAnything(claims: TurnClaims): boolean {
  return claims.exact || claims.contains.length > 0 || claims.notContains.length > 0
    || claims.states.length > 0 || claims.events.length > 0
    || claims.channels.length > 0 || !claims.noDefaults;
}

export class SessionModel {
  /** Played turns in feed order (opening included once present). */
  private turnList: TurnMeta[] = [];

  /** Segments in creation order; render order derives from `start`. */
  private segmentList: Segment[] = [];

  /** Ordinals demoted to `[SKIP]` (merge gap turns, and pruned-to-nothing turns). */
  private skippedSet = new Set<number>();

  /** Authored claims by ordinal (0 = the opening's claims). Absent = untouched. */
  private claimsMap = new Map<number, TurnClaims>();

  get turns(): readonly TurnMeta[] { return this.turnList; }
  get segments(): readonly Segment[] { return this.segmentList; }

  /** True once the opening (ordinal 0) is on the board. */
  get hasOpening(): boolean { return this.turnList.some(t => t.ordinal === 0); }

  /**
   * Folds one delivered turn in. The first turn of the session also seats
   * the opening (ordinal 0): the prologue + banner rendered before the boot
   * look, the nameable beginning of a root transcript (design §2).
   */
  addTurn(meta: TurnMeta): void {
    if (this.turnList.length === 0 && meta.ordinal > 0) {
      this.turnList.push({ ordinal: 0, command: '', boot: false });
    }
    this.turnList.push(meta);
  }

  /**
   * A restart fence (ADR-305 D3): everything before it is dead lineage —
   * turns, segments, and skips all clear. The next delivered turn reseats
   * the opening for the new lineage.
   */
  fence(): void {
    this.turnList = [];
    this.segmentList = [];
    this.skippedSet.clear();
    this.claimsMap.clear();
  }

  private turnByOrdinal(n: number): TurnMeta | undefined {
    return this.turnList.find(t => t.ordinal === n);
  }

  /** End used for ordering/containment: an open segment ends at its start. */
  private endOf(s: Segment): number { return s.end ?? s.start; }

  /** The segment covering ordinal `n`, if any. */
  segmentOf(n: number): Segment | undefined {
    return this.segmentList.find(s => n >= s.start && n <= this.endOf(s));
  }

  /** The at-most-one open segment. */
  openSegment(): Segment | undefined {
    return this.segmentList.find(s => s.end === null);
  }

  /** The segment `s` continues from: the nearest one ending before it. */
  parentOf(s: Segment): Segment | undefined {
    return this.segmentList
      .filter(x => x !== s && this.endOf(x) < s.start)
      .sort((a, b) => this.endOf(b) - this.endOf(a))[0];
  }

  /** True when any segment intersects [from, to] (both inclusive). */
  private overlaps(from: number, to: number, ignoring?: Segment): boolean {
    return this.segmentList.some(s =>
      s !== ignoring && this.endOf(s) >= from && s.start <= to);
  }

  /**
   * Ticks the rail box on ordinal `n` (design §3): starts a segment, extends
   * the open one's start downward, or closes it — never overlapping another
   * segment (an extension that would swallow a neighbour is a 'noop').
   */
  tick(n: number): TickResult {
    if (!this.turnByOrdinal(n)) return 'noop';
    if (this.segmentOf(n)) return 'noop';
    const open = this.openSegment();
    if (!open) {
      this.segmentList.push({ start: n, end: null, collapsed: false });
      return 'started';
    }
    if (n < open.start) {
      if (this.overlaps(n, open.start - 1, open)) return 'noop';
      open.start = n;
      return 'extended';
    }
    if (this.overlaps(open.start + 1, n, open)) return 'noop';
    open.end = n;
    return 'closed';
  }

  /**
   * Unticks a segment boundary: a lone or closed start drops the segment
   * whole; unticking the end reopens the range. Implied (mid-range) boxes
   * are not ticked, so there is nothing to untick there.
   */
  untick(n: number): void {
    const s = this.segmentOf(n);
    if (!s) return;
    if (n === s.start) {
      this.segmentList.splice(this.segmentList.indexOf(s), 1);
    } else if (n === s.end) {
      s.end = null;
      s.collapsed = false;
    }
    this.dropOrphanedSkips();
  }

  /** Collapse is purely visual (design §3); only a closed range collapses. */
  setCollapsed(s: Segment, collapsed: boolean): void {
    if (s.end === null && collapsed) return;
    s.collapsed = collapsed;
  }

  /**
   * Merge ↑ (design §3): folds `s` into the segment it continues from.
   * Former gap turns join as deliberate `[SKIP]`s — the merged range is the
   * true concatenation, nothing silently gains assertions. Merging an open
   * segment leaves the merged range open (the author keeps recording).
   * Returns false when `s` has no parent to merge into.
   */
  mergeUp(s: Segment): boolean {
    const parent = this.parentOf(s);
    if (!parent) return false;
    for (const t of this.turnList) {
      if (t.ordinal > this.endOf(parent) && t.ordinal < s.start) {
        this.skippedSet.add(t.ordinal);
      }
    }
    parent.end = s.end === null ? null : s.end;
    parent.collapsed = false;
    this.segmentList.splice(this.segmentList.indexOf(s), 1);
    return true;
  }

  /**
   * Split here (design §3): cuts a closed segment before ordinal `n`; the
   * tail continues from the head. Round-trips with mergeUp. Returns false
   * off a closed range or at a position with nothing before it to keep.
   */
  splitAt(n: number): boolean {
    const s = this.segmentOf(n);
    if (!s || s.end === null || n <= Math.max(s.start, 1)) return false;
    const tail: Segment = { start: n, end: s.end, collapsed: false };
    s.end = n - 1;
    s.collapsed = false;
    this.segmentList.push(tail);
    return true;
  }

  /** Whether ordinal `n` rides as `[SKIP]` (merge gap; pruning in Phase 4). */
  isSkipped(n: number): boolean { return this.skippedSet.has(n); }

  /**
   * Containment for marks: unlike `segmentOf` (where an open range covers
   * only its start, so a later tick still reads as "close here"), a mark
   * inside an open range is inside it up to the latest played turn — a
   * merge that left the range open must not shed its gap `[SKIP]`s.
   */
  private coveredByAnySegment(n: number): boolean {
    const latest = this.turnList.reduce((m, t) => Math.max(m, t.ordinal), 0);
    return this.segmentList.some(s => n >= s.start && n <= (s.end ?? latest));
  }

  /** Turns no segment covers carry no marks (design §3: leaving a range
   *  drops what was authored on the way through — skips AND claims). */
  private dropOrphanedSkips(): void {
    for (const n of [...this.skippedSet]) {
      if (!this.coveredByAnySegment(n)) this.skippedSet.delete(n);
    }
    for (const n of [...this.claimsMap.keys()]) {
      if (!this.coveredByAnySegment(n)) this.claimsMap.delete(n);
    }
  }

  // ── authoring (design §5) ────────────────────────────────────────────

  /** The turn's claims, read-only; an untouched turn reads as all-default. */
  claimsOf(n: number): Readonly<TurnClaims> {
    return this.claimsMap.get(n) ?? emptyClaims();
  }

  private mutableClaims(n: number): TurnClaims {
    let claims = this.claimsMap.get(n);
    if (!claims) {
      claims = emptyClaims();
      this.claimsMap.set(n, claims);
    }
    return claims;
  }

  /**
   * Authoring a claim INCLUDES the turn (design §5): it joins its segment,
   * extends/closes the open one, or starts a fresh one — and un-demotes a
   * `[SKIP]`. Returns false for an unknown ordinal (nothing changed).
   */
  private includeForAuthoring(n: number): boolean {
    if (!this.turnByOrdinal(n)) return false;
    this.skippedSet.delete(n);
    if (!this.segmentOf(n)) this.tick(n);
    return true;
  }

  addContains(n: number, text: string): boolean {
    if (!this.includeForAuthoring(n)) return false;
    this.mutableClaims(n).contains.push(text);
    return true;
  }

  addNotContains(n: number, text: string): boolean {
    if (!this.includeForAuthoring(n)) return false;
    this.mutableClaims(n).notContains.push(text);
    return true;
  }

  /** Toggles the Exact block ([OK] + literal whole-turn text). */
  setExact(n: number, exact: boolean): boolean {
    if (exact && !this.includeForAuthoring(n)) return false;
    this.mutableClaims(n).exact = exact;
    if (!exact) this.demoteIfEmpty(n);
    return true;
  }

  addState(n: number, expression: string): boolean {
    if (!this.includeForAuthoring(n)) return false;
    this.mutableClaims(n).states.push(expression);
    return true;
  }

  addEvent(n: number, type: string): boolean {
    if (!this.includeForAuthoring(n)) return false;
    this.mutableClaims(n).events.push(type);
    return true;
  }

  addChannel(n: number, claim: ChannelClaim): boolean {
    if (!this.includeForAuthoring(n)) return false;
    this.mutableClaims(n).channels.push(claim);
    return true;
  }

  /**
   * Deletes one POLICY-DEFAULT line: the others become authored contains —
   * the author narrows the claim, never silently abandons it (design §5).
   * `defaults` are the rendered default fragments, `index` the deleted one.
   */
  removeDefault(n: number, index: number, defaults: string[]): void {
    const claims = this.mutableClaims(n);
    claims.contains = defaults.filter((_, i) => i !== index);
    claims.noDefaults = true;
    this.demoteIfEmpty(n);
  }

  removeContains(n: number, index: number): void {
    const claims = this.mutableClaims(n);
    claims.contains.splice(index, 1);
    claims.noDefaults = true;
    this.demoteIfEmpty(n);
  }

  removeNotContains(n: number, index: number): void {
    this.mutableClaims(n).notContains.splice(index, 1);
    this.demoteIfEmpty(n);
  }

  removeState(n: number, index: number): void {
    this.mutableClaims(n).states.splice(index, 1);
    this.demoteIfEmpty(n);
  }

  removeEvent(n: number, index: number): void {
    this.mutableClaims(n).events.splice(index, 1);
    this.demoteIfEmpty(n);
  }

  removeChannel(n: number, index: number): void {
    this.mutableClaims(n).channels.splice(index, 1);
    this.demoteIfEmpty(n);
  }

  /**
   * A turn pruned to nothing demotes to `[SKIP]` in place; the opening just
   * claims nothing — absence is its no-claim form (design §5).
   */
  private demoteIfEmpty(n: number): void {
    if (n === 0) return;
    if (!claimsAnything(this.claimsOf(n))) this.skippedSet.add(n);
  }

  /**
   * Where the player STOOD when the range began: the previous turn's room,
   * or the boot room for a range starting at the beginning (design §4).
   */
  private startRoomOf(s: Segment): string {
    const source = s.start <= 1
      ? this.turnByOrdinal(1)
      : this.turnByOrdinal(s.start - 1);
    return source?.room ?? 'session';
  }

  private endRoomOf(s: Segment): string {
    return this.turnByOrdinal(this.endOf(s))?.room ?? 'session';
  }

  /** Played-turn count of the range — the opening is not a turn. */
  private turnCountOf(s: Segment): number {
    return Math.max(1, this.endOf(s) - Math.max(s.start, 1) + 1);
  }

  /** The route-derived base name, before collision suffixing. */
  private baseTitleOf(s: Segment): string {
    const from = slugify(this.startRoomOf(s));
    const to = slugify(this.endRoomOf(s));
    const count = this.turnCountOf(s);
    return from === to ? `${from}-${count}` : `${from}-to-${to}-${count}`;
  }

  /**
   * The auto-derived name (design §4): route + turn count, `-2`/`-3` when
   * an earlier segment (by start) already claimed the same route. Naming
   * only — the write-back to `tests/` is Phase 4's auto-save writer.
   */
  titleOf(s: Segment): string {
    const base = this.baseTitleOf(s);
    const earlier = this.segmentList
      .filter(x => x.start < s.start && this.baseTitleOf(x) === base)
      .length;
    return earlier === 0 ? base : `${base}-${earlier + 1}`;
  }

  /** The persisted view state (ADR-306 D8): segments + skips, nothing more —
   *  no assertions, no transcript content, no test truth. */
  snapshot(): SessionSnapshot {
    return {
      segments: this.segmentList.map(s => ({
        start: s.start, end: s.end, collapsed: s.collapsed,
      })),
      skipped: [...this.skippedSet].sort((a, b) => a - b),
    };
  }

  /**
   * Re-applies a persisted snapshot after restore-by-replay re-fed the
   * turns (ADR-306 D8). Degraded-tolerant by rule: entries that no longer
   * fit the replayed session — unknown ordinals, overlaps, a second open
   * range — are dropped silently, never an error.
   */
  restore(snap: SessionSnapshot): void {
    this.segmentList = [];
    this.skippedSet.clear();
    const known = (n: number) => this.turnByOrdinal(n) !== undefined;
    for (const raw of snap.segments ?? []) {
      if (typeof raw?.start !== 'number' || !known(raw.start)) continue;
      const end = raw.end === null ? null : raw.end;
      if (end !== null && (typeof end !== 'number' || end < raw.start || !known(end))) continue;
      if (end === null && this.openSegment()) continue;
      const upper = end ?? raw.start;
      if (this.overlaps(raw.start, upper)) continue;
      this.segmentList.push({
        start: raw.start,
        end,
        collapsed: end !== null && raw.collapsed === true,
      });
    }
    for (const n of snap.skipped ?? []) {
      if (typeof n === 'number' && this.coveredByAnySegment(n)) this.skippedSet.add(n);
    }
  }
}
