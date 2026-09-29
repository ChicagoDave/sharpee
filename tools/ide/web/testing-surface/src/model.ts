/**
 * model.ts — the Testing tab's tree-session model (ADR-307: the tree IS the
 * model, files are a projection).
 *
 * Purpose: the in-memory model IS the card-recursive tree document — a live
 *   `TreeDocument` (the shared wire shape both consumers read and write) plus
 *   session-only indexing that never persists: ordinal ↔ card binding for the
 *   feed, per-ordinal rooms for derived labels, and the line registry (main
 *   line + every branch's cards array). Every played turn appends a card
 *   (always recording, D3); every mutation is observable through
 *   `files()`, the tree's at-rest segment files (ADR-355), which the driver
 *   diffs against what it last posted and posts only what changed.
 *
 * Line identity (ADR-355 D5): a line is identified by the id of the segment
 *   it begins with — the main line by the document's root id
 *   ({@link TreeSessionModel.mainLine}), a branch by its own persisted id.
 *   Ids are opaque and stable, so the run column and the view-state sidecar
 *   key on them and two lines sharing a derived label never fold (GH #494).
 *
 * The v1 range/tick/segment machinery — ticks, open/closed ranges, extension
 * rules, stems and auto-naming, rename cascade, the detach/diverged class —
 * is deleted, not carried (ADR-307 D2/D3). Labels are DERIVED, computed from
 * session rooms through the shared helpers, persisted nowhere.
 *
 * Binding replay: after `load()` (reopen), `beginRebindAll()`, a
 * structural repair, or `beginRebind(line)` (a re-visit of one line),
 * delivered turns BIND to the document's existing cards in line order
 * instead of appending — restore-by-replay re-derives the board from the
 * document without duplicating it. Once a line's cards are all bound,
 * further turns append (the author keeps playing).
 *
 * Public interface: TreeSessionModel (document, mainLine, files, load, reset,
 *   beginRebindAll, beginRebind, addTurn, hasOpening, cardAt, ordinalOf, roomOf,
 *   isTurnVisible, visibleOrdinals, pathCardsOf, prefixCommandsOf,
 *   ownCommandsOf, lineIds, activeLine, activateLine, lineParentOf,
 *   labelOf, branchPointsOnPath, canBranch, branch, deleteBranch, tailCut,
 *   spliceIn, spliceOut, captureAuthoring, restoreAuthoring; authoring —
 *   addContains, addNotContains, setExact, addState, addEvent, addChannel,
 *   (recording persists policy synthesis via TurnDelivery — JSON is the
 *   source of truth, David 2026-08-10),
 *   removeContains, removeNotContains, removeState, removeEvent,
 *   removeChannel, claimsNothing),
 *   TurnDelivery, BranchPoint, AuthoringMemento.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import {
  branchLineLabelOf,
  createSegmentId,
  emptyTreeDocument,
  ensureSegmentIds,
  mainLineLabelOf,
  roomSlugOf,
  segmentTree,
  type TreeAssertions,
  type TreeBranch,
  type TreeCard,
  type TreeChannelAssertion,
  type TreeDocument,
  type TreeFiles,
} from '@sharpee/branch-tester/tree-document';

/** One delivered turn as the model folds it in. */
export interface TurnDelivery {
  /** The feed ordinal; the session's first record also seats the opening (0). */
  ordinal: number;
  /** The typed command; '' for a boot look. */
  command: string;
  /** True for a fresh boot's automatic first look. */
  boot: boolean;
  /** The room the player is in AFTER this turn (room-name capture). */
  room?: string;
  /**
   * What recording persists onto an APPENDED card (David 2026-08-10: the
   * JSON is the source of truth — synthesis happens when the turn lands and
   * is written into the document). A delivery that BINDS to an existing card
   * never overwrites its claims (a replay rebuilds state, not truth) — but
   * it FILLS a claim-less, non-skip card: a spliced-in turn was never
   * played, and the whole-path replay is exactly where its truth records.
   */
  assertions?: TreeAssertions;
  /** Recording demotes the appended card to an explicit `[SKIP]` (the
   *  policy had nothing to read this turn). Binds void-fill like
   *  `assertions`, never overwrite. */
  skip?: boolean;
  /** The story ended on this turn, with this ending id (ADR-356 D4): the
   *  card becomes an END STATE card. Binds void-fill like `assertions` —
   *  a version-1 document's ending cards gain their id on first replay. */
  ending?: string;
  /** Opening claims persisted when this delivery seats a FRESH opening card
   *  (prologue/title/description from the real boot captures). */
  openingAssertions?: TreeAssertions;
}

