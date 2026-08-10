/**
 * model.ts — the testing play surface's segment/session model (ADR-306
 * Phases 3–5, design-testing-play-surface.md §2–§6).
 *
 * Purpose: a transcript is a contiguous range of played turns along ONE
 *   lineage. This module holds the pure model behind the cards column —
 *   turns as the feed delivered them, lineages (the root plus branches
 *   forked from any point, ADR-306 D7/design §6), segments (tick-to-start /
 *   tick-to-end ranges), the collapse flag, merge-up / split-here
 *   restructuring, `[SKIP]` marks, authored claims (design §5), and
 *   route-derived auto-names. No DOM, no bridges: the cards layer renders
 *   what this model says, and the vitest suite pins the semantics here.
 *
 * Lineage invariants (Phase 5):
 *   - A segment NEVER spans lineages — forking auto-splits so every
 *     transcript is one coherent command path; cross-lineage ticks refuse.
 *   - Ordinals are page-lifetime monotonic but GAPPED within a lineage
 *     (fork/switch replays consume ordinals the model never sees), so all
 *     window math runs on path positions, never ordinal arithmetic.
 *   - The active lineage is both viewed and live: visibility is its
 *     ancestry path, cut at each fork the path branches away from.
 *   - Persistence (D8) is position-keyed: replay after reopen mints fresh
 *     ordinals, so the snapshot refers to (lineage, position) and the
 *     restore caller supplies the mapping.
 *
 * Public interface: SessionModel (addTurn, fence, tick, untick, segmentOf,
 *   coveringSegment, openSegment, parentOf, setCollapsed, mergeUp, splitAt,
 *   isSkipped, titleOf, extentOf, forkPointAfter, snapshot, restore, turns,
 *   segments, hasOpening; lineages —
 *   fork, registerLineage, activateLineage, activeLineage, lineageInfo,
 *   lineages, lineageOf, pathOf, pathTurns, isTurnVisible,
 *   ancestryCommandsBefore, pathCommandsOf, branchPoints, pendingTitleOf,
 *   turnsForCompose; authoring — claimsOf, addContains, addNotContains,
 *   setExact, addState, addEvent, addChannel, removeDefault,
 *   removeContains, removeNotContains, removeState, removeEvent,
 *   removeChannel), TurnMeta, Segment, LineageInfo, BranchPoint,
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
  /** The logical lineage this turn belongs to; defaults to the root (1). */
  lineage?: number;
}

/** A contiguous range of turns; `end === null` while the range is open. */
export interface Segment {
  start: number;
  end: number | null;
  /** Purely visual: a collapsed segment renders as one summary card. */
  collapsed: boolean;
  /** The lineage whose turns this range covers — never spans lineages. */
  lineage: number;
}

/** One lineage: the root session, or a branch forked from a parent. */
export interface LineageInfo {
  id: number;
  /** Absent on the root. */
  parentId?: number;
  /** The ordinal IN THE PARENT'S path this lineage forks at (its alternate
   *  command replaces that turn's command). Absent on the root. */
  forkAt?: number;
  /** The typed alternate command, held until its replayed turn lands —
   *  the pending chip names itself from it (design §4). */
  pendingCommand?: string;
}

/** One fork point: every lineage forked at the same (parent, ordinal). */
export interface BranchPoint {
  parentId: number;
  at: number;
  /** Sibling lineage ids in creation order (the parent's own continuation
   *  renders as the main chip and is not listed here). */
  siblings: number[];
}

/** What one tick did — the cards layer re-renders on anything but 'noop'. */
export type TickResult =
  | 'started'   // a fresh open segment began at this turn
  | 'extended'  // the open segment's start moved down to this turn
  | 'closed'    // the open segment's end landed on this turn
  | 'noop';     // already assigned, or the extension would overlap

/**
 * The persisted view-state shape (ADR-306 D8 sidecar — view/session truth
 * only, no assertions, no transcript content). Position-keyed: `pos` is a
 * turn's 1-based index within its own lineage's turns (0 = the opening),
 * because ordinals do not survive restore-by-replay.
 */
export interface SessionSnapshot {
  lineages: {
    id: number;
    parentId?: number;
    /** Fork point as a position in the PARENT lineage. */
    forkAtPos?: number;
    pendingCommand?: string;
    /** The lineage's own turns, in order (opening excluded — it reseats). */
    turns: { command: string; boot: boolean }[];
  }[];
  active: number;
  segments: {
    lineage: number;
    startPos: number;
    endPos: number | null;
    collapsed: boolean;
  }[];
  skipped: { lineage: number; pos: number }[];
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

/** The undo stack's unit — see {@link SessionModel.captureAuthoring}. */
export interface AuthoringMemento {
  segments: Segment[];
  skipped: Set<number>;
  claims: Map<number, TurnClaims>;
  lineages: LineageInfo[];
  active: number;
}

const ROOT_LINEAGE = 1;

export class SessionModel {
  /** Played turns in feed order (opening included once present). */
  private turnList: TurnMeta[] = [];

