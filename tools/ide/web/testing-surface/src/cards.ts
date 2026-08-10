/**
 * cards.ts — the testing play surface's DOM layer (ADR-306 Phases 3 & 5).
 *
 * Purpose: builds the three-column layout over the testing page and renders
 *   the cards column from the SessionModel — one outlined card per turn
 *   holding the client's OWN rendered elements (moved out of the prose
 *   staging pane by their `data-turn` anchors, so engine.css fidelity is
 *   kept), a distinct checkbox rail, title strips with the auto-derived
 *   name, summary cards for collapsed segments, collapse controls, and
 *   — Phase 5 — the Branch… gesture with sibling chip rows
 *   and lineage-cut visibility (design §6: the column always shows exactly
 *   one coherent lineage). All state changes go through the model; this
 *   layer only renders and forwards gestures.
 *
 * Public interface: CardsView (ensureLayout, addTurnCard, clear, render,
 *   scrollToLatest), CardsDelegate.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import type { BranchPoint, Segment, SessionModel } from './model';
import type { RunColumnState } from './run';

/** Chip labels interpolate model strings into innerHTML — escape them. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/** Gesture sink — main.ts routes these into the model and re-renders. */
export interface CardsDelegate {
  onTick(ordinal: number, checked: boolean): void;
  onCollapse(segment: Segment): void;
  onExpand(segment: Segment): void;
  /** A chip's ✕ — delete that branch (its file and descendants go too). */
  onDeleteLineage(lineage: number): void;
  onActivate(segment: Segment): void;
  /** Authoring gestures (design §5) — all routed to model mutators. */
  onAddContains(ordinal: number, text: string): void;
  onNotContains(ordinal: number, text: string): void;
  onToggleExact(ordinal: number): void;
  /** Pickers open anchored to their buttons; main.ts owns the options. */
  onStatePicker(ordinal: number, anchor: HTMLElement): void;
  onEventPicker(ordinal: number, anchor: HTMLElement): void;
  onChannelPicker(ordinal: number, anchor: HTMLElement): void;
  /** Branching (design §6): fork at this card with the typed alternate. */
  onBranch(ordinal: number, command: string): void;
  /** A sibling chip was clicked — replay that lineage live and view it. */
  onSelectLineage(lineage: number): void;
  /** The Run button (design §7): run the real tree over `tests/`. */
  onRun(): void;
  /** The run column's current state — main.ts owns the fold. */
  runColumn(): RunColumnState;
}

/** Per-turn DOM handles, keyed by ordinal. */
interface CardRow {
  row: HTMLElement;
  checkbox: HTMLInputElement;
  stripNote: HTMLElement;
  strip: HTMLElement;
  autoName: HTMLElement;
  collapseButton: HTMLButtonElement;
  exactButton: HTMLButtonElement | null;
  branchButton: HTMLButtonElement | null;
}

export class CardsView {
  private cards = new Map<number, CardRow>();
  private summaries = new Map<Segment, HTMLElement>();
  /** One chip row per fork point, keyed `parentId:at`. */
  private branchRows = new Map<string, HTMLElement>();
  private host!: HTMLElement;
  private session!: HTMLElement;

  constructor(
    private readonly model: SessionModel,
    private readonly delegate: CardsDelegate,
  ) {}

  /**
   * Takes the page over once: hides the client's window (its prose pane
   * keeps receiving turns as staging), builds cards/source/run columns, and
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
        <div class="ts-input-row"><div class="ts-gutter-cap"></div></div>
      </div>
      <div class="ts-run-col">
        <div class="ts-col-head"><span>test run</span>
          <button class="ts-run-btn" id="ts-run-btn"
                  title="Run every transcript in tests/ as a tree, at the pinned seed">Run</button>
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

  /** Contains-by-selection (design §5, ADR-301's default gesture): select
   *  prose in a card and a floating Add contains button appears. */
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
   * the opening card (ordinal 0 — prologue + banner, design §2).
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
      // opening (ordinal 0, design §2): claim it by its banner classes.
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

    const pick = document.createElement('label');
    pick.className = 'ts-pick';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    pick.appendChild(checkbox);
    checkbox.addEventListener('change', () =>
      this.delegate.onTick(ordinal, checkbox.checked));