/** One fork point on the active path: the card and its sibling branches. */
export interface BranchPoint {
  /** The bound ordinal of the card the fork lives on. */
  ordinal: number;
  /** The line the fork card belongs to (its continuation is the main chip). */
  lineId: string;
  /** Sibling branch ids in sibling order. */
  siblings: string[];
}

/** The undo stack's unit: every card's authored assertions, deep-copied.
 *  Structure-changing gestures (branch, tail-cut, branch-delete, splice,
 *  restart) clear the stack instead of joining it, so card references stay
 *  valid for the stack's lifetime. */
export interface AuthoringMemento {
  claims: Map<TreeCard, TreeAssertions | undefined>;
}

/** Deep-copy an assertions object (arrays and channel entries). */
function cloneAssertions(assertions: TreeAssertions | undefined): TreeAssertions | undefined {
  if (assertions === undefined) return undefined;
  const copy: TreeAssertions = {};
  if (assertions.contains) copy.contains = [...assertions.contains];
  if (assertions.notContains) copy.notContains = [...assertions.notContains];
  if (assertions.exact) copy.exact = [...assertions.exact];
  if (assertions.states) copy.states = [...assertions.states];
  if (assertions.events) copy.events = [...assertions.events];
  if (assertions.channels) copy.channels = assertions.channels.map((c) => ({ ...c }));
  return copy;
}

export class TreeSessionModel {
  /** The truth: the live document this session reads and writes. */
  private doc: TreeDocument;

  // ── session-only indexes (never persisted) ─────────────────────────────
  private cardByOrdinal = new Map<number, TreeCard>();
  private ordinalByCard = new Map<TreeCard, number>();
  private roomByOrdinal = new Map<number, string>();

  /** Line id → the cards array it owns (the main line → `doc.cards`). */
  private lineCards = new Map<string, TreeCard[]>();
  /** Branch line id → where it forks from. Absent for the main line. */
  private lineMeta = new Map<string, { parentLine: string; forkCard: TreeCard; branch: TreeBranch }>();
  /** A just-forked line's typed command, until its replayed turn lands. */
  private pending = new Map<string, string>();
  /** Restore-by-replay: the next unbound card index per line. */
  private bindCursor = new Map<string, number>();

  private active: string;

  /**
   * @param story the story id a fresh tree is recorded for.
   * @param seed the pinned seed a fresh tree replays at.
   * @param generateId the segment and card id source — `createSegmentId`
   *   unless a test injects a deterministic one.
   */
  constructor(story: string, seed: number, private readonly generateId: () => string = () => createSegmentId()) {
    this.doc = emptyTreeDocument(story, seed, generateId());
    this.active = this.doc.id;
    this.lineCards.set(this.doc.id, this.doc.cards);
    this.bindCursor.set(this.doc.id, 0);
  }

  /** The live document — read-only by convention; mutate through the model. */
  get document(): TreeDocument {
    return this.doc;
  }

  /** The main line's id: the document's root segment id (ADR-355 D5). */
  get mainLine(): string {
    return this.doc.id;
  }

  /**
   * The tree's at-rest files (ADR-355): the manifest and one canonical file
   * per segment, through the shared segmenter. Mints any id a mutation left
   * missing first — a new card's id, a fork's continuation — IN the model,
   * so the next call yields the same names and bytes for what did not change.
   */
  files(): TreeFiles {
    ensureSegmentIds(this.doc, this.generateId);
    return segmentTree(this.doc);
  }

  /**
   * Adopt an assembled tree as this session's tree (reopen). Every line's
   * bind cursor starts at 0 — the restore driver replays the tree's own
   * commands and delivered turns bind to the existing cards. Ids are the
   * reader's: `assembleTree` refuses a tree with duplicate ids, so none is
   * reassigned here.
   */
  load(document: TreeDocument): void {
    this.doc = document;
    this.cardByOrdinal.clear();
    this.ordinalByCard.clear();
    this.roomByOrdinal.clear();
    this.lineCards.clear();
    this.lineMeta.clear();
    this.pending.clear();
    this.bindCursor.clear();
    this.active = this.doc.id;
    this.rebuildLineRegistry();
  }

