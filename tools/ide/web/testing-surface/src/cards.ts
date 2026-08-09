/**
 * cards.ts — the testing play surface's DOM layer (ADR-306 Phase 3).
 *
 * Purpose: builds the three-column layout over the testing page and renders
 *   the cards column from the SessionModel — one outlined card per turn
 *   holding the client's OWN rendered elements (moved out of the prose
 *   staging pane by their `data-turn` anchors, so engine.css fidelity is
 *   kept), a distinct checkbox rail, title strips with the auto-derived
 *   name, summary cards for collapsed segments, and split/merge/collapse
 *   controls. All state changes go through the model; this layer only
 *   renders and forwards gestures.
 *
 * Public interface: CardsView (ensureLayout, addTurnCard, clear, render,
 *   scrollToLatest), CardsDelegate.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import type { Segment, SessionModel } from './model';

/** Gesture sink — main.ts routes these into the model and re-renders. */
export interface CardsDelegate {
  onTick(ordinal: number, checked: boolean): void;
  onCollapse(segment: Segment): void;
  onExpand(segment: Segment): void;
  onMergeUp(segment: Segment): void;
  onSplitAt(ordinal: number): void;
  onActivate(segment: Segment): void;
  /** Authoring gestures (design §5) — all routed to model mutators. */
  onAddContains(ordinal: number, text: string): void;
  onNotContains(ordinal: number, text: string): void;
  onToggleExact(ordinal: number): void;
  /** Pickers open anchored to their buttons; main.ts owns the options. */
  onStatePicker(ordinal: number, anchor: HTMLElement): void;
  onEventPicker(ordinal: number, anchor: HTMLElement): void;
  onChannelPicker(ordinal: number, anchor: HTMLElement): void;
}

/** Per-turn DOM handles, keyed by ordinal. */
interface CardRow {
  row: HTMLElement;
  checkbox: HTMLInputElement;
  stripNote: HTMLElement;
  strip: HTMLElement;
  autoName: HTMLElement;
  collapseButton: HTMLButtonElement;
  mergeButton: HTMLButtonElement;
  splitButton: HTMLButtonElement | null;
  exactButton: HTMLButtonElement | null;
}