  /** Segments in creation order; render order derives from `start`. */
  private segmentList: Segment[] = [];

  /** Ordinals demoted to `[SKIP]` (merge gap turns, and pruned-to-nothing turns). */
  private skippedSet = new Set<number>();

  /** Authored claims by ordinal (0 = the opening's claims). Absent = untouched. */
  private claimsMap = new Map<number, TurnClaims>();

  /** Logical lineages, root first, in creation order. */
  private lineageList: LineageInfo[] = [{ id: ROOT_LINEAGE }];

  /** The lineage that is both viewed and live (Phase 5 rule: one and the
   *  same — chip selection replays the sibling live before it shows). */
  private active = ROOT_LINEAGE;

  get turns(): readonly TurnMeta[] { return this.turnList; }
  get segments(): readonly Segment[] { return this.segmentList; }
  get lineages(): readonly LineageInfo[] { return this.lineageList; }
  get activeLineage(): number { return this.active; }

  /** True once the opening (ordinal 0) is on the board. */
  get hasOpening(): boolean { return this.turnList.some(t => t.ordinal === 0); }

  lineageInfo(id: number): LineageInfo | undefined {
    return this.lineageList.find(l => l.id === id);
  }

  /** The lineage a played ordinal belongs to. */
  lineageOf(n: number): number | undefined {
    const turn = this.turnByOrdinal(n);
    return turn === undefined ? undefined : (turn.lineage ?? ROOT_LINEAGE);
  }

  /**
   * Folds one delivered turn in. The first turn of the session also seats
   * the opening (ordinal 0): the prologue + banner rendered before the boot
   * look, the nameable beginning of a root transcript (design §2). A turn
   * landing on a lineage with a pending fork command completes the branch:
   * it becomes the branch's own closed single-turn segment (design §6 — the
   * chips read "· 1 turn"; the author extends it with ordinary gestures).
   */
  addTurn(meta: TurnMeta): void {
    const lineage = meta.lineage ?? ROOT_LINEAGE;
    if (this.turnList.length === 0 && meta.ordinal > 0) {
      this.turnList.push({ ordinal: 0, command: '', boot: false, lineage: ROOT_LINEAGE });
    }
    this.turnList.push({ ...meta, lineage });
    const info = this.lineageInfo(lineage);
    if (info?.pendingCommand !== undefined) {
      delete info.pendingCommand;
      this.segmentList.push({
        start: meta.ordinal, end: meta.ordinal, collapsed: false, lineage,
      });
    }
  }

  /**
   * A restart fence (ADR-305 D3): everything before it is dead lineage —
   * turns, segments, skips, claims, and the whole fork tree clear. The next
   * delivered turn reseats the opening for the new root lineage.
   */
  fence(): void {
    this.turnList = [];
    this.segmentList = [];
    this.skippedSet.clear();
    this.claimsMap.clear();
    this.lineageList = [{ id: ROOT_LINEAGE }];
    this.active = ROOT_LINEAGE;
  }

  private turnByOrdinal(n: number): TurnMeta | undefined {
    return this.turnList.find(t => t.ordinal === n);
  }

  private turnsOfLineage(id: number): TurnMeta[] {
    return this.turnList.filter(t => (t.lineage ?? ROOT_LINEAGE) === id && t.ordinal > 0);
  }

  // ── lineages and visibility (design §6) ──────────────────────────────

  /** The lineage chain root → … → `id`; empty for an unknown id. */
  pathOf(id: number): number[] {
    const chain: number[] = [];
    let cursor: LineageInfo | undefined = this.lineageInfo(id);
    while (cursor) {
      chain.unshift(cursor.id);
      cursor = cursor.parentId === undefined ? undefined : this.lineageInfo(cursor.parentId);
    }
    return chain;
  }

  /**
   * The turns visible when `id` is active, in play order: each ancestor
   * contributes its turns up to (excluding) the fork the path leaves it at;
   * the lineage itself contributes all its turns. The opening (ordinal 0)
   * rides in front when the root is on the path.
   */
  pathTurns(id: number): TurnMeta[] {
    const chain = this.pathOf(id);
    if (chain.length === 0) return [];
    const visible: TurnMeta[] = [];
    const openingTurn = this.turnList.find(t => t.ordinal === 0);
    if (openingTurn) visible.push(openingTurn);
    for (let i = 0; i < chain.length; i += 1) {
      const cutAt = i + 1 < chain.length
        ? this.lineageInfo(chain[i + 1])?.forkAt
        : undefined;
      for (const turn of this.turnsOfLineage(chain[i])) {
        if (cutAt === undefined || turn.ordinal < cutAt) visible.push(turn);
      }
    }
    return visible;
  }