  /** A segment id no segment or card in the tree uses (one namespace, D5/D7). */
  private freshId(): string {
    const taken = new Set<string>([this.doc.id]);
    const walk = (cards: TreeCard[]): void => {
      for (const card of cards) {
        if (card.id !== undefined) taken.add(card.id);
        if (card.continuation !== undefined) taken.add(card.continuation);
        for (const branch of card.branches ?? []) {
          taken.add(branch.id);
          walk(branch.cards);
        }
      }
    };
    walk(this.doc.cards);
    for (;;) {
      const id = this.generateId();
      if (!taken.has(id)) return id;
    }
  }

  /**
   * Re-derive the line registry from the document: every branch's cards
   * array registered under its id, each line's bind cursor at its first
   * UNBOUND card (bindings are card-keyed and survive structural edits).
   * Lines that left the document lose their pending marks; a dead active
   * line falls back to the main line.
   */
  private rebuildLineRegistry(): void {
    this.lineCards.clear();
    this.lineMeta.clear();
    this.bindCursor.clear();
    const cursorOf = (cards: TreeCard[]): number => {
      let index = 0;
      while (index < cards.length && this.ordinalByCard.has(cards[index])) index += 1;
      return index;
    };
    this.lineCards.set(this.doc.id, this.doc.cards);
    this.bindCursor.set(this.doc.id, cursorOf(this.doc.cards));
    const register = (cards: TreeCard[], lineId: string): void => {
      for (const card of cards) {
        for (const branch of card.branches ?? []) {
          this.lineCards.set(branch.id, branch.cards);
          this.lineMeta.set(branch.id, { parentLine: lineId, forkCard: card, branch });
          this.bindCursor.set(branch.id, cursorOf(branch.cards));
          register(branch.cards, branch.id);
        }
      }
    };
    register(this.doc.cards, this.doc.id);
    for (const id of [...this.pending.keys()]) {
      if (!this.lineCards.has(id)) this.pending.delete(id);
    }
    if (!this.lineCards.has(this.active)) this.active = this.doc.id;
  }

  /** Start over with a fresh empty tree (the degrade target, AC-4). */
  reset(story: string, seed: number): void {
    this.load(emptyTreeDocument(story, seed, this.generateId()));
  }

  /**
   * Unbind every card and rewind every line's cursor — the whole-path replay
   * that re-derives the board after a structural repair or an author restart
   * (D4: the session IS a replay of the tree).
   */
  beginRebindAll(): void {
    this.cardByOrdinal.clear();
    this.ordinalByCard.clear();
    for (const id of this.lineCards.keys()) this.bindCursor.set(id, 0);
  }

  /**
   * Unbind ONE line's own cards and rewind its cursor — a re-visit of a line
   * already on the board types the line's commands live again, and those
   * turns must rebind to its cards rather than append a second copy of them
   * (GH #541). The lines above it keep their bindings: their cards replay
   * suppressed and are never redelivered. Unknown line: nothing happens.
   */
  beginRebind(lineId: string): void {
    const cards = this.lineCards.get(lineId);
    if (cards === undefined) return;
    for (const card of cards) {
      const ordinal = this.ordinalByCard.get(card);
      if (ordinal === undefined) continue;
      this.ordinalByCard.delete(card);
      this.cardByOrdinal.delete(ordinal);
    }
    this.bindCursor.set(lineId, 0);
  }

  /** True once the opening card is bound (ordinal 0 is on the board). */
  get hasOpening(): boolean {
    return this.cardByOrdinal.has(0);
  }

  /** Every line id, main first, then branches in registration order. */
  lineIds(): string[] {
    return [...this.lineCards.keys()];
  }

  get activeLine(): string {
    return this.active;
  }

  activateLine(id: string): boolean {
    if (!this.lineCards.has(id)) return false;
    this.active = id;
    return true;
  }

  /** The line a branch forks from, or undefined for the main line. */
  lineParentOf(id: string): string | undefined {
    return this.lineMeta.get(id)?.parentLine;
  }

  cardAt(ordinal: number): TreeCard | undefined {
    return this.cardByOrdinal.get(ordinal);
  }

  ordinalOf(card: TreeCard): number | undefined {
    return this.ordinalByCard.get(card);
  }

  roomOf(ordinal: number): string | undefined {
    return this.roomByOrdinal.get(ordinal);
  }