export class CardsView {
  private cards = new Map<number, CardRow>();
  private summaries = new Map<Segment, HTMLElement>();
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
      <div class="ts-source-col">
        <div class="ts-col-head"><span id="ts-source-title">created transcript</span></div>
        <div id="ts-source"></div>
      </div>
      <div class="ts-run-col">
        <div class="ts-col-head"><span>test run</span>
          <button class="ts-run-btn" disabled
                  title="Runs land with the run column phase (ADR-306 plan Phase 6)">Run</button>
        </div>
        <div id="ts-run-results"><span class="ts-pending-note">not run yet</span></div>
      </div>`;
    document.body.appendChild(root);

    const inputBar = document.getElementById('input-area');
    if (inputBar) root.querySelector('.ts-input-row')!.appendChild(inputBar);

    this.host = document.getElementById('ts-cards')!;
    this.session = root.querySelector('.ts-session')!;
    this.installSelectionGesture();
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
  addTurnCard(ordinal: number, boot: boolean): void {
    const staging = this.stagingPane();
    if (!staging) return;

    if (!this.cards.has(0) && this.model.hasOpening) {
      const openingElements: Element[] = [];
      for (const child of [...staging.children]) {
        if (child.hasAttribute('data-turn')) break;
        openingElements.push(child);
      }
      this.buildRow(0, false, openingElements);
    }

    const elements = [...staging.children]
      .filter(el => el.getAttribute('data-turn') === String(ordinal));
    this.buildRow(ordinal, boot, elements);
  }

  private buildRow(ordinal: number, boot: boolean, prose: Element[]): void {
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
    const mergeButton = document.createElement('button');
    mergeButton.textContent = 'Merge ↑';
    mergeButton.title =
      'Merge this transcript into the previous one — former gap turns ride as [SKIP]';
    const collapseButton = document.createElement('button');
    collapseButton.textContent = 'Collapse';
    collapseButton.title = 'Collapse this transcript into its summary card';
    strip.append(autoName, mergeButton, collapseButton);

    const block = document.createElement('div');
    block.className = 'ts-block';
    const meta = document.createElement('div');
    meta.className = 'ts-meta';
    meta.textContent = ordinal === 0
      ? 'opening'
      : `turn ${ordinal}${boot ? ' · boot' : ''}`;
    const proseHost = document.createElement('div');
    proseHost.className = 'ts-prose';
    for (const el of prose) proseHost.appendChild(el);
    block.append(meta, proseHost);

    // The action row: assertion gestures for THIS turn (design §5). The
    // buttons write into the source panel's transcript, never into the card.
    const actions = document.createElement('div');
    actions.className = 'ts-actions';

    /** Swaps the row for an inline input; Enter commits, Esc cancels. */
    const promptText = (placeholder: string, commit: (text: string) => void): void => {
      const input = document.createElement('input');
      input.placeholder = placeholder;
      actions.appendChild(input);
      input.focus();
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && input.value.trim()) {
          commit(input.value.trim());
          input.remove();
        } else if (event.key === 'Escape') {
          input.remove();
        }
      });
      input.addEventListener('blur', () => input.remove());
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

    let splitButton: HTMLButtonElement | null = null;
    if (ordinal > 0) {
      splitButton = document.createElement('button');
      splitButton.textContent = 'Split here';
      splitButton.title =
        'Start a new transcript at this turn — it continues from the one it left';
      splitButton.style.display = 'none';
      splitButton.addEventListener('click', () => this.delegate.onSplitAt(ordinal));
      actions.appendChild(splitButton);
    }
    block.appendChild(actions);

    column.append(stripNote, strip, block);
    row.append(pick, column);
    this.host.appendChild(row);
    this.cards.set(ordinal, {
      row, checkbox, stripNote, strip, autoName, collapseButton, mergeButton,
      splitButton, exactButton,
    });
  }

  /** Dead lineage (restart fence): every card and summary goes. */
  clear(): void {
    for (const { row } of this.cards.values()) row.remove();
    for (const summary of this.summaries.values()) summary.remove();
    this.cards.clear();
    this.summaries.clear();
  }

  /** Re-derives every card's visuals from the model (mock's applySegments). */
  render(): void {
    for (const [ordinal, card] of this.cards) {
      const segment = this.model.segmentOf(ordinal);
      const assigned = segment !== undefined;
      const ticked = assigned &&
        (ordinal === segment.start || ordinal === segment.end);
      const collapsed = assigned && segment.collapsed;

      card.row.style.display = collapsed ? 'none' : '';
      card.row.classList.toggle('ts-selected', assigned && !collapsed);
      card.checkbox.checked = ticked;
      card.checkbox.classList.toggle('ts-implied', assigned && !ticked);
      card.checkbox.title = this.checkboxTitle(ordinal, segment);

      const isFirst = assigned && ordinal === segment.start && !collapsed;
      card.row.classList.toggle('ts-segment-start', isFirst);
      card.strip.style.display = isFirst ? '' : 'none';
      card.stripNote.style.display = 'none';
      if (isFirst && segment) this.renderStrip(card, segment);

      if (card.splitButton) {
        const splittable = assigned && segment.end !== null && !collapsed &&
          ordinal > Math.max(segment.start, 1);
        card.splitButton.style.display = splittable ? '' : 'none';
      }
      card.exactButton?.classList.toggle('ts-active',
        this.model.claimsOf(ordinal).exact);
    }
    this.renderSummaries();
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
    card.mergeButton.style.display = parent ? '' : 'none';
    card.mergeButton.onclick = () => this.delegate.onMergeUp(segment);
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
      row.style.display = segment.collapsed ? '' : 'none';
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

  /** Run-column skeleton: a row per closed transcript, unrun ("—") until the
   *  run column phase wires the real harness. */
  private renderRunColumn(): void {
    const results = document.getElementById('ts-run-results');
    if (!results) return;
    const closed = this.model.segments.filter(s => s.end !== null);
    if (closed.length === 0) {
      results.innerHTML = '<span class="ts-pending-note">no transcripts yet</span>';
      return;
    }
    results.innerHTML = '';
    for (const segment of [...closed].sort((a, b) => a.start - b.start)) {
      const row = document.createElement('div');
      row.className = 'ts-run-row';
      const badge = document.createElement('span');
      badge.className = 'ts-badge';
      badge.textContent = '—';
      const name = document.createElement('div');
      name.className = 'ts-name';
      name.textContent = this.model.titleOf(segment);
      const why = document.createElement('div');
      why.className = 'ts-why';
      why.textContent = 'not run yet';
      row.append(badge, name, why);
      results.appendChild(row);
    }
  }

  scrollToLatest(): void {
    this.session.scrollTop = this.session.scrollHeight;
  }
}