  /** Whether ordinal `n` shows under the ACTIVE lineage (lineage cut —
   *  design §6: turns past a fork are sticky to the branch that played
   *  them). The opening is visible whenever it exists. */
  isTurnVisible(n: number): boolean {
    if (n === 0) return this.hasOpening;
    return this.pathTurns(this.active).some(t => t.ordinal === n);
  }

  /**
   * The fork point a card at `n` OFFERS (David 2026-08-09: Branch tries a
   * different command FROM the state the card shows, not instead of it):
   * the next turn after `n` on the ACTIVE path — the turn the alternate
   * replaces. Undefined at the path's tip (typing continues the recording;
   * there is nothing to preserve as a sibling) and at points `fork` would
   * refuse (uncovered, collapsed, or nothing shared before them).
   */
  forkPointAfter(n: number): number | undefined {
    const path = this.pathTurns(this.active).filter(t => t.ordinal > 0);
    const index = n === 0 ? -1 : path.findIndex(t => t.ordinal === n);
    if (n !== 0 && index < 0) return undefined;
    const next = path[index + 1]?.ordinal;
    if (next === undefined) return undefined;
    const segment = this.coveringSegment(next);
    if (!segment || segment.collapsed) return undefined;
    if (segment.start < next) {
      return this.prevInLineage(segment.lineage, next) === undefined ? undefined : next;
    }
    return this.parentOf(segment) === undefined ? undefined : next;
  }

  /**
   * Forks at ordinal `n` with the typed alternate `command` (design §6):
   * validates that a segment covers the point — an OPEN recording's growing
   * extent included (David 2026-08-09: Branch stays available while
   * recording) — and something shared comes before it, auto-splits so the
   * shared prefix becomes the collapsed parent (the recording, if open,
   * continues open past the fork point), registers the branch lineage, and
   * makes it active. The branch is pending until its replayed turn lands
   * (`addTurn` completes it). Returns the new lineage id, or null when the
   * point cannot fork.
   */
  fork(n: number, command: string): number | null {
    const segment = this.coveringSegment(n);
    if (!segment) return null;

    // Point identity: forking a lineage at its own FIRST turn shares
    // exactly the prefix its own fork shared — the sibling joins THAT
    // point (design §6: "every later use at the same point adds another
    // sibling"), never a nested one-behind-it point.
    let pointLineage = segment.lineage;
    let pointAt = n;
    for (;;) {
      const info = this.lineageInfo(pointLineage);
      if (info?.parentId === undefined || info.forkAt === undefined) break;
      const firstOwn = this.turnsOfLineage(pointLineage)[0]?.ordinal;
      if (firstOwn !== pointAt) break;
      pointAt = info.forkAt;
      pointLineage = info.parentId;
    }

    if (segment.start < n) {
      // Auto-split: the shared prefix becomes the parent of all siblings.
      // It stays EXPANDED (David 2026-08-09: the cards before a fork — and
      // under a selected branch — remain fully visible; Collapse is a
      // manual gesture only).
      const before = this.prevInLineage(segment.lineage, n);
      if (before === undefined) return null;
      const main: Segment = {
        start: n, end: segment.end, collapsed: false, lineage: segment.lineage,
      };
      segment.end = before;
      this.segmentList.push(main);
    } else {
      // Forking at a segment's own first turn needs an existing parent —
      // a turn with nothing shared before it cannot fork (design §6).
      const parent = this.parentOf(segment);
      if (!parent) return null;
    }

    const id = Math.max(...this.lineageList.map(l => l.id)) + 1;
    this.lineageList.push({
      id, parentId: pointLineage, forkAt: pointAt, pendingCommand: command,
    });
    this.active = id;
    return id;
  }

  /**
   * Registers a lineage without gesture side effects — the restore driver's
   * door (segment structure arrives wholesale via `restore`, so no
   * auto-split and no pending segment). Refuses duplicate ids.
   */
  registerLineage(info: LineageInfo): boolean {
    if (this.lineageInfo(info.id)) return false;
    this.lineageList.push({ ...info });
    return true;
  }

  /** Makes a lineage active (the caller replays it live first — Phase 5's
   *  rule that the viewed lineage IS the played lineage). */
  activateLineage(id: number): boolean {
    if (!this.lineageInfo(id)) return false;
    this.active = id;
    return true;
  }