  /**
   * Folds one delivered turn into the ACTIVE line: binds it to the line's
   * next unbound card when one exists (restore/repair replay), else appends
   * a new card (always recording, D3). The session's first record on the
   * main line also seats the opening card (bound as ordinal 0). A branch
   * line's first landed turn clears its pending command.
   */
  addTurn(delivery: TurnDelivery): void {
    const cards = this.lineCards.get(this.active);
    if (cards === undefined) return;
    if (delivery.room !== undefined) this.roomByOrdinal.set(delivery.ordinal, delivery.room);
    this.pending.delete(this.active);

    const bind = (card: TreeCard, ordinal: number): void => {
      this.cardByOrdinal.set(ordinal, card);
      this.ordinalByCard.set(card, ordinal);
    };

    let cursor = this.bindCursor.get(this.active) ?? cards.length;

    // The opening seats with the main line's first record: bind the existing
    // opening card, or create it when the tree is being recorded fresh — a
    // fresh opening also persists its recorded claims (JSON = source of
    // truth); a bound one keeps what the document already says.
    if (this.active === this.doc.id && !this.hasOpening) {
      if (cursor < cards.length && cards[cursor].type === 'opening') {
        const openingCard = cards[cursor];
        // Fill a void, never overwrite — same rule as every other bind: a
        // claim-less opening (a pre-pivot document, or a hand-edited one)
        // gains the boot's recorded claims on its first replay.
        //
        // `{}` counts as claim-less, not as filled (GH #280). Every recorded
        // tree writes the opening as `"assertions": {}`, so testing only for
        // `undefined` meant the self-heal above never once fired and the three
        // shipped trees would have stayed empty forever — the very case this
        // branch names ("a pre-pivot document, or a hand-edited one").
        const openingIsClaimless =
          openingCard.assertions === undefined
          || Object.keys(openingCard.assertions).length === 0;
        if (openingIsClaimless && openingCard.skip !== true) {
          const claims = cloneAssertions(delivery.openingAssertions);
          if (claims !== undefined) openingCard.assertions = claims;
        }
        bind(openingCard, 0);
        cursor += 1;
      } else if (cursor >= cards.length) {
        const openingClaims = cloneAssertions(delivery.openingAssertions);
        const opening: TreeCard = {
          type: 'opening',
          ...(openingClaims !== undefined ? { assertions: openingClaims } : {}),
        };
        cards.push(opening);
        bind(opening, 0);
        cursor = cards.length;
      }
    }

    if (cursor < cards.length) {
      const bound = cards[cursor];
      // Fill a void, never overwrite: a claim-less, non-skip card (a
      // spliced-in turn awaiting its first real execution) gains the
      // replay's recorded truth; every card that already speaks is kept.
      if (bound.assertions === undefined && bound.skip !== true) {
        const recorded = cloneAssertions(delivery.assertions);
        if (recorded !== undefined) bound.assertions = recorded;
        else if (delivery.skip === true) bound.skip = true;
      }
      if (bound.ending === undefined && delivery.ending !== undefined && bound.type === 'turn') {
        bound.ending = delivery.ending;
      }
      bind(bound, delivery.ordinal);
      this.bindCursor.set(this.active, cursor + 1);
      return;
    }

    const recorded = cloneAssertions(delivery.assertions);
    const card: TreeCard = delivery.boot
      ? { type: 'boot' }
      : { type: 'turn', command: delivery.command };
    if (recorded !== undefined) card.assertions = recorded;
    if (delivery.skip === true) card.skip = true;
    if (delivery.ending !== undefined && card.type === 'turn') card.ending = delivery.ending;
    cards.push(card);
    bind(card, delivery.ordinal);
    this.bindCursor.set(this.active, cards.length);
  }

  // ── the active path (visibility, replay scripts, labels) ───────────────

  /** The branch chain root → … → `id`. Each hop carries the fork card IN
   *  ITS PARENT'S cards where the hop's line forks — so `chain[hop + 1]`'s
   *  fork card is where hop `hop`'s cards cut. */
  private chainOf(id: string): { lineId: string; forkCard?: TreeCard }[] {
    const chain: { lineId: string; forkCard?: TreeCard }[] = [];
    let lineId = id;
    for (;;) {
      const meta = this.lineMeta.get(lineId);
      chain.unshift({ lineId, ...(meta !== undefined ? { forkCard: meta.forkCard } : {}) });
      if (meta === undefined) break;
      lineId = meta.parentLine;
    }
    return chain;
  }

  /**
   * The cards visible when `id` is the viewed line, in play order: each
   * ancestor line contributes its cards up to AND INCLUDING the fork card
   * the path leaves it at; the line itself contributes all its cards.
   */
  pathCardsOf(id: string): TreeCard[] {
    const chain = this.chainOf(id);
    if (this.lineCards.get(id) === undefined) return [];
    const path: TreeCard[] = [];
    for (let hop = 0; hop < chain.length; hop += 1) {
      const cards = this.lineCards.get(chain[hop].lineId) ?? [];
      const cutCard = chain[hop + 1]?.forkCard;
      for (const card of cards) {
        path.push(card);
        if (cutCard !== undefined && card === cutCard) break;
      }
    }
    return path;
  }

