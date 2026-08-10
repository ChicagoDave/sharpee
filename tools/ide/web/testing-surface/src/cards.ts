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
import type { RunColumnState } from './run';

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
}

/** Per-turn DOM handles, keyed by ordinal. */
interface CardRow {
  row: HTMLElement;
  asserts: HTMLElement;
  exactButton: HTMLButtonElement | null;
  branchButton: HTMLButtonElement | null;
}

export class CardsView {
  private cards = new Map<number, CardRow>();
  /** One chip row per fork-point card, keyed by the card's bound ordinal. */
  private branchRows = new Map<number, HTMLElement>();
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
        <div class="ts-input-row"><div class="ts-gutter-cap"></div></div>
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

    // The gutter keeps the column geometry the rail used to give it.
    const gutter = document.createElement('div');
    gutter.className = 'ts-pick';

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
        'Try a different command from this point — what follows becomes a sibling branch';
      branchButton.style.display = 'none';
      branchButton.addEventListener('click', () =>
        promptText('alternate command, e.g. east',
                   command => this.delegate.onBranch(ordinal, command)));
      actions.appendChild(branchButton);
    }
    block.appendChild(actions);

    column.append(block);
    row.append(gutter, column);
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

  /** Dead session (restart replay): every card and chip row goes. */
  clear(): void {
    for (const { row } of this.cards.values()) row.remove();
    for (const row of this.branchRows.values()) row.remove();
    this.cards.clear();
    this.branchRows.clear();
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
    // says, not where delivery happened to append them.
    const pathOrdinals = this.model.visibleOrdinals();
    const points = this.model.branchPointsOnPath();
    for (const ordinal of pathOrdinals) {
      const card = this.cards.get(ordinal);
      if (!card) continue;
      this.host.appendChild(card.row);
      const chipRow = this.branchRows.get(ordinal);
      if (chipRow && points.some(p => p.ordinal === ordinal)) {
        this.host.appendChild(chipRow);
      }
    }

    const visible = new Set(pathOrdinals);
    for (const [ordinal, card] of this.cards) {
      card.row.style.display = visible.has(ordinal) ? '' : 'none';
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
        row.innerHTML = '<div class="ts-pick"></div>' +
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

    const forkCommand = this.model.cardAt(point.ordinal)?.command ?? '';
    const mainCount = this.model.ownCommandsOf(point.lineId).length;
    const mainChip = document.createElement('div');
    mainChip.className = 'ts-branch-chip' +
      (selectedSibling === undefined ? ' ts-chip-selected' : '');
    mainChip.innerHTML =
      `<div class="ts-meta">branch</div>
       <div class="ts-chip-title">${escapeHtml(this.model.labelOf(point.lineId))}</div>
       <div class="ts-chip-span">&gt; ${escapeHtml(forkCommand)} · ${mainCount} ${mainCount === 1 ? 'turn' : 'turns'}</div>`;
    mainChip.addEventListener('click', () =>
      this.delegate.onSelectLine(point.lineId));
    container.appendChild(mainChip);

    for (const sibling of point.siblings) {
      const pending = this.model.isPending(sibling);
      const count = this.model.ownCommandsOf(sibling).length;
      const firstCommand = this.model.ownCommandsOf(sibling)[0]
        ?? this.model.labelOf(sibling).split(' · ').at(-1) ?? '';
      const span = pending
        ? `&gt; ${escapeHtml(firstCommand)} · replay pending`
        : `&gt; ${escapeHtml(firstCommand)} · ${count} ${count === 1 ? 'turn' : 'turns'}`;
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

  /** The run column: one row per line of the tree — derived labels are the
   *  identities on the wire (D2/Q-8) — with PASS/FAIL, the first failure on
   *  one line, and a tally. A pending branch shows a dash. */
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

    // Every line the run touched, in run order — labels are the identities.
    for (const [label, result] of run.results) {
      switch (result.status) {
        case 'passed':
          row('PASS', 'ts-pass', label, `${result.passed} turn${result.passed === 1 ? '' : 's'}`);
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
