/**
 * cards.ts — the testing play surface's DOM layer (ADR-307: the tree is the
 * model; the cards column is its human view).
 *
 * Purpose: builds the two-column layout over the testing page and renders
 *   the cards column from the TreeSessionModel — one outlined card per bound
 *   turn holding the client's OWN rendered elements (moved out of the prose
 *   staging pane by their `data-turn` anchors, so engine.css fidelity is
 *   kept), the card's assertion lines, the authoring action row, the Branch
 *   gesture with sibling chip rows, and the card's tail-cut ✕ (D4/Q-4,
 *   armed-then-confirmed like the chip ✕ — one destruction idiom). The v1
 *   checkbox rail, title strips, summary cards, and collapse controls are
 *   gone with the range model (D3). All state changes go through the model;
 *   this layer only renders and forwards gestures.
 *
 * Public interface: CardsView (ensureLayout, addTurnCard, clear, render,
 *   scrollToLatest, setNotice), CardsDelegate.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import type { DeleteRef, SourceLine } from './compose';
import type { TreeSessionModel } from './model';
import type { RunColumnState, TranscriptRunResult } from './run';

/** Chip labels interpolate model strings into innerHTML — escape them. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/** Gesture sink — main.ts routes these into the model and re-renders. */
export interface CardsDelegate {
  /** The card's ✕ — tail-cut: this turn and everything after it (D4/Q-4). */
  onTailCut(ordinal: number): void;
  /** A chip's ✕ — delete that branch (and every branch forked from it). */
  onDeleteBranch(lineId: number): void;
  /** Authoring gestures — all routed to model mutators. */
  onAddContains(ordinal: number, text: string): void;
  onNotContains(ordinal: number, text: string): void;
  onToggleExact(ordinal: number): void;
  /** Pickers open anchored to their buttons; main.ts owns the options. */
  onStatePicker(ordinal: number, anchor: HTMLElement): void;
  onEventPicker(ordinal: number, anchor: HTMLElement): void;
  onChannelPicker(ordinal: number, anchor: HTMLElement): void;
  /** Branching (D5): fork ON this card with the typed alternate. */
  onBranch(ordinal: number, command: string): void;
  /** A sibling chip was clicked — replay that line live and view it. */
  onSelectLine(lineId: number): void;
  /** The Run button: run the story's tree document at the pinned seed. */
  onRun(): void;
  /** The run column's current state — main.ts owns the fold. */
  runColumn(): RunColumnState;
  /** The card's assertion lines (authored claims or live defaults). */
  assertionLines(ordinal: number): SourceLine[];
  /** A line's ✕ — delete that assertion through its DeleteRef. */
  onRemoveAssertion(del: DeleteRef): void;
  /** The region a room belongs to (Story IR), or undefined — grouping
   *  (David 2026-08-10: derived, never persisted). */
  regionOf(room: string | undefined): string | undefined;
  /** Collapsed state for a region-group key (view-state ephemera, D7). */
  isRegionCollapsed(key: string): boolean;
  /** A region header was clicked — toggle its collapse. */
  onToggleRegion(key: string): void;
}

/** Per-turn DOM handles, keyed by ordinal. */
interface CardRow {
  row: HTMLElement;
  asserts: HTMLElement;
  exactButton: HTMLButtonElement | null;
  branchButton: HTMLButtonElement | null;
}

/** One contiguous run of same-region cards on the active path. `region`
 *  undefined = an ungrouped run (region-less rooms) — no header. */
export interface RegionGroup {
  /** Collapse-state key (`Grounds#0`) — absent for ungrouped runs. */
  key?: string;
  region?: string;
  ordinals: number[];
}