  /** The commands that replay `id`'s full path live from a fresh boot —
   *  opening and boot cards excluded (a fresh boot plays its own look). */
  private pathCommands(cards: TreeCard[]): string[] {
    return cards
      .filter((card) => card.type === 'turn')
      .map((card) => card.command!)
      .filter((command) => command !== undefined);
  }

  /** The replay prefix of line `id`: every typed command from the root
   *  through its fork card. Empty for the main line. */
  prefixCommandsOf(id: string): string[] {
    const meta = this.lineMeta.get(id);
    if (meta === undefined) return [];
    const parentPath = this.pathCardsOf(meta.parentLine);
    const forkIndex = parentPath.indexOf(meta.forkCard);
    return this.pathCommands(forkIndex < 0 ? parentPath : parentPath.slice(0, forkIndex + 1));
  }

  /** The line's own typed commands, in card order. */
  ownCommandsOf(id: string): string[] {
    return this.pathCommands(this.lineCards.get(id) ?? []);
  }

  /** All typed commands on the line's full path (prefix + own). */
  fullPathCommandsOf(id: string): string[] {
    return this.pathCommands(this.pathCardsOf(id));
  }

  /**
   * Every typed command on the line's full path with its OWNING line and
   * turn index — replay steps with stable keys for session ephemera (a
   * recorded dialog outcome re-applies wherever its command replays).
   */
  pathStepsOf(id: string): { command: string; lineId: string; index: number }[] {
    const chain = this.chainOf(id);
    const steps: { command: string; lineId: string; index: number }[] = [];
    for (let hop = 0; hop < chain.length; hop += 1) {
      const lineId = chain[hop].lineId;
      const cards = this.lineCards.get(lineId) ?? [];
      const cutCard = chain[hop + 1]?.forkCard;
      let index = 0;
      for (const card of cards) {
        if (card.type === 'turn' && card.command !== undefined) {
          steps.push({ command: card.command, lineId, index });
          index += 1;
        }
        if (cutCard !== undefined && card === cutCard) break;
      }
    }
    return steps;
  }

  /** Whether the card bound to `ordinal` shows under the active line. */
  isTurnVisible(ordinal: number): boolean {
    const card = this.cardByOrdinal.get(ordinal);
    if (card === undefined) return false;
    return this.pathCardsOf(this.active).includes(card);
  }

  /** The active path's bound ordinals, in play order — the render order. */
  visibleOrdinals(): number[] {
    const ordinals: number[] = [];
    for (const card of this.pathCardsOf(this.active)) {
      const ordinal = this.ordinalByCard.get(card);
      if (ordinal !== undefined) ordinals.push(ordinal);
    }
    return ordinals;
  }

  // ── derived labels (D2/Q-8 — shared formatting, never persisted) ───────

  /** The player's room AT `card` on line `lineId`'s path: the last recorded
   *  room up to and including the card (sparse channels — a turn that moved
   *  nowhere recorded no room; the position's room is the last one seen). */
  private roomAtCard(lineId: string, at: TreeCard): string | undefined {
    let room: string | undefined;
    for (const card of this.pathCardsOf(lineId)) {
      const ordinal = this.ordinalByCard.get(card);
      if (ordinal !== undefined) {
        room = this.roomByOrdinal.get(ordinal) ?? room;
      }
      if (card === at) break;
    }
    return room;
  }

  /**
   * The line's derived display label: the main line from the room the game
   * opens in, a branch from the room at its fork card and its first typed
   * command (falling back to the pending fork command until the replay
   * lands).
   */
  labelOf(id: string): string {
    const meta = this.lineMeta.get(id);
    if (meta === undefined) {
      const bootCard = this.doc.cards.find((card) => card.type !== 'opening');
      const room = bootCard !== undefined
        ? this.roomAtCard(this.doc.id, bootCard)
        : undefined;
      return mainLineLabelOf(roomSlugOf(room));
    }
    const room = this.roomAtCard(meta.parentLine, meta.forkCard);
    const firstCommand =
      (this.lineCards.get(id) ?? []).find((card) => card.type === 'turn')?.command ??
      this.pending.get(id);
    const ordinal = (meta.forkCard.branches ?? []).indexOf(meta.branch) + 1;
    return branchLineLabelOf(roomSlugOf(room), ordinal, firstCommand);
  }