  /**
   * Deletes a branch (David's ruling, 2026-08-09): the lineage, its turns,
   * segments, claims, skips — and every descendant branch, which cannot
   * outlive the line it forked from. The root lineage never deletes. When
   * the deletion empties its fork point, the auto-split boundary merges
   * back — with Split retired as a gesture, every boundary is fork-made,
   * so the merge can never destroy deliberate structure.
   *
   * Returns what the caller must reconcile — the surviving parent, and
   * whether the VIEWED lineage died (the caller replays the parent live,
   * Phase 5's view-is-live rule) — or null when `id` cannot delete.
   */
  deleteLineage(id: number): { parentId: number; wasActive: boolean } | null {
    const info = this.lineageInfo(id);
    if (!info || info.parentId === undefined || info.forkAt === undefined) return null;

    const doomed = new Set<number>([id]);
    for (;;) {
      const before = doomed.size;
      for (const lineage of this.lineageList) {
        if (lineage.parentId !== undefined && doomed.has(lineage.parentId)) {
          doomed.add(lineage.id);
        }
      }
      if (doomed.size === before) break;
    }

    const wasActive = doomed.has(this.active);
    const doomedOrdinals = new Set(
      this.turnList.filter(t => doomed.has(t.lineage ?? ROOT_LINEAGE)).map(t => t.ordinal));
    this.turnList = this.turnList.filter(t => !doomed.has(t.lineage ?? ROOT_LINEAGE));
    this.segmentList = this.segmentList.filter(s => !doomed.has(s.lineage));
    for (const ordinal of doomedOrdinals) {
      this.skippedSet.delete(ordinal);
      this.claimsMap.delete(ordinal);
    }
    this.lineageList = this.lineageList.filter(l => !doomed.has(l.id));
    if (wasActive) this.active = info.parentId;

    // The fork point emptied: no surviving sibling forks at (parent, at) —
    // fold the auto-split boundary back together.
    const pointStillForks = this.lineageList.some(l =>
      l.parentId === info.parentId && l.forkAt === info.forkAt);
    if (!pointStillForks) {
      const tail = this.segmentList.find(s =>
        s.lineage === info.parentId && s.start === info.forkAt);
      if (tail && this.parentOf(tail)?.lineage === info.parentId) {
        this.mergeUp(tail);
      }
    }
    return { parentId: info.parentId, wasActive };
  }

  /** Every fork point, grouped by (parent lineage, ordinal), in first-use
   *  order — the cards layer renders one chip row per point. */
  branchPoints(): BranchPoint[] {
    const points: BranchPoint[] = [];
    for (const lineage of this.lineageList) {
      if (lineage.parentId === undefined || lineage.forkAt === undefined) continue;
      let point = points.find(p =>
        p.parentId === lineage.parentId && p.at === lineage.forkAt);
      if (!point) {
        point = { parentId: lineage.parentId, at: lineage.forkAt, siblings: [] };
        points.push(point);
      }
      point.siblings.push(lineage.id);
    }
    return points;
  }

  /** The commands that reproduce the shared prefix of a fork at `n`: every
   *  non-boot command path-before `n` on the path into `n`'s lineage. */
  ancestryCommandsBefore(n: number): string[] {
    const lineage = this.lineageOf(n);
    if (lineage === undefined) return [];
    return this.pathTurns(lineage)
      .filter(t => t.ordinal > 0 && t.ordinal < n && !t.boot)
      .map(t => t.command);
  }

  /** The commands that replay lineage `id` live from a fresh boot: its full
   *  path, boot looks excluded (a fresh boot plays its own). */
  pathCommandsOf(id: number): string[] {
    return this.pathTurns(id)
      .filter(t => t.ordinal > 0 && !t.boot)
      .map(t => t.command);
  }

  /** The pending chip's name: route-from + the typed command (design §4 —
   *  "a pending branch uses the typed command until its replay lands"). */
  pendingTitleOf(id: number): string | undefined {
    const info = this.lineageInfo(id);
    if (info?.pendingCommand === undefined || info.forkAt === undefined) return undefined;
    const prev = this.prevPathTurnBefore(id, info.forkAt);
    return `${slugify(prev?.room ?? 'session')}-${slugify(info.pendingCommand)}-1`;
  }

  /** The nearest path-visible turn before ordinal `n` on lineage `id`'s
   *  path (`n` itself need not belong to `id` — fork points sit in the
   *  parent). Falls back through the path when `n` heads it. */
  private prevPathTurnBefore(id: number, n: number): TurnMeta | undefined {
    const path = this.pathTurns(id).filter(t => t.ordinal > 0);
    let prev: TurnMeta | undefined;
    for (const turn of path) {
      if (turn.ordinal >= n) break;
      prev = turn;
    }
    return prev ?? path[0];
  }

  /** The lineage's previous own-turn ordinal before `n`, if any. */
  private prevInLineage(id: number, n: number): number | undefined {
    let prev: number | undefined;
    for (const turn of this.turnsOfLineage(id)) {
      if (turn.ordinal >= n) break;
      prev = turn.ordinal;
    }
    return prev;
  }