/**
 * Cut the path's ordinals into contiguous region runs (David 2026-08-10:
 * grouping is DERIVED from each turn's room via the Story IR's regions,
 * chronological — re-entering a region starts a NEW group; nothing
 * persists in the document). A card without a room (the opening) inherits
 * its neighbors' region: the previous card's, or for leading cards the
 * first known one. A room in no region breaks the run (ungrouped).
 *
 * @param ordinals the active path's ordinals, in play order.
 * @param roomOf the session's room for an ordinal (derived-label data).
 * @param regionOf the Story IR's region for a room.
 * @returns the runs in order; empty input → empty.
 */
export function groupByRegion(
  ordinals: number[],
  roomOf: (ordinal: number) => string | undefined,
  regionOf: (room: string | undefined) => string | undefined,
): RegionGroup[] {
  const HOLE = Symbol('no room');
  const raw: (string | undefined | typeof HOLE)[] = ordinals.map((ordinal) => {
    const room = roomOf(ordinal);
    return room === undefined ? HOLE : regionOf(room);
  });
  // Fill holes from the previous card's region; leading holes take the
  // first known value (an all-hole path carries undefined — one flat run).
  let carry: string | undefined = raw.find(
    (entry): entry is string | undefined => entry !== HOLE,
  );
  const assigned: (string | undefined)[] = raw.map((entry) => {
    if (entry !== HOLE) carry = entry;
    return carry;
  });

  const groups: RegionGroup[] = [];
  for (let index = 0; index < ordinals.length; index += 1) {
    const region = assigned[index];
    const last = groups.at(-1);
    if (last !== undefined && last.region === region) {
      last.ordinals.push(ordinals[index]);
    } else {
      groups.push({
        ...(region !== undefined ? { region, key: `${region}#${groups.length}` } : {}),
        ordinals: [ordinals[index]],
      });
    }
  }
  return groups;
}

export class CardsView {
  private cards = new Map<number, CardRow>();
  /** One chip row per fork-point card, keyed by the card's bound ordinal. */
  private branchRows = new Map<number, HTMLElement>();
  /** One header row per region group on the path, keyed by group key. */
  private regionRows = new Map<string, HTMLElement>();
  private host!: HTMLElement;
  private session!: HTMLElement;
  private notice: HTMLElement | null = null;

  constructor(
    private readonly model: TreeSessionModel,
    private readonly delegate: CardsDelegate,
  ) {}

  /**
   * Takes the page over once: hides the client's window (its prose pane
   * keeps receiving turns as staging), builds the cards and run columns, and
   * reparents the client's input bar under the cards column so play
   * continues to work untouched.
   */
  ensureLayout(): void {
    if (document.getElementById('ts-root')) return;
    document.body.classList.add('ts-active');

    const root = document.createElement('div');
    root.id = 'ts-root';
    root.innerHTML = `
      <div class="ts-left">
        <div class="ts-session"><div id="ts-cards"></div></div>
        <div class="ts-input-row"></div>
      </div>
      <div class="ts-run-col">
        <div class="ts-col-head"><span>test run</span>
          <button class="ts-run-btn" id="ts-run-btn"
                  title="Run the story's test tree at the pinned seed">Run</button>
        </div>
        <div id="ts-run-results"><span class="ts-pending-note">not run yet</span></div>
      </div>`;
    document.body.appendChild(root);
    document.getElementById('ts-run-btn')!
      .addEventListener('click', () => this.delegate.onRun());

    const inputBar = document.getElementById('input-area');
    if (inputBar) root.querySelector('.ts-input-row')!.appendChild(inputBar);

    this.host = document.getElementById('ts-cards')!;
    this.session = root.querySelector('.ts-session')!;
    this.installSelectionGesture();
    this.installFocusGuard();
  }

  /** A one-line notice above the cards (the refused-document message, AC-4).
   *  Pass undefined to clear. */
  setNotice(text: string | undefined): void {
    if (text === undefined) {
      this.notice?.remove();
      this.notice = null;
      return;
    }
    if (!this.notice) {
      this.notice = document.createElement('div');
      this.notice.className = 'ts-notice';
      this.host.before(this.notice);
    }
    this.notice.textContent = text;
  }