  /** Lines with no landed turn yet (just forked — chip shows, run row dashes). */
  isPending(id: string): boolean {
    return this.pending.has(id) && (this.lineCards.get(id) ?? []).length === 0;
  }

  /** The bound card's position among its line's TURN cards — the stable key
   *  session ephemera (dialog outcomes) use; ordinals do not survive
   *  restore-by-replay, positions do. */
  turnIndexOf(ordinal: number): { lineId: string; index: number } | undefined {
    const card = this.cardByOrdinal.get(ordinal);
    if (card === undefined || card.type !== 'turn') return undefined;
    for (const [lineId, cards] of this.lineCards) {
      const turns = cards.filter((c) => c.type === 'turn');
      const index = turns.indexOf(card);
      if (index >= 0) return { lineId, index };
    }
    return undefined;
  }

  // ── branching (D5 — mechanically unchanged, recorded as structure) ─────

  /** Every fork point the active path descends through, in path order. */
  branchPointsOnPath(): BranchPoint[] {
    const points: BranchPoint[] = [];
    const chain = this.chainOf(this.active);
    for (let hop = 0; hop < chain.length; hop += 1) {
      const lineId = chain[hop].lineId;
      const cards = this.lineCards.get(lineId) ?? [];
      const cutCard = chain[hop + 1]?.forkCard;
      for (const card of cards) {
        const ordinal = this.ordinalByCard.get(card);
        if (ordinal !== undefined && (card.branches?.length ?? 0) > 0) {
          points.push({
            ordinal,
            lineId,
            siblings: (card.branches ?? []).map((branch) => branch.id),
          });
        }
        if (cutCard !== undefined && card === cutCard) break;
      }
    }
    return points;
  }

  /**
   * Whether a Branch gesture is offered on this card: it must be bound, on
   * the active path, not the opening (the boot look is automatic — an
   * alternate to it is meaningless), and not the path's tip (typing already
   * continues the recording there).
   */
  canBranch(ordinal: number): boolean {
    const card = this.cardByOrdinal.get(ordinal);
    if (card === undefined || card.type === 'opening') return false;
    // An END STATE card cannot fork (ADR-356 D4): the story ended on it, so
    // a branch would replay onto a stopped engine. Fork from an earlier card.
    if (card.ending !== undefined) return false;
    const path = this.pathCardsOf(this.active);
    const index = path.indexOf(card);
    return index >= 0 && index < path.length - 1;
  }

  /**
   * Forks on the card at `ordinal` with the typed alternate (D2: the fork
   * lives ON the card branched from; the alternative's own cards follow as
   * the author plays them). The new line becomes active and is pending until
   * its replayed turn lands. Returns the new line id, or null when the card
   * cannot fork ({@link canBranch}).
   */
  branch(ordinal: number, command: string): string | null {
    if (!this.canBranch(ordinal)) return null;
    const card = this.cardByOrdinal.get(ordinal)!;
    // The card's OWNING line (the chain hop whose cards array includes it).
    let owner = this.doc.id;
    for (const { lineId } of this.chainOf(this.active)) {
      if ((this.lineCards.get(lineId) ?? []).includes(card)) owner = lineId;
    }
    // A fresh, persisted segment id (ADR-355 D5) — never positional.
    const id = this.freshId();
    const branch: TreeBranch = { id, cards: [] };
    (card.branches ??= []).push(branch);
    this.lineCards.set(id, branch.cards);
    this.lineMeta.set(id, { parentLine: owner, forkCard: card, branch });
    this.bindCursor.set(id, 0);
    this.pending.set(id, command);
    this.active = id;
    return id;
  }

  /** Every line inside `id`'s subtree, `id` included. */
  private subtreeLines(id: string): Set<string> {
    const doomed = new Set<string>([id]);
    for (;;) {
      const before = doomed.size;
      for (const [lineId, meta] of this.lineMeta) {
        if (doomed.has(meta.parentLine)) doomed.add(lineId);
      }
      if (doomed.size === before) break;
    }
    return doomed;
  }

  /** Drop the session bindings of `card` and everything under it (its
   *  branches' cards recursively included). */
  private unbindSubtree(card: TreeCard): void {
    const ordinal = this.ordinalByCard.get(card);
    if (ordinal !== undefined) {
      this.cardByOrdinal.delete(ordinal);
      this.roomByOrdinal.delete(ordinal);
    }
    this.ordinalByCard.delete(card);
    for (const branch of card.branches ?? []) {
      for (const nested of branch.cards) this.unbindSubtree(nested);
    }
  }