  /**
   * The turns a segment's transcript walks, in path order: everything
   * strictly after its parent segment's end (or the path's beginning) up to
   * the segment's extent — pre-range turns write `[SKIP]`, in-range turns
   * carry their claims (compose's iteration source; never ordinal windows,
   * which would cross lineages). An OPEN range walks to its current extent:
   * a range is a file from its first tick and the file grows as the author
   * plays (David's ruling 2026-08-09 — every gesture lands on disk).
   */
  turnsForCompose(s: Segment): TurnMeta[] {
    const path = this.pathTurns(s.lineage).filter(t => t.ordinal > 0);
    const parent = this.parentOf(s);
    const afterIndex = parent === undefined
      ? -1
      : path.findIndex(t => t.ordinal === this.endOf(parent));
    const endIndex = path.findIndex(t => t.ordinal === this.extentOf(s));
    if (endIndex < 0) return [];
    return path.slice(afterIndex + 1, endIndex + 1);
  }

  /**
   * The last turn a range currently reaches: a closed range's end; an open
   * range's latest same-lineage turn after its start, stopping short of the
   * first turn another segment owns (a growing recording must never swallow
   * a neighbouring transcript's turns). Falls back to the start itself.
   */
  extentOf(s: Segment): number {
    if (s.end !== null) return s.end;
    let extent = s.start;
    for (const turn of this.turnsOfLineage(s.lineage)) {
      if (turn.ordinal <= s.start) continue;
      const owner = this.segmentList.find(x =>
        x !== s && x.lineage === s.lineage &&
        turn.ordinal >= x.start && turn.ordinal <= this.endOf(x));
      if (owner) break;
      extent = turn.ordinal;
    }
    return extent;
  }

  // ── segments (design §3) ─────────────────────────────────────────────

  /** End used for ordering/containment: an open segment ends at its start. */
  private endOf(s: Segment): number { return s.end ?? s.start; }

  /** The segment covering ordinal `n`, if any — same-lineage containment
   *  only (a segment never spans lineages). An OPEN segment covers only its
   *  start here (so a later tick still reads as "close here"); use
   *  {@link coveringSegment} for growing-extent coverage. */
  segmentOf(n: number): Segment | undefined {
    const lineage = n === 0 ? ROOT_LINEAGE : this.lineageOf(n);
    return this.segmentList.find(s =>
      s.lineage === lineage && n >= s.start && n <= this.endOf(s));
  }

  /** The segment whose transcript walk covers `n`: an exact {@link segmentOf}
   *  hit, or the open range whose growing extent reaches it — the coverage
   *  authoring gestures and the cards use (a mid-recording turn IS part of
   *  the recording). */
  coveringSegment(n: number): Segment | undefined {
    const direct = this.segmentOf(n);
    if (direct) return direct;
    const lineage = n === 0 ? ROOT_LINEAGE : this.lineageOf(n);
    return this.segmentList.find(s =>
      s.lineage === lineage && n >= s.start && n <= this.extentOf(s));
  }

  /** The at-most-one open segment (global — one recording at a time). */
  openSegment(): Segment | undefined {
    return this.segmentList.find(s => s.end === null);
  }

  /**
   * The segment `s` continues from: the nearest one whose end sits
   * path-before `s` on `s`'s own path — an ancestor-lineage segment for a
   * branch's first transcript, an earlier same-lineage one otherwise.
   */
  parentOf(s: Segment): Segment | undefined {
    const path = this.pathTurns(s.lineage);
    const indexOf = (n: number) =>
      n === 0 ? -0.5 : path.findIndex(t => t.ordinal === n);
    const startIndex = indexOf(s.start);
    const candidates = this.segmentList
      .filter(x => x !== s)
      .map(x => ({ segment: x, endIndex: indexOf(this.endOf(x)) }))
      .filter(x => x.endIndex >= 0 && x.endIndex < startIndex);
    return candidates.sort((a, b) => b.endIndex - a.endIndex)[0]?.segment;
  }

  /** True when any same-lineage segment intersects [from, to] (inclusive). */
  private overlaps(lineage: number, from: number, to: number, ignoring?: Segment): boolean {
    return this.segmentList.some(s =>
      s !== ignoring && s.lineage === lineage &&
      this.endOf(s) >= from && s.start <= to);
  }