    const column = document.createElement('div');
    column.className = 'ts-card-column';

    const stripNote = document.createElement('div');
    stripNote.className = 'ts-strip-note';
    stripNote.style.display = 'none';

    const strip = document.createElement('div');
    strip.className = 'ts-title-strip';
    strip.style.display = 'none';
    const autoName = document.createElement('div');
    autoName.className = 'ts-auto-name';
    autoName.title = 'Auto-named: start location + end location + turns';
    const collapseButton = document.createElement('button');
    collapseButton.textContent = 'Collapse';
    collapseButton.title = 'Collapse this transcript into its summary card';
    strip.append(autoName, collapseButton);

    const block = document.createElement('div');
    block.className = 'ts-block';
    const meta = document.createElement('div');
    meta.className = 'ts-meta';
    meta.textContent = ordinal === 0
      ? 'opening'
      : `turn ${ordinal}${boot ? ' · boot' : ''}${branch ? ' · branch' : ''}`;
    const proseHost = document.createElement('div');
    proseHost.className = 'ts-prose';
    for (const el of prose) proseHost.appendChild(el);
    block.append(meta, proseHost);

    // The action row: assertion gestures for THIS turn (design §5). The
    // buttons write into the source panel's transcript, never into the card.
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
      exactButton.title = 'This turn asserts its whole output — [OK] + literal block';
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