  /**
   * Deletes a branch whole (the chip's ✕): the branch entry leaves its fork
   * card, and every nested line goes with it. Returns the surviving parent
   * line and whether the VIEWED line died (the caller replays the parent
   * live) — or null for the main line, which never deletes.
   */
  deleteBranch(id: string): { parentLine: string; wasActive: boolean } | null {
    const meta = this.lineMeta.get(id);
    if (meta === undefined) return null;
    const wasActive = this.subtreeLines(id).has(this.active);
    const parentLine = meta.parentLine;

    for (const card of meta.branch.cards) this.unbindSubtree(card);
    const siblings = (meta.forkCard.branches ?? []).filter((branch) => branch !== meta.branch);
    if (siblings.length > 0) meta.forkCard.branches = siblings;
    else delete meta.forkCard.branches;
    this.rebuildLineRegistry();

    if (wasActive) this.active = parentLine;
    return { parentLine, wasActive };
  }

  /**
   * Tail-cut (D4/Q-4, the card's ✕): discard the card at `ordinal` and
   * everything after it on its own line — descendants and their branches
   * included. Only a bound TURN card cuts (the opening and the boot look are
   * the session's fabric, not authored turns). Returns the cut line and
   * whether the viewed line survived — the caller replays the line to
   * realign the engine (the session IS a replay of the tree) — or null when
   * the card cannot cut.
   */
  tailCut(ordinal: number): { lineId: string; activeSurvived: boolean } | null {
    const card = this.cardByOrdinal.get(ordinal);
    if (card === undefined || card.type !== 'turn') return null;
    let lineId: string | undefined;
    for (const [id, cards] of this.lineCards) {
      if (cards.includes(card)) {
        lineId = id;
        break;
      }
    }
    if (lineId === undefined) return null;
    const cards = this.lineCards.get(lineId)!;
    const index = cards.indexOf(card);
    const activeBefore = this.active;

    const removed = cards.splice(index);
    for (const gone of removed) this.unbindSubtree(gone);
    this.rebuildLineRegistry();
    const activeSurvived = this.lineCards.has(activeBefore);
    this.active = activeSurvived ? activeBefore : lineId;
    return { lineId, activeSurvived };
  }

  // ── splice (D4 — the model operation; gesture chrome is design-phase) ──

  /**
   * Splice a turn IN after the card at `afterOrdinal` on its own line. The
   * new card is unbound — the whole-path replay that follows re-derives
   * every downstream card and binds it ({@link beginRebindAll}).
   */
  spliceIn(afterOrdinal: number, command: string): boolean {
    const card = this.cardByOrdinal.get(afterOrdinal);
    if (card === undefined) return false;
    for (const cards of this.lineCards.values()) {
      const index = cards.indexOf(card);
      if (index >= 0) {
        cards.splice(index + 1, 0, { type: 'turn', command });
        this.rebuildLineRegistry();
        return true;
      }
    }
    return false;
  }

  /**
   * Splice a turn OUT: remove the single card at `ordinal`, keeping what
   * follows. Its branches fork from a state that no longer exists, so they
   * go with it. Only a turn card splices out.
   */
  spliceOut(ordinal: number): boolean {
    const card = this.cardByOrdinal.get(ordinal);
    if (card === undefined || card.type !== 'turn') return false;
    for (const cards of this.lineCards.values()) {
      const index = cards.indexOf(card);
      if (index >= 0) {
        cards.splice(index, 1);
        this.unbindSubtree(card);
        this.rebuildLineRegistry();
        return true;
      }
    }
    return false;
  }

  // ── authoring (assertions live in the card — D2) ───────────────────────

  /** The card's authored assertions, if any (readonly by convention). */
  claimsOf(ordinal: number): Readonly<TreeAssertions> | undefined {
    return this.cardByOrdinal.get(ordinal)?.assertions;
  }

  /** True when the card explicitly runs-without-asserting — the `[SKIP]`
   *  demotion, visible in the JSON (`skip: true`). */
  claimsNothing(ordinal: number): boolean {
    return this.cardByOrdinal.get(ordinal)?.skip === true;
  }

  private mutable(ordinal: number): TreeAssertions | undefined {
    const card = this.cardByOrdinal.get(ordinal);
    if (card === undefined) return undefined;
    return (card.assertions ??= {});
  }

  /** Authoring a claim onto a recorded `[SKIP]` card lifts the demotion —
   *  the author is asserting again, and the JSON says so. */
  private liftSkip(ordinal: number): void {
    const card = this.cardByOrdinal.get(ordinal);
    if (card?.skip === true) delete card.skip;
  }