  /**
   * Ticks the rail box on ordinal `n` (design §3): starts a segment, extends
   * the open one's start downward, or closes it — never overlapping another
   * segment, and never crossing lineages (a range is one coherent path).
   * Sequential ticking EXTENDS the same transcript (David 2026-08-09: "the
   * transcripts are renamed when sequential cards are checked") — a closed
   * same-lineage segment before `n` grows its end to `n` and the file
   * renames, unless a fork point stands between: fork-made boundaries are
   * the only boundaries, and `continues:` belongs to branch starts alone.
   */
  tick(n: number): TickResult {
    if (n !== 0 && !this.turnByOrdinal(n)) return 'noop';
    if (n === 0 && !this.hasOpening) return 'noop';
    if (this.segmentOf(n)) return 'noop';
    const lineage = n === 0 ? ROOT_LINEAGE : (this.lineageOf(n) ?? ROOT_LINEAGE);
    const open = this.openSegment();
    if (!open) {
      const prev = this.segmentList
        .filter(s => s.lineage === lineage && s.end !== null && s.end < n)
        .sort((a, b) => b.end! - a.end!)[0];
      if (prev) {
        const forkBetween = this.lineageList.some(l =>
          l.forkAt !== undefined && this.lineageOf(l.forkAt) === lineage &&
          l.forkAt > prev.end! && l.forkAt <= n);
        if (!forkBetween && !this.overlaps(lineage, prev.end! + 1, n, prev)) {
          prev.end = n;
          prev.collapsed = false;
          return 'extended';
        }
      }
      this.segmentList.push({ start: n, end: null, collapsed: false, lineage });
      return 'started';
    }
    if (open.lineage !== lineage) return 'noop';
    if (n < open.start) {
      if (this.overlaps(lineage, n, open.start - 1, open)) return 'noop';
      open.start = n;
      return 'extended';
    }
    if (this.overlaps(lineage, open.start + 1, n, open)) return 'noop';
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
   * Returns false when `s` has no parent, or the parent lives in another
   * lineage (a merged range would span lineages — refused).
   */
  mergeUp(s: Segment): boolean {
    const parent = this.parentOf(s);
    if (!parent || parent.lineage !== s.lineage) return false;
    for (const t of this.turnsOfLineage(s.lineage)) {
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
    const before = this.prevInLineage(s.lineage, n);
    if (before === undefined || before < s.start) return false;
    const tail: Segment = { start: n, end: s.end, collapsed: false, lineage: s.lineage };
    s.end = before;
    s.collapsed = false;
    this.segmentList.push(tail);
    return true;
  }

  /** Whether ordinal `n` rides as `[SKIP]` (merge gaps; pruned turns). */
  isSkipped(n: number): boolean { return this.skippedSet.has(n); }

  /**
   * Captures the authoring state — segments, skips, claims, lineage table,
   * the active lineage — WITHOUT the played-turn list. The undo stack's
   * unit (David's ruling, 2026-08-09): gestures over what was played are
   * undoable; the played turns themselves are not, so a memento never
   * resurrects a lineage whose turns are gone (which is why fork and
   * branch-delete clear the stack instead of joining it).
   */
  captureAuthoring(): AuthoringMemento {
    return {
      segments: this.segmentList.map(s => ({ ...s })),
      skipped: new Set(this.skippedSet),
      claims: new Map([...this.claimsMap].map(([n, c]) => [n, {
        ...c,
        contains: [...c.contains],
        notContains: [...c.notContains],
        states: [...c.states],
        events: [...c.events],
        channels: c.channels.map(ch => ({ ...ch })),
      }])),
      lineages: this.lineageList.map(l => ({ ...l })),
      active: this.active,
    };
  }

  /** Puts a captured authoring state back — the undo gesture's whole act. */
  restoreAuthoring(memento: AuthoringMemento): void {
    this.segmentList = memento.segments.map(s => ({ ...s }));
    this.skippedSet = new Set(memento.skipped);
    this.claimsMap = new Map([...memento.claims].map(([n, c]) => [n, {
      ...c,
      contains: [...c.contains],
      notContains: [...c.notContains],
      states: [...c.states],
      events: [...c.events],
      channels: c.channels.map(ch => ({ ...ch })),
    }]));
    this.lineageList = memento.lineages.map(l => ({ ...l }));
    this.active = memento.active;
  }

  /**
   * Containment for marks: unlike `segmentOf` (where an open range covers
   * only its start, so a later tick still reads as "close here"), a mark
   * inside an open range is inside it up to the lineage's latest played
   * turn — a merge that left the range open must not shed its gap `[SKIP]`s.
   */
  private coveredByAnySegment(n: number): boolean {
    const lineage = n === 0 ? ROOT_LINEAGE : this.lineageOf(n);
    return this.segmentList.some(s => {
      if (s.lineage !== lineage) return false;
      const latest = this.turnsOfLineage(s.lineage)
        .reduce((m, t) => Math.max(m, t.ordinal), 0);
      return n >= s.start && n <= (s.end ?? latest);
    });
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
   * `[SKIP]`. A turn already inside an open range's growing extent needs no
   * tick (it is part of the recording; ticking would close the range the
   * author is still playing). Returns false for an unknown ordinal.
   */
  private includeForAuthoring(n: number): boolean {
    if (n !== 0 && !this.turnByOrdinal(n)) return false;
    if (n === 0 && !this.hasOpening) return false;
    this.skippedSet.delete(n);
    if (!this.coveringSegment(n)) this.tick(n);
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

  // ── naming (design §4) ───────────────────────────────────────────────

  /**
   * Where the player STOOD when the range began: the previous path turn's
   * room — for a branch's first transcript that is the parent lineage's
   * pre-fork room; for a range at the very beginning, the boot room.
   */
  private startRoomOf(s: Segment): string {
    const path = this.pathTurns(s.lineage).filter(t => t.ordinal > 0);
    if (path.length === 0) return 'session';
    if (s.start <= path[0].ordinal) return path[0].room ?? 'session';
    let prev = path[0];
    for (const turn of path) {
      if (turn.ordinal >= s.start) break;
      prev = turn;
    }
    return prev.room ?? 'session';
  }

  private endRoomOf(s: Segment): string {
    return this.turnByOrdinal(this.extentOf(s))?.room ?? 'session';
  }

  /** Played-turn count of the range — the lineage's own turns inside it
   *  (never ordinal arithmetic: lineage ordinals gap after forks). An open
   *  range counts to its extent, so a growing recording's name grows too. */
  private turnCountOf(s: Segment): number {
    const count = this.turnsOfLineage(s.lineage)
      .filter(t => t.ordinal >= s.start && t.ordinal <= this.extentOf(s))
      .length;
    return Math.max(1, count);
  }

  /** The route-derived base name, before collision suffixing. A transcript
   *  that begins at the OPENING is named for where the story opens —
   *  `opening-<first room>` (David 2026-08-09) — and the name stays stable
   *  as the recording grows. */
  private baseTitleOf(s: Segment): string {
    if (s.start === 0) {
      const first = this.pathTurns(s.lineage).find(t => t.ordinal > 0);
      return `opening-${slugify(first?.room ?? 'session')}`;
    }
    const from = slugify(this.startRoomOf(s));
    const to = slugify(this.endRoomOf(s));
    const count = this.turnCountOf(s);
    return from === to ? `${from}-${count}` : `${from}-to-${to}-${count}`;
  }

  /**
   * The auto-derived name (design §4): route + turn count, `-2`/`-3` when
   * an earlier segment (by start ordinal, any lineage — one `tests/`
   * namespace) already claimed the same route.
   */
  titleOf(s: Segment): string {
    const base = this.baseTitleOf(s);
    const earlier = this.segmentList
      .filter(x => x.start < s.start && this.baseTitleOf(x) === base)
      .length;
    return earlier === 0 ? base : `${base}-${earlier + 1}`;
  }

  // ── persistence (ADR-306 D8) ─────────────────────────────────────────

  /** A turn's 1-based position within its own lineage (0 = the opening) —
   *  the stable key persistence and the driver use (ordinals don't survive
   *  restore-by-replay; positions do). */
  positionOf(n: number): { lineage: number; pos: number } | undefined {
    if (n === 0) return this.hasOpening ? { lineage: ROOT_LINEAGE, pos: 0 } : undefined;
    const lineage = this.lineageOf(n);
    if (lineage === undefined) return undefined;
    const index = this.turnsOfLineage(lineage).findIndex(t => t.ordinal === n);
    return index < 0 ? undefined : { lineage, pos: index + 1 };
  }

  /** Lineages the persisted session keeps: the root always; a branch only
   *  while its subtree carries a segment or a pending fork. Branch play
   *  with no transcript is ephemeral (David's ruling 2026-08-09: the
   *  session worth restoring is the session the SUITE describes). */
  private survivingLineages(): Set<number> {
    const surviving = new Set<number>([ROOT_LINEAGE]);
    for (;;) {
      const before = surviving.size;
      for (const info of this.lineageList) {
        if (surviving.has(info.id)) continue;
        const hasOwn = this.segmentList.some(s => s.lineage === info.id)
          || info.pendingCommand !== undefined;
        const hasHeir = this.lineageList.some(l =>
          l.parentId === info.id && surviving.has(l.id));
        if (hasOwn || hasHeir) surviving.add(info.id);
      }
      if (surviving.size === before) break;
    }
    return surviving;
  }

  /** The last own-turn position of lineage `id` the persisted session
   *  needs: segment coverage (an open range to its extent), plus each
   *  surviving child's fork point. Turns beyond it are unticked play and
   *  do not replay on reopen (David's ruling 2026-08-09 — untick
   *  everything and the tab reopens fresh). */
  private neededPositions(id: number, surviving: Set<number>): number {
    let needed = 0;
    for (const s of this.segmentList) {
      if (s.lineage !== id) continue;
      const extent = this.extentOf(s);
      const at = extent === 0 ? undefined : this.positionOf(extent);
      if (at) needed = Math.max(needed, at.pos);
    }
    for (const info of this.lineageList) {
      if (info.parentId !== id || !surviving.has(info.id)) continue;
      if (info.forkAt === undefined) continue;
      const at = this.positionOf(info.forkAt);
      if (at) needed = Math.max(needed, at.pos);
    }
    return needed;
  }

  /**
   * The persisted view state (ADR-306 D8): the fork tree with each
   * lineage's own commands (restore-by-replay's script), segment structure,
   * and skips — all position-keyed, no assertions, no transcript content.
   * Scoped to the suite (David's ruling 2026-08-09): each lineage's turns
   * are trimmed to what its segments and surviving branches need, and
   * segmentless branches are dropped whole — unticked play never replays.
   */
  snapshot(): SessionSnapshot {
    const surviving = this.survivingLineages();
    const lineages = this.lineageList
      .filter(info => surviving.has(info.id))
      .map(info => {
        const entry: SessionSnapshot['lineages'][number] = {
          id: info.id,
          turns: this.turnsOfLineage(info.id)
            .slice(0, this.neededPositions(info.id, surviving))
            .map(t => ({ command: t.command, boot: t.boot })),
        };
        if (info.parentId !== undefined) entry.parentId = info.parentId;
        if (info.forkAt !== undefined) {
          const at = this.positionOf(info.forkAt);
          if (at) entry.forkAtPos = at.pos;
        }
        if (info.pendingCommand !== undefined) entry.pendingCommand = info.pendingCommand;
        return entry;
      });
    const segments: SessionSnapshot['segments'] = [];
    for (const s of this.segmentList) {
      const start = this.positionOf(s.start);
      if (!start) continue;
      const end = s.end === null ? null : this.positionOf(s.end)?.pos;
      if (end === undefined) continue;
      segments.push({
        lineage: s.lineage,
        startPos: start.pos,
        endPos: end,
        collapsed: s.collapsed,
      });
    }
    const skipped: SessionSnapshot['skipped'] = [];
    for (const n of [...this.skippedSet].sort((a, b) => a - b)) {
      const at = this.positionOf(n);
      if (at) skipped.push({ lineage: at.lineage, pos: at.pos });
    }
    // The active lineage falls back to the root when the active branch was
    // dropped — a snapshot must never name a lineage it does not carry.
    return {
      lineages,
      active: surviving.has(this.active) ? this.active : ROOT_LINEAGE,
      segments,
      skipped,
    };
  }

  /**
   * Re-applies a persisted snapshot after restore-by-replay re-fed the
   * turns (ADR-306 D8). `ordinalAt` maps a snapshot position back to the
   * REPLAYED session's fresh ordinal (the driver tracked them as turns
   * landed); position 0 of the root is the opening. Degraded-tolerant by
   * rule: entries that no longer fit — unknown positions, overlaps, a
   * second open range — are dropped silently, never an error. Lineage
   * registration is the driver's job (it happens before replay); this
   * applies structure only.
   */
  restore(
    snap: SessionSnapshot,
    ordinalAt: (lineage: number, pos: number) => number | undefined,
  ): void {
    this.segmentList = [];
    this.skippedSet.clear();
    const resolve = (lineage: number, pos: number): number | undefined => {
      if (pos === 0) return this.hasOpening ? 0 : undefined;
      const n = ordinalAt(lineage, pos);
      if (n === undefined || !this.turnByOrdinal(n)) return undefined;
      return this.lineageOf(n) === lineage ? n : undefined;
    };

    for (const raw of snap.segments ?? []) {
      if (typeof raw?.startPos !== 'number' || typeof raw?.lineage !== 'number') continue;
      const start = resolve(raw.lineage, raw.startPos);
      if (start === undefined) continue;
      const end = raw.endPos === null || raw.endPos === undefined
        ? null
        : resolve(raw.lineage, raw.endPos);
      if (raw.endPos !== null && raw.endPos !== undefined && end === undefined) continue;
      if (end !== null && end !== undefined && end < start) continue;
      if (end === null && this.openSegment()) continue;
      const lineage = start === 0 ? ROOT_LINEAGE : (this.lineageOf(start) ?? ROOT_LINEAGE);
      if (this.overlaps(lineage, start, end ?? start)) continue;
      this.segmentList.push({
        start,
        end: end ?? null,
        collapsed: end !== null && end !== undefined && raw.collapsed === true,
        lineage,
      });
    }
    for (const raw of snap.skipped ?? []) {
      if (typeof raw?.lineage !== 'number' || typeof raw?.pos !== 'number') continue;
      const n = resolve(raw.lineage, raw.pos);
      if (n !== undefined && this.coveredByAnySegment(n)) this.skippedSet.add(n);
    }
    if (typeof snap.active === 'number' && this.lineageInfo(snap.active)) {
      this.active = snap.active;
    }
  }
}