  /**
   * The client keeps a document-level click handler that refocuses its
   * command input on every click — which would yank focus out of the
   * surface's inline inputs (the Branch…/Not contains… prompts, the picker
   * filter) the instant they spawn or are clicked. The guard runs after the
   * whole click dispatch (capture + setTimeout) and gives focus back to the
   * surface field the click was for; a click anywhere else retires any open
   * inline prompt.
   */
  private installFocusGuard(): void {
    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target : null;
      const container = target?.closest('.ts-actions, .ts-picker') ?? null;
      if (container) {
        const field = container.querySelector('input');
        if (field) setTimeout(() => field.focus(), 0);
      } else {
        this.retirePrompt();
      }
    }, true);
  }

  /** The one open inline action-row prompt, if any. */
  private activePrompt: HTMLInputElement | null = null;

  private retirePrompt(): void {
    this.activePrompt?.remove();
    this.activePrompt = null;
  }

  /** Contains-by-selection (ADR-301's default gesture): select prose in a
   *  card and a floating Add contains button appears. */
  private installSelectionGesture(): void {
    const button = document.createElement('button');
    button.id = 'ts-add-contains';
    button.textContent = 'Add contains';
    document.body.appendChild(button);
    let pending: { ordinal: number; text: string } | null = null;

    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      if (!text || !selection || selection.rangeCount === 0) {
        button.style.display = 'none';
        pending = null;
        return;
      }
      const node = selection.anchorNode instanceof Element
        ? selection.anchorNode
        : selection.anchorNode?.parentElement;
      const prose = node?.closest?.('.ts-prose');
      const row = prose?.closest?.('[data-ts-ordinal]');
      const ordinal = row ? Number(row.getAttribute('data-ts-ordinal')) : NaN;
      if (!Number.isFinite(ordinal)) {
        button.style.display = 'none';
        pending = null;
        return;
      }
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      button.style.left = `${Math.max(8, rect.left)}px`;
      button.style.top = `${rect.bottom + 6}px`;
      button.style.display = 'block';
      pending = { ordinal, text };
    });

    button.addEventListener('mousedown', event => {
      event.preventDefault(); // keep the selection alive through the click
      if (!pending) return;
      this.delegate.onAddContains(pending.ordinal, pending.text);
      window.getSelection()?.removeAllRanges();
      button.style.display = 'none';
      pending = null;
    });
  }

  /** The prose staging pane the client renders into. */
  private stagingPane(): HTMLElement | null {
    return document.getElementById('text-content');
  }

  /**
   * Builds the card for a delivered turn by MOVING its `data-turn`-stamped
   * elements out of the staging pane (the 6f anchor contract — the client
   * stamps before it posts, so the elements are there by delivery time).
   * The session's first turn also drains everything staged before it into
   * the opening card (ordinal 0 — prologue + banner).
   */
  addTurnCard(ordinal: number, boot: boolean, branch = false): void {
    const staging = this.stagingPane();
    if (!staging) return;

    /** The engine's own banner decoration (ADR-174's published classes). */
    const isBanner = (el: Element): boolean =>
      [...el.classList].some(name => name.startsWith('sharpee-banner-'));

    let stamped = [...staging.children]
      .filter(el => el.getAttribute('data-turn') === String(ordinal));

    if (!this.cards.has(0) && this.model.hasOpening) {
      const openingElements: Element[] = [];
      for (const child of [...staging.children]) {
        if (child.hasAttribute('data-turn')) break;
        openingElements.push(child);
      }
      // The real client's `game.started` prose — banner + prologue — flushes
      // INSIDE the boot look's turn bracket, so it arrives stamped with the
      // boot ordinal rather than as an unstamped head. It is still the
      // opening (ordinal 0): claim it by its banner classes.
      if (boot) {
        openingElements.push(...stamped.filter(isBanner));
        stamped = stamped.filter(el => !isBanner(el));
      }
      this.buildRow(0, false, false, openingElements);
    }

    this.buildRow(ordinal, boot, branch, stamped);
  }

  private buildRow(ordinal: number, boot: boolean, branch: boolean, prose: Element[]): void {
    const row = document.createElement('div');
    row.className = 'ts-turn';
    row.setAttribute('data-ts-ordinal', String(ordinal));

    const column = document.createElement('div');
    column.className = 'ts-card-column';

    const block = document.createElement('div');
    block.className = 'ts-block';
    const meta = document.createElement('div');
    meta.className = 'ts-meta';
    meta.textContent = ordinal === 0
      ? 'opening'
      : `turn ${ordinal}${boot ? ' · boot' : ''}${branch ? ' · branch' : ''}`;

    // Tail-cut (D4/Q-4): the card's hover ✕, armed-then-confirmed — the
    // same two-act destruction idiom as the chip's ✕. Turn cards only: the
    // opening and the boot look are the session's fabric.
    if (this.model.cardAt(ordinal)?.type === 'turn') {
      const cut = document.createElement('button');
      cut.className = 'ts-card-delete';
      cut.textContent = '✕';
      cut.title = 'Delete this turn and everything after it — branches too';
      cut.addEventListener('click', event => {
        event.stopPropagation();
        if (cut.classList.contains('ts-armed')) {
          this.delegate.onTailCut(ordinal);
        } else {
          cut.classList.add('ts-armed');
          cut.textContent = 'delete?';
          setTimeout(() => {
            cut.classList.remove('ts-armed');
            cut.textContent = '✕';
          }, 2500);
        }
      });
      meta.appendChild(cut);
    }

    const proseHost = document.createElement('div');
    proseHost.className = 'ts-prose';
    for (const el of prose) proseHost.appendChild(el);
    // The card's assertions: under the prose, above the action row.
    // Filled by render() — claims change on every gesture.
    const asserts = document.createElement('div');
    asserts.className = 'ts-asserts';
    asserts.style.display = 'none';
    block.append(meta, proseHost, asserts);

    // The action row: assertion gestures for THIS turn. The buttons write
    // into the card's assertion list in the document.
    const actions = document.createElement('div');
    actions.className = 'ts-actions';

    /** Spawns an inline input in the row; Enter commits, Esc cancels, a
     *  click outside the row retires it (never on blur — the client's
     *  refocus handler blurs surface fields on every click). */
    const promptText = (placeholder: string, commit: (text: string) => void): void => {
      this.retirePrompt();
      const input = document.createElement('input');
      input.placeholder = placeholder;
      actions.appendChild(input);
      this.activePrompt = input;
      input.focus();
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && input.value.trim()) {
          commit(input.value.trim());
          this.retirePrompt();
        } else if (event.key === 'Escape') {
          this.retirePrompt();
        }
      });
    };

    const notButton = document.createElement('button');
    notButton.textContent = 'Not contains…';
    notButton.title = 'Text that must NOT appear in this turn';
    notButton.addEventListener('click', () =>
      promptText('text that must NOT appear…',
                 text => this.delegate.onNotContains(ordinal, text)));
    actions.appendChild(notButton);

    let exactButton: HTMLButtonElement | null = null;
    if (ordinal > 0) {
      exactButton = document.createElement('button');
      exactButton.textContent = 'Exact';
      exactButton.title = 'This turn asserts its whole output — the literal block';
      exactButton.addEventListener('click', () => this.delegate.onToggleExact(ordinal));
      actions.appendChild(exactButton);

      const stateButton = document.createElement('button');
      stateButton.textContent = 'State…';
      stateButton.title = 'Assert something the world holds after this turn';
      stateButton.addEventListener('click', () =>
        this.delegate.onStatePicker(ordinal, stateButton));
      actions.appendChild(stateButton);

      const eventButton = document.createElement('button');
      eventButton.textContent = 'Event…';
      eventButton.title = 'Assert an event this turn emitted';
      eventButton.addEventListener('click', () =>
        this.delegate.onEventPicker(ordinal, eventButton));
      actions.appendChild(eventButton);
    }

    // The Channel picker serves the OPENING too (David 2026-08-10): its
    // claims ARE channel claims (prologue, title, description, …), read
    // from the boot captures.
    const channelButton = document.createElement('button');
    channelButton.textContent = 'Channel…';
    channelButton.title = ordinal === 0
      ? 'Assert on a channel the boot captured (prologue, banner, …)'
      : 'Assert on a channel this turn captured';
    channelButton.addEventListener('click', () =>
      this.delegate.onChannelPicker(ordinal, channelButton));
    actions.appendChild(channelButton);

    let branchButton: HTMLButtonElement | null = null;
    if (ordinal > 0) {
      branchButton = document.createElement('button');
      branchButton.textContent = 'Branch…';
      branchButton.title =
        'Try a different command from this point — what follows becomes a sibling branch';
      branchButton.style.display = 'none';
      branchButton.addEventListener('click', () =>
        promptText('alternate command, e.g. east',
                   command => this.delegate.onBranch(ordinal, command)));
      actions.appendChild(branchButton);
    }
    block.appendChild(actions);

    column.append(block);
    row.append(column);
    this.host.appendChild(row);
    this.cards.set(ordinal, { row, asserts, exactButton, branchButton });
  }

  /** Re-fills one card's assertion list from the delegate's composed lines.
   *  Literal block lines (Exact's whole-turn text) render dimmed and are
   *  never deletable line-by-line — the exact tag deletes the block whole. */
  private renderAssertions(card: CardRow, ordinal: number): void {
    const lines = this.delegate.assertionLines(ordinal);
    card.asserts.innerHTML = '';
    card.asserts.style.display = lines.length === 0 ? 'none' : '';
    for (const line of lines) {
      const row = document.createElement('div');
      row.className = `ts-assert-line ts-assert-${line.kind}`;
      const text = document.createElement('span');
      text.className = 'ts-assert-text';
      text.textContent = line.text;
      row.appendChild(text);
      if (line.del) {
        const del = line.del;
        const remove = document.createElement('button');
        remove.className = 'ts-assert-delete';
        remove.textContent = '✕';
        remove.title = 'Delete this assertion';
        remove.addEventListener('click', () => this.delegate.onRemoveAssertion(del));
        row.appendChild(remove);
      }
      card.asserts.appendChild(row);
    }
  }

  /** Dead session (restart replay): every card, chip, and header row goes. */
  clear(): void {
    for (const { row } of this.cards.values()) row.remove();
    for (const row of this.branchRows.values()) row.remove();
    for (const row of this.regionRows.values()) row.remove();
    this.cards.clear();
    this.branchRows.clear();
    this.regionRows.clear();
  }

  /** The header row for one region group: collapse triangle + region name
   *  (just the name — David 2026-08-10). Click toggles collapse. */
  private regionHeader(key: string, region: string, collapsed: boolean): HTMLElement {
    let header = this.regionRows.get(key);
    if (!header) {
      header = document.createElement('div');
      header.className = 'ts-region-header';
      header.addEventListener('click', () => this.delegate.onToggleRegion(key));
      this.regionRows.set(key, header);
    }
    header.classList.toggle('ts-region-collapsed', collapsed);
    header.textContent = `${collapsed ? '▸' : '▾'} ${region}`;
    return header;
  }

  /**
   * Re-derives every card's visuals from the model: rows for ordinals that
   * left the model go; the active path orders and shows the rest (a card
   * past a fork shows only while the branch that played it is viewed); chip
   * rows render per fork point on the path; the run column folds.
   */
  render(): void {
    for (const [ordinal, card] of [...this.cards]) {
      if (this.model.cardAt(ordinal) === undefined) {
        card.row.remove();
        this.cards.delete(ordinal);
      }
    }

    // Path order IS the display order: reanchor rows (and each fork card's
    // chip row after it) so rebuilt or spliced cards land where the path
    // says, not where delivery happened to append them. Cards group into
    // region runs (David 2026-08-10) — a collapsed group hides its cards
    // but keeps its header and its fork points' chip rows visible; the LAST
    // group (the play point) never collapses.
    const pathOrdinals = this.model.visibleOrdinals();
    const points = this.model.branchPointsOnPath();
    const groups = groupByRegion(
      pathOrdinals,
      (ordinal) => this.model.roomOf(ordinal),
      (room) => this.delegate.regionOf(room),
    );
    const liveKeys = new Set(groups.map((group) => group.key).filter(Boolean) as string[]);
    for (const [key, header] of this.regionRows) {
      if (!liveKeys.has(key)) {
        header.remove();
        this.regionRows.delete(key);
      }
    }
    const collapsedOrdinals = new Set<number>();
    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[index];
      const collapsed =
        group.key !== undefined &&
        index < groups.length - 1 &&
        this.delegate.isRegionCollapsed(group.key);
      if (group.key !== undefined && group.region !== undefined) {
        this.host.appendChild(this.regionHeader(group.key, group.region, collapsed));
      }
      for (const ordinal of group.ordinals) {
        if (collapsed) collapsedOrdinals.add(ordinal);
        const card = this.cards.get(ordinal);
        if (!card) continue;
        this.host.appendChild(card.row);
        const chipRow = this.branchRows.get(ordinal);
        if (chipRow && points.some(p => p.ordinal === ordinal)) {
          this.host.appendChild(chipRow);
        }
      }
    }

    const visible = new Set(pathOrdinals);
    for (const [ordinal, card] of this.cards) {
      card.row.style.display =
        visible.has(ordinal) && !collapsedOrdinals.has(ordinal) ? '' : 'none';
      if (card.branchButton) {
        card.branchButton.style.display = this.model.canBranch(ordinal) ? '' : 'none';
      }
      card.exactButton?.classList.toggle(
        'ts-active',
        this.model.claimsOf(ordinal)?.exact !== undefined,
      );
      this.renderAssertions(card, ordinal);
    }

    this.renderBranchRows(points);
    this.renderRunColumn();
  }

  /**
   * One chip row per fork point on the active path (D5): the fork card's own
   * continuation first (the main chip), then each sibling branch in creation
   * order — "all continue from this card".
   */
  private renderBranchRows(points: { ordinal: number; lineId: number; siblings: number[] }[]): void {
    const liveOrdinals = new Set(points.map(p => p.ordinal));
    for (const [ordinal, row] of this.branchRows) {
      if (!liveOrdinals.has(ordinal)) {
        row.remove();
        this.branchRows.delete(ordinal);
      }
    }
    for (const point of points) {
      let row = this.branchRows.get(point.ordinal);
      if (!row) {
        row = document.createElement('div');
        row.className = 'ts-turn ts-branch-point';
        row.innerHTML =
          '<div class="ts-card-column"><div class="ts-branch-row"></div></div>';
        const anchor = this.cards.get(point.ordinal)?.row.nextSibling ?? null;
        this.host.insertBefore(row, anchor);
        this.branchRows.set(point.ordinal, row);
      }
      this.renderChips(row, point);
    }
  }

  /** The line ids on the active path, root line first. */
  private activeChain(): number[] {
    const chain: number[] = [];
    let cursor: number | undefined = this.model.activeLine;
    while (cursor !== undefined) {
      chain.unshift(cursor);
      cursor = this.model.lineParentOf(cursor);
    }
    return chain;
  }

  private renderChips(
    row: HTMLElement,
    point: { ordinal: number; lineId: number; siblings: number[] },
  ): void {
    const container = row.querySelector('.ts-branch-row')!;
    container.innerHTML = '';
    const chain = this.activeChain();
    const selectedSibling = point.siblings.find(id => chain.includes(id));

    // No turn counts on chips: turns have no meaning unless the author
    // gives them meaning (David 2026-08-10) — the fork command is the
    // navigation cue, the count was noise.
    const forkCommand = this.model.cardAt(point.ordinal)?.command ?? '';
    const mainChip = document.createElement('div');
    mainChip.className = 'ts-branch-chip' +
      (selectedSibling === undefined ? ' ts-chip-selected' : '');
    mainChip.innerHTML =
      `<div class="ts-meta">branch</div>
       <div class="ts-chip-title">${escapeHtml(this.model.labelOf(point.lineId))}</div>
       <div class="ts-chip-span">&gt; ${escapeHtml(forkCommand)}</div>`;
    mainChip.addEventListener('click', () =>
      this.delegate.onSelectLine(point.lineId));
    container.appendChild(mainChip);

    for (const sibling of point.siblings) {
      const pending = this.model.isPending(sibling);
      const firstCommand = this.model.ownCommandsOf(sibling)[0]
        ?? this.model.labelOf(sibling).split(' · ').at(-1) ?? '';
      const span = pending
        ? `&gt; ${escapeHtml(firstCommand)} · replay pending`
        : `&gt; ${escapeHtml(firstCommand)}`;
      const chip = document.createElement('div');
      chip.className = 'ts-branch-chip' +
        (selectedSibling === sibling ? ' ts-chip-selected' : '');
      chip.innerHTML =
        `<div class="ts-meta">branch</div>
         <div class="ts-chip-title">${escapeHtml(this.model.labelOf(sibling))}</div>
         <div class="ts-chip-span">${span}</div>`;
      chip.addEventListener('click', () => this.delegate.onSelectLine(sibling));
      // Delete the branch: two deliberate acts — arm, then confirm.
      const remove = document.createElement('button');
      remove.className = 'ts-chip-delete';
      remove.textContent = '✕';
      remove.title = 'Delete this branch — its turns (and any branches forked from it) go too';
      remove.addEventListener('click', event => {
        event.stopPropagation();
        if (remove.classList.contains('ts-armed')) {
          this.delegate.onDeleteBranch(sibling);
        } else {
          remove.classList.add('ts-armed');
          remove.textContent = 'delete?';
          setTimeout(() => {
            remove.classList.remove('ts-armed');
            remove.textContent = '✕';
          }, 2500);
        }
      });
      chip.appendChild(remove);
      container.appendChild(chip);
    }

    row.title = 'all continue from this card';
  }

  /** The run column: one header per line of the tree — derived labels are
   *  the identities on the wire (D2/Q-8) — then EVERY executed command with
   *  every assertion's verdict (David 2026-08-10: the run shows every card
   *  and its assertions), and a line tally. A pending branch shows a dash. */
  private renderRunColumn(): void {
    const results = document.getElementById('ts-run-results');
    if (!results) return;
    const run = this.delegate.runColumn();

    const button = document.getElementById('ts-run-btn') as HTMLButtonElement | null;
    if (button) {
      button.disabled = run.inFlight;
      button.textContent = run.inFlight ? 'Running…' : 'Run';
    }

    const lineIds = this.model.lineIds().filter(id =>
      id === 0 ? this.model.hasOpening : true);
    results.innerHTML = '';
    if (!this.model.hasOpening && run.results.size === 0) {
      results.innerHTML = '<span class="ts-pending-note">no tests yet</span>';
      return;
    }

    if (run.note) {
      const note = document.createElement('div');
      note.className = 'ts-run-note';
      note.textContent = run.note;
      results.appendChild(note);
    }

    const row = (badgeText: string, badgeClass: string, title: string, why: string): void => {
      const line = document.createElement('div');
      line.className = 'ts-run-row';
      const badge = document.createElement('span');
      badge.className = `ts-badge${badgeClass ? ` ${badgeClass}` : ''}`;
      badge.textContent = badgeText;
      const name = document.createElement('div');
      name.className = 'ts-name';
      name.textContent = title;
      const why_ = document.createElement('div');
      why_.className = 'ts-why';
      why_.textContent = why;
      line.append(badge, name, why_);
      results.appendChild(line);
    };

    /** One command's detail block: the command, then each assertion's verdict. */
    const detail = (result: TranscriptRunResult): void => {
      for (const command of result.commands) {
        const commandRow = document.createElement('div');
        commandRow.className = 'ts-run-cmd';
        commandRow.textContent = command.input === '(opening)' ? '(opening)' : `> ${command.input}`;
        results.appendChild(commandRow);
        if (command.skipped) {
          const skipRow = document.createElement('div');
          skipRow.className = 'ts-run-assert';
          skipRow.textContent = '— skipped';
          results.appendChild(skipRow);
          continue;
        }
        for (const assertion of command.assertions) {
          const assertRow = document.createElement('div');
          assertRow.className = `ts-run-assert ${assertion.passed ? 'ts-pass' : 'ts-fail'}`;
          assertRow.textContent = `${assertion.passed ? '✓' : '✗'} ${assertion.description}`;
          results.appendChild(assertRow);
          if (!assertion.passed && assertion.message !== undefined) {
            const why = document.createElement('div');
            why.className = 'ts-run-assert-why';
            why.textContent = assertion.message;
            results.appendChild(why);
          }
        }
        // A command that failed without assertion detail (a runtime throw,
        // or a producer predating the field) still says why.
        if (!command.passed && command.assertions.length === 0 && command.failure !== undefined) {
          const why = document.createElement('div');
          why.className = 'ts-run-assert ts-fail';
          why.textContent = `✗ ${command.failure}`;
          results.appendChild(why);
        }
      }
    };

    // Every line the run touched, in run order — labels are the identities;
    // under each header, the line's cards and their assertions (the detail).
    for (const [label, result] of run.results) {
      switch (result.status) {
        case 'passed':
          // No turn count: turns have no meaning unless the author gives
          // them meaning (David 2026-08-10). PASS is the information.
          row('PASS', 'ts-pass', label, '');
          detail(result);
          break;
        case 'skipped':
          row('—', '', label, 'no commands — ran as a skip');
          break;
        case 'unreached':
          row('—', '', label, result.firstFailure ?? 'blocked by an ancestor');
          break;
        default: {
          const more = result.moreFailures > 0 ? ` +${result.moreFailures} more` : '';
          row('FAIL', 'ts-fail', label, `${result.firstFailure ?? 'failed'}${more}`);
          detail(result);
        }
      }
    }
    // This session's lines the run has not reached (or before any run):
    // a dash — never a guess.
    for (const id of lineIds) {
      const label = this.model.labelOf(id);
      if (run.results.has(label)) continue;
      const why = this.model.isPending(id)
        ? 'pending branch'
        : run.inFlight ? 'running…' : 'not run yet';
      row('—', '', label, why);
    }

    if (run.tally) {
      const tally = document.createElement('div');
      tally.className = 'ts-run-tally';
      // Every assertion counts (David 2026-08-10): cards and assertions,
      // passing always shown, failing only when it exists.
      const t = run.tally;
      const unit = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;
      const parts = [
        `${unit(t.cardsPassed, 'card')} passing`,
        `${unit(t.assertionsPassed, 'assertion')} passing`,
      ];
      if (t.cardsFailed > 0) parts.push(`${unit(t.cardsFailed, 'card')} failing`);
      if (t.assertionsFailed > 0) parts.push(`${unit(t.assertionsFailed, 'assertion')} failing`);
      if (t.errors > 0) parts.push(`${unit(t.errors, 'error')}`);
      if (t.unreached > 0) parts.push(`${t.unreached} unreached`);
      tally.textContent = parts.join(', ');
      results.appendChild(tally);
    }
  }

  scrollToLatest(): void {
    this.session.scrollTop = this.session.scrollHeight;
  }
}