  /** Drop empty family arrays; drop the whole object when nothing remains —
   *  the card is then honestly bare in the JSON (and a run fails it by
   *  name; deleting your last claim is a visible choice, never silent). */
  private normalize(ordinal: number): void {
    const card = this.cardByOrdinal.get(ordinal);
    const a = card?.assertions;
    if (card === undefined || a === undefined) return;
    if (a.contains !== undefined && a.contains.length === 0) delete a.contains;
    if (a.notContains !== undefined && a.notContains.length === 0) delete a.notContains;
    if (a.states !== undefined && a.states.length === 0) delete a.states;
    if (a.events !== undefined && a.events.length === 0) delete a.events;
    if (a.channels !== undefined && a.channels.length === 0) delete a.channels;
    if (Object.keys(a).length === 0) delete card.assertions;
  }

  addContains(ordinal: number, text: string): boolean {
    this.liftSkip(ordinal);
    const a = this.mutable(ordinal);
    if (a === undefined) return false;
    (a.contains ??= []).push(text);
    return true;
  }

  addNotContains(ordinal: number, text: string): boolean {
    this.liftSkip(ordinal);
    const a = this.mutable(ordinal);
    if (a === undefined) return false;
    (a.notContains ??= []).push(text);
    return true;
  }

  /** Set (or clear) the exact literal block — the turn's whole output as
   *  lines, captured by the caller at toggle time (the document's shape). */
  setExact(ordinal: number, lines: string[] | null): boolean {
    if (lines !== null) this.liftSkip(ordinal);
    const a = this.mutable(ordinal);
    if (a === undefined) return false;
    if (lines === null) delete a.exact;
    else a.exact = [...lines];
    this.normalize(ordinal);
    return true;
  }

  addState(ordinal: number, expression: string): boolean {
    this.liftSkip(ordinal);
    const a = this.mutable(ordinal);
    if (a === undefined) return false;
    (a.states ??= []).push(expression);
    return true;
  }

  addEvent(ordinal: number, type: string): boolean {
    this.liftSkip(ordinal);
    const a = this.mutable(ordinal);
    if (a === undefined) return false;
    (a.events ??= []).push(type);
    return true;
  }

  addChannel(ordinal: number, claim: TreeChannelAssertion): boolean {
    this.liftSkip(ordinal);
    const a = this.mutable(ordinal);
    if (a === undefined) return false;
    (a.channels ??= []).push({ ...claim });
    return true;
  }

  removeContains(ordinal: number, index: number): void {
    const a = this.mutable(ordinal);
    if (a === undefined || a.contains === undefined) return;
    a.contains.splice(index, 1);
    this.normalize(ordinal);
  }

  removeNotContains(ordinal: number, index: number): void {
    const a = this.mutable(ordinal);
    if (a === undefined || a.notContains === undefined) return;
    a.notContains.splice(index, 1);
    this.normalize(ordinal);
  }

  removeState(ordinal: number, index: number): void {
    const a = this.mutable(ordinal);
    if (a === undefined || a.states === undefined) return;
    a.states.splice(index, 1);
    this.normalize(ordinal);
  }

  removeEvent(ordinal: number, index: number): void {
    const a = this.mutable(ordinal);
    if (a === undefined || a.events === undefined) return;
    a.events.splice(index, 1);
    this.normalize(ordinal);
  }

  removeChannel(ordinal: number, index: number): void {
    const a = this.mutable(ordinal);
    if (a === undefined || a.channels === undefined) return;
    a.channels.splice(index, 1);
    this.normalize(ordinal);
  }

  // ── undo (authoring gestures only; structure ops clear the stack) ──────

  /** Capture every card's authored assertions (deep copy, card-keyed). */
  captureAuthoring(): AuthoringMemento {
    const claims = new Map<TreeCard, TreeAssertions | undefined>();
    const walk = (cards: TreeCard[]): void => {
      for (const card of cards) {
        claims.set(card, cloneAssertions(card.assertions));
        for (const branch of card.branches ?? []) walk(branch.cards);
      }
    };
    walk(this.doc.cards);
    return { claims };
  }

  /** Put a captured authoring state back — the ⌘Z gesture's whole act. */
  restoreAuthoring(memento: AuthoringMemento): void {
    for (const [card, assertions] of memento.claims) {
      if (assertions === undefined) delete card.assertions;
      else card.assertions = cloneAssertions(assertions);
    }
  }
}