      const channelButton = document.createElement('button');
      channelButton.textContent = 'Channel…';
      channelButton.title = 'Assert on a channel this turn captured';
      channelButton.addEventListener('click', () =>
        this.delegate.onChannelPicker(ordinal, channelButton));
      actions.appendChild(channelButton);
    }

    let branchButton: HTMLButtonElement | null = null;
    if (ordinal > 0) {
      branchButton = document.createElement('button');
      branchButton.textContent = 'Branch…';
      branchButton.title =
        'Try a different command at this point — the shared prefix becomes the parent of all siblings';
      branchButton.style.display = 'none';
      branchButton.addEventListener('click', () =>
        promptText('alternate command, e.g. east',
                   command => this.delegate.onBranch(ordinal, command)));
      actions.appendChild(branchButton);
    }
    block.appendChild(actions);

    column.append(stripNote, strip, block);
    row.append(pick, column);
    this.host.appendChild(row);
    this.cards.set(ordinal, {
      row, checkbox, stripNote, strip, autoName, collapseButton,
      exactButton, branchButton,
    });
  }

  /** Dead lineage (restart fence): every card, summary, and chip row goes. */
  clear(): void {
    for (const { row } of this.cards.values()) row.remove();
    for (const summary of this.summaries.values()) summary.remove();
    for (const row of this.branchRows.values()) row.remove();
    this.cards.clear();
    this.summaries.clear();
    this.branchRows.clear();
  }

  /** The fork points the active lineage's path descends through — their
   *  chip rows stay visible even though the fork ordinal itself is cut. */
  private pointsOnActivePath(): Set<string> {
    const keys = new Set<string>();
    const chain = this.model.pathOf(this.model.activeLineage);
    for (const id of chain) {
      const info = this.model.lineageInfo(id);
      if (info?.parentId !== undefined && info.forkAt !== undefined) {
        keys.add(`${info.parentId}:${info.forkAt}`);
      }
    }
    return keys;
  }

  /** Re-derives every card's visuals from the model (mock's applySegments),
   *  including the lineage cut (design §6): a turn past a fork shows only
   *  while the branch that played it is the active lineage. */
  render(): void {
    // A deleted branch's turns leave the model (David's ruling 2026-08-09) —
    // their cards go with them, not merely hide.
    for (const [ordinal, card] of [...this.cards]) {
      const exists = ordinal === 0
        ? this.model.hasOpening
        : this.model.turns.some(t => t.ordinal === ordinal);
      if (!exists) {
        card.row.remove();
        this.cards.delete(ordinal);
      }
    }
    const activePathPoints = this.pointsOnActivePath();
    for (const [ordinal, card] of this.cards) {
      const segment = this.model.segmentOf(ordinal);
      const assigned = segment !== undefined;
      const ticked = assigned &&
        (ordinal === segment.start || ordinal === segment.end);
      const collapsed = assigned && segment.collapsed;
      const visible = this.model.isTurnVisible(ordinal);

      card.row.style.display = (collapsed || !visible) ? 'none' : '';
      card.row.classList.toggle('ts-selected', assigned && !collapsed);
      card.checkbox.checked = ticked;
      card.checkbox.classList.toggle('ts-implied', assigned && !ticked);
      card.checkbox.title = this.checkboxTitle(ordinal, segment);

      const isFirst = assigned && ordinal === segment.start && !collapsed;
      card.row.classList.toggle('ts-segment-start', isFirst);
      card.strip.style.display = isFirst ? '' : 'none';
      card.stripNote.style.display = 'none';
      if (isFirst && segment) this.renderStrip(card, segment);

      if (card.branchButton) {
        // Any point in a closed, expanded transcript with something shared
        // before it can fork — mid-segment, or at its start when a parent
        // exists (design §6).
        const forkable = assigned && segment.end !== null && !collapsed &&
          (ordinal > Math.max(segment.start, 1) ||
           this.model.parentOf(segment) !== undefined);
        card.branchButton.style.display = forkable ? '' : 'none';
      }
      card.exactButton?.classList.toggle('ts-active',
        this.model.claimsOf(ordinal).exact);
    }
    this.renderSummaries();
    this.renderBranchRows(activePathPoints);
    this.renderRunColumn();
  }

  private checkboxTitle(ordinal: number, segment: Segment | undefined): string {
    if (segment) {
      const title = this.model.titleOf(segment);
      if (ordinal === segment.start) return `Starts "${title}"`;
      if (ordinal === segment.end) return `Ends "${title}"`;
      return `In "${title}"`;
    }
    if (ordinal === 0) return 'Start a transcript at the beginning';
    return this.model.openSegment()
      ? `End the transcript at turn ${ordinal}`
      : `Start a new transcript at turn ${ordinal}`;
  }

  private renderStrip(card: CardRow, segment: Segment): void {
    const title = this.model.titleOf(segment);
    card.autoName.innerHTML = '';
    card.autoName.append(title);
    const saved = document.createElement('span');
    saved.className = 'ts-saved';
    saved.textContent = `tests/${title}.transcript`;
    card.autoName.appendChild(saved);
    card.autoName.onclick = () => this.delegate.onActivate(segment);

    card.collapseButton.style.display = segment.end !== null ? '' : 'none';
    card.collapseButton.onclick = () => this.delegate.onCollapse(segment);

    const parent = this.model.parentOf(segment);
    if (parent) {
      card.stripNote.textContent =
        `↳ continues from “${this.model.titleOf(parent)}”`;
      card.stripNote.style.display = '';
    }
  }

  /** One summary card per collapsed segment, sitting where its range was. */
  private renderSummaries(): void {
    for (const [segment, row] of this.summaries) {
      if (!this.model.segments.includes(segment)) {
        row.remove();
        this.summaries.delete(segment);
      }
    }
    for (const segment of this.model.segments) {
      let row = this.summaries.get(segment);
      if (segment.collapsed && !row) {
        row = this.buildSummaryRow(segment);
        this.summaries.set(segment, row);
      }
      if (!row) continue;
      // A summary wholly past the lineage cut is another lineage's — hidden
      // while an alternate is viewed (design §6).
      row.style.display =
        (segment.collapsed && this.model.isTurnVisible(segment.start)) ? '' : 'none';
      if (segment.collapsed) {
        const end = segment.end ?? segment.start;
        const count = Math.max(1, end - Math.max(segment.start, 1) + 1);
        row.querySelector('.ts-summary-title')!.textContent =
          this.model.titleOf(segment);
        row.querySelector('.ts-summary-span')!.textContent =
          `turns ${segment.start}–${end} · ${count} ${count === 1 ? 'turn' : 'turns'}`;
      }
    }
  }

  private buildSummaryRow(segment: Segment): HTMLElement {
    const row = document.createElement('div');
    row.className = 'ts-turn';
    row.innerHTML = `
      <div class="ts-pick"></div>
      <div class="ts-card-column">
        <div class="ts-block ts-summary" title="Click to expand">
          <div class="ts-meta">transcript</div>
          <div class="ts-summary-title"></div>
          <div class="ts-summary-span"></div>
        </div>
      </div>`;
    row.querySelector('.ts-summary')!.addEventListener('click', () =>
      this.delegate.onExpand(segment));
    const anchor = this.cards.get(segment.start)?.row ?? null;
    this.host.insertBefore(row, anchor);
    return row;
  }

  /**
   * One chip row per fork point (design §6): main line first, then each
   * sibling in creation order — "all continue from the parent". The row
   * sits where the fork is; it stays visible while the path descends
   * through it (the fork ordinal itself is cut then), and hides when the
   * point lies wholly past an earlier cut.
   */
  private renderBranchRows(activePathPoints: Set<string>): void {
    const points = this.model.branchPoints();
    const liveKeys = new Set(points.map(p => `${p.parentId}:${p.at}`));
    for (const [key, row] of this.branchRows) {
      if (!liveKeys.has(key)) {
        row.remove();
        this.branchRows.delete(key);
      }
    }
    for (const point of points) {
      const key = `${point.parentId}:${point.at}`;
      let row = this.branchRows.get(key);
      if (!row) {
        row = document.createElement('div');
        row.className = 'ts-turn ts-branch-point';
        row.innerHTML = '<div class="ts-pick"></div>' +
          '<div class="ts-card-column"><div class="ts-branch-row"></div></div>';
        const anchor = this.cards.get(point.at)?.row ?? null;
        this.host.insertBefore(row, anchor);
        this.branchRows.set(key, row);
      }
      const visible = this.model.isTurnVisible(point.at) || activePathPoints.has(key);
      row.style.display = visible ? '' : 'none';
      if (!visible) continue;
      this.renderChips(row, point);
    }
  }

  private renderChips(row: HTMLElement, point: BranchPoint): void {
    const container = row.querySelector('.ts-branch-row')!;
    container.innerHTML = '';
    const chain = this.model.pathOf(this.model.activeLineage);
    const selectedSibling = point.siblings.find(id => chain.includes(id));

    const mainSegment = this.model.segmentOf(point.at);
    const forkTurn = this.model.turns.find(t => t.ordinal === point.at);
    const mainChip = document.createElement('div');
    mainChip.className = 'ts-branch-chip' +
      (selectedSibling === undefined ? ' ts-chip-selected' : '');
    const mainTitle = mainSegment ? this.model.titleOf(mainSegment) : `turn ${point.at}`;
    const mainSpan = mainSegment
      ? `&gt; ${escapeHtml(forkTurn?.command ?? '')} · turns ${mainSegment.start}–${mainSegment.end ?? mainSegment.start}`
      : `&gt; ${escapeHtml(forkTurn?.command ?? '')}`;
    mainChip.innerHTML =
      `<div class="ts-meta">branch</div>
       <div class="ts-chip-title">${escapeHtml(mainTitle)}</div>
       <div class="ts-chip-span">${mainSpan}</div>`;
    mainChip.addEventListener('click', () =>
      this.delegate.onSelectLineage(point.parentId));
    container.appendChild(mainChip);

    for (const sibling of point.siblings) {
      const info = this.model.lineageInfo(sibling);
      const firstTurn = this.model.turns.find(t => t.lineage === sibling);
      const segment = this.model.segments.find(s => s.lineage === sibling);
      const pending = info?.pendingCommand !== undefined;
      const title = pending
        ? this.model.pendingTitleOf(sibling) ?? ''
        : segment ? this.model.titleOf(segment)
        : firstTurn?.command ?? '';
      const command = info?.pendingCommand ?? firstTurn?.command ?? '';
      const count = segment
        ? this.model.turns.filter(t => t.lineage === sibling &&
            t.ordinal >= segment.start && t.ordinal <= (segment.end ?? segment.start)).length
        : 0;
      const span = pending
        ? `&gt; ${escapeHtml(command)} · replay pending`
        : `&gt; ${escapeHtml(command)} · ${count} ${count === 1 ? 'turn' : 'turns'}`;
      const chip = document.createElement('div');
      chip.className = 'ts-branch-chip' +
        (selectedSibling === sibling ? ' ts-chip-selected' : '');
      chip.innerHTML =
        `<div class="ts-meta">branch</div>
         <div class="ts-chip-title">${escapeHtml(title)}</div>
         <div class="ts-chip-span">${span}</div>`;
      chip.addEventListener('click', () => this.delegate.onSelectLineage(sibling));
      // Delete the branch (David's ruling, 2026-08-09). Two deliberate acts,
      // like Trash was: arm, then confirm on the same control.
      const remove = document.createElement('button');
      remove.className = 'ts-chip-delete';
      remove.textContent = '✕';
      remove.title = 'Delete this branch — its transcript (and any branches forked from it) go too';
      remove.addEventListener('click', event => {
        event.stopPropagation();
        if (remove.classList.contains('ts-armed')) {
          this.delegate.onDeleteLineage(sibling);
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

    const prefix = mainSegment ? this.model.parentOf(mainSegment) : undefined;
    row.title = prefix
      ? `all continue from "${this.model.titleOf(prefix)}"`
      : 'all continue from the shared prefix';
  }

  /** The run column (design §7): one row per transcript — branches
   *  included — with PASS/FAIL, the first failure on one line, and a tally.
   *  An open range isn't a file and doesn't run; a pending branch (no
   *  landed turn yet) shows a dash. */
  private renderRunColumn(): void {
    const results = document.getElementById('ts-run-results');
    if (!results) return;
    const run = this.delegate.runColumn();

    const button = document.getElementById('ts-run-btn') as HTMLButtonElement | null;
    if (button) {
      button.disabled = run.inFlight;
      button.textContent = run.inFlight ? 'Running…' : 'Run';
    }

    const closed = this.model.segments.filter(s => s.end !== null);
    const pending = this.model.lineages.filter(
      info => this.model.pendingTitleOf(info.id) !== undefined);
    results.innerHTML = '';
    if (closed.length === 0 && pending.length === 0 && run.results.size === 0) {
      results.innerHTML = '<span class="ts-pending-note">no transcripts yet</span>';
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

    // Every transcript the run touched, in run order — the tree on disk is
    // the suite (files from earlier sessions included), not just this
    // session's segments. Map insertion order IS the run's execution order.
    for (const [stem, result] of run.results) {
      switch (result.status) {
        case 'passed':
          row('PASS', 'ts-pass', stem, `${result.passed} turn${result.passed === 1 ? '' : 's'}`);
          break;
        case 'skipped':
          row('—', '', stem, 'no commands — ran as a skip');
          break;
        case 'unreached':
          row('—', '', stem, result.firstFailure ?? 'blocked by an ancestor');
          break;
        default: {
          const more = result.moreFailures > 0 ? ` +${result.moreFailures} more` : '';
          row('FAIL', 'ts-fail', stem, `${result.firstFailure ?? 'failed'}${more}`);
        }
      }
    }
    // This session's closed transcripts the run has not reached (or before
    // any run): a dash — never a guess.
    for (const segment of [...closed].sort((a, b) => a.start - b.start)) {
      const title = this.model.titleOf(segment);
      if (run.results.has(title)) continue;
      row('—', '', title, run.inFlight ? 'running…' : 'not run yet');
    }
    // A registered branch whose replayed turn hasn't landed is not a file
    // yet — its row is a dash by rule (design §7).
    for (const info of pending) {
      row('—', '', this.model.pendingTitleOf(info.id) ?? 'pending branch', 'pending branch');
    }

    if (run.tally) {
      const tally = document.createElement('div');
      tally.className = 'ts-run-tally';
      const parts = [`${run.tally.passed} passing`, `${run.tally.failed} failures`];
      if (run.tally.errors > 0) parts.push(`${run.tally.errors} errors`);
      if (run.tally.unreached > 0) parts.push(`${run.tally.unreached} unreached`);
      tally.textContent = parts.join(', ');
      results.appendChild(tally);
    }
  }

  scrollToLatest(): void {
    this.session.scrollTop = this.session.scrollHeight;
  }
}
