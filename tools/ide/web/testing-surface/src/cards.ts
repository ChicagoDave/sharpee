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

import type { ExplainGroup } from './character';
import type { DeleteRef, SourceLine } from './compose';
import {
  endingSiteLabel,
  groupDerivedRows,
  restOf,
  siteLabel,
  type DerivedBranchRow,
  type DerivedSummary,
  type SourceSpan,
} from './derived';
import type { BranchPoint, TreeSessionModel } from './model';
import { runRowsOf, type RunColumnState, type TranscriptRunResult } from './run';

/** Chip labels interpolate model strings into innerHTML — escape them. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/** Gesture sink — main.ts routes these into the model and re-renders. */
export interface CardsDelegate {
  /** The card's ✕ — tail-cut: this turn and everything after it (D4/Q-4). */
  onTailCut(ordinal: number): void;
  /** A chip's ✕ — delete that branch (and every branch forked from it). */
  onDeleteBranch(lineId: string): void;
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
  onSelectLine(lineId: string): void;
  /** The Run button: run the story's tree document at the pinned seed. */
  onRun(): void;
  /** The run column's current state — main.ts owns the fold. */
  runColumn(): RunColumnState;
  /** A span in the run column was clicked: open the editor there. `file`
   *  is relative to the story file's directory, null for the story file. */
  onOpenSource(file: string | null, line: number): void;
  /** The card's assertion lines (authored claims or live defaults). */
  assertionLines(ordinal: number): SourceLine[];
  /** The turn's explain groups — per-NPC character rows (ADR-318 D11)
   *  plus scene wire and exchange affordances (ADR-320 D12); empty when
   *  the turn had no character-model or scene activity. */
  characterExplain(ordinal: number): ExplainGroup[];
  /** A panel line's ✓ — assert this event as a channel claim on the card
   *  (the claim's fragments pin the event on the line's own channel —
   *  `character`, `scene`, or `exchange-affordances`; the run validates
   *  it). */
  onAssertCharacter(ordinal: number, fragments: string[], channel: string): void;
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
  /** The END STATE mark in the card's meta line (ADR-356 D4), shown while
   *  the card declares an ending. */
  endState: HTMLElement;
  asserts: HTMLElement;
  exactButton: HTMLButtonElement | null;
  branchButton: HTMLButtonElement | null;
  /** The card's "explain this NPC's turn" section (ADR-318 D11). */
  character: HTMLElement;
  characterButton: HTMLButtonElement;
  /** Panel open state — view ephemera, per card, never persisted. */
  characterOpen: boolean;
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
  /** Run-column groups the author opened — `subject:<s>`, `shape:<s>`
   *  (closed by default) — view ephemera, never persisted. */
  private openGroups = new Set<string>();
  /** Coverage rows the author closed — `branches`, `endings`, `rooms`
   *  (open by default while they have gaps) — view ephemera. */
  private closedCoverage = new Set<string>();

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
      <div class="ts-outline-col">
        <div class="ts-col-head"><span>lines</span></div>
        <div id="ts-outline"></div>
      </div>
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
    // END STATE (ADR-356 D4): the story ended on this turn. The mark reads
    // the card's own `ending`, filled by render() — a loaded document's
    // ending card shows it before any replay, a live ending the moment it
    // lands. No command lands here and nothing forks from here.
    const endState = document.createElement('span');
    endState.className = 'ts-end-state';
    endState.style.display = 'none';
    meta.appendChild(endState);

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
    // "Explain this NPC's turn" (ADR-318 D11): under the assertions, filled
    // by render() while the toggle is open. Observation only — nothing here
    // touches the document.
    const character = document.createElement('div');
    character.className = 'ts-character';
    character.style.display = 'none';
    block.append(meta, proseHost, asserts, character);

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

    // The NPC toggle: shown by render() only when the turn carried
    // character-model rows (the author channel is sparse), with the count.
    const characterButton = document.createElement('button');
    characterButton.className = 'ts-npc-toggle';
    characterButton.style.display = 'none';
    characterButton.title =
      "Explain this turn's character-model activity — forces, lies, conscience, "
      + 'transitions, conversation scenes, and open-exchange responses';
    characterButton.addEventListener('click', () => {
      const card = this.cards.get(ordinal);
      if (!card) return;
      card.characterOpen = !card.characterOpen;
      this.renderCharacter(card, ordinal);
    });
    actions.appendChild(characterButton);

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
    this.cards.set(ordinal, {
      row, endState, asserts, exactButton, branchButton,
      character, characterButton, characterOpen: false,
    });
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
      // A policy [SKIP] on a turn that carried character-model rows: say
      // where the turn's assertable meaning lives, and take the author
      // there (David 2026-08-16 — the bare tag read as "nothing to assert").
      if (line.kind === 'skip' && line.text === '[SKIP]'
          && this.delegate.characterExplain(ordinal).length > 0) {
        const hint = document.createElement('button');
        hint.className = 'ts-skip-npc-hint';
        hint.textContent = 'assert from the NPC panel →';
        hint.title = 'The auto-assertion policy had nothing to read this turn — '
          + "assert one of the NPC panel's character events instead";
        hint.addEventListener('click', () => {
          card.characterOpen = true;
          this.renderCharacter(card, ordinal);
        });
        row.appendChild(hint);
      }
      card.asserts.appendChild(row);
    }
  }

  /**
   * Re-fills one card's NPC panel (ADR-318 D11). The toggle shows only when
   * the turn carried character rows; the panel body renders while open —
   * per-NPC groups, one line per model event, the raw payload folding out
   * on a line click. Rows never change after delivery, so rebuilding per
   * render stays cheap and keeps one repaint path.
   */
  private renderCharacter(card: CardRow, ordinal: number): void {
    const groups = this.delegate.characterExplain(ordinal);
    const total = groups.reduce((n, group) => n + group.lines.length, 0);
    card.characterButton.style.display = total === 0 ? 'none' : '';
    card.characterButton.textContent = `NPC ×${total}`;
    card.characterButton.classList.toggle('ts-active', card.characterOpen);
    const open = card.characterOpen && total > 0;
    card.character.style.display = open ? '' : 'none';
    if (!open) return;

    card.character.innerHTML = '';
    for (const group of groups) {
      const head = document.createElement('div');
      head.className = 'ts-character-npc';
      head.textContent = group.npcLabel;
      card.character.appendChild(head);
      for (const line of group.lines) {
        const row = document.createElement('div');
        row.className = `ts-character-line${line.tone === 'warn' ? ' ts-warn' : ''}`;
        const text = document.createElement('span');
        text.className = 'ts-character-text';
        text.textContent = line.text;
        text.title = 'Click for the raw payload';
        let raw: HTMLElement | null = null;
        text.addEventListener('click', () => {
          if (raw) {
            raw.remove();
            raw = null;
            return;
          }
          raw = document.createElement('div');
          raw.className = 'ts-character-raw';
          raw.textContent = line.raw;
          row.after(raw);
        });
        row.appendChild(text);
        if (line.fragments.length > 0) {
          const assert = document.createElement('button');
          assert.className = 'ts-character-assert';
          assert.textContent = 'assert';
          assert.title =
            `Assert this event — a channel claim on \`${line.claimChannel}\` the test run validates`;
          assert.addEventListener('click', (event) => {
            event.stopPropagation();
            this.delegate.onAssertCharacter(ordinal, line.fragments, line.claimChannel);
          });
          row.appendChild(assert);
        }
        card.character.appendChild(row);
      }
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
      const ending = this.model.cardAt(ordinal)?.ending;
      card.endState.textContent = ending !== undefined ? `· END STATE · ${ending}` : '';
      card.endState.title = ending !== undefined
        ? `The story ended here (${ending}) — no further command lands on this card, and nothing forks from it`
        : '';
      card.endState.style.display = ending !== undefined ? '' : 'none';
      card.exactButton?.classList.toggle(
        'ts-active',
        this.model.claimsOf(ordinal)?.exact !== undefined,
      );
      this.renderAssertions(card, ordinal);
      this.renderCharacter(card, ordinal);
    }

    this.renderBranchRows(points);
    this.renderRunColumn();
  }

  /**
   * One chip row per fork point on the active path (D5): the fork card's own
   * continuation first (the main chip), then each sibling branch in creation
   * order — "all continue from this card".
   */
  private renderBranchRows(points: BranchPoint[]): void {
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
  private activeChain(): string[] {
    const chain: string[] = [];
    let cursor: string | undefined = this.model.activeLine;
    while (cursor !== undefined) {
      chain.unshift(cursor);
      cursor = this.model.lineParentOf(cursor);
    }
    return chain;
  }

  private renderChips(row: HTMLElement, point: BranchPoint): void {
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

  /** The run column: one header per line of the tree — keyed by line id,
   *  titled by derived label (ADR-355 D5) — then EVERY executed command with
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
      id === this.model.mainLine ? this.model.hasOpening : true);
    results.innerHTML = '';
    if (!this.model.hasOpening && run.results.size === 0
        && run.derived.length === 0 && run.derivedSummary === undefined) {
      results.innerHTML = '<span class="ts-pending-note">no tests yet</span>';
      return;
    }

    if (run.note) {
      const note = document.createElement('div');
      note.className = 'ts-run-note';
      note.textContent = run.note;
      results.appendChild(note);
    }

    // The three ratios first (ADR-356 D5): the run's headline, above the
    // detail that produced it. Present once the summary has arrived.
    if (run.derivedSummary) this.renderCoverageStrip(results, run.derivedSummary);
    // Two kinds of row from here on — name the tree's when the derived
    // tier's follow, so the column reads as two sections, not one list.
    if (run.derived.length > 0) {
      const tally = [...run.results.values()];
      const passing = tally.filter(result => result.status === 'passed').length;
      results.appendChild(this.sectionHeader(
        `tree · ${lineIds.length} line${lineIds.length === 1 ? '' : 's'}`,
        passing > 0 ? [[`${passing} pass`, 'ts-count-pass']] : [],
        true,
      ));
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

    // Every line the run touched, in run order, then this session's lines it
    // has not reached (or before any run) as a dash — never a guess. Rows
    // key on line id (`runRowsOf`, ADR-353 AC-3): two lines sharing a derived
    // label stay two rows (GH #494). Under each result header, the line's
    // cards and their assertions (the detail).
    const columnLines = lineIds.map((id) => ({
      id,
      label: this.model.labelOf(id),
      pending: this.model.isPending(id),
    }));
    for (const entry of runRowsOf(run, columnLines)) {
      const label = entry.label;
      if (entry.kind === 'unrun') {
        row('—', '', label, entry.why);
        continue;
      }
      const result = entry.result;
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

    if (run.derived.length > 0) this.renderDerivedRows(results, run.derived);

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
      // The derived tier's rules, the same way — and a SKIP is its own
      // count, never folded into failing (D5a).
      if (t.rules) {
        parts.push(`${unit(t.rules.passed, 'rule')} passing`);
        if (t.rules.failed > 0) parts.push(`${unit(t.rules.failed, 'rule')} failing`);
        if (t.rules.skipped > 0) parts.push(`${t.rules.skipped} skipped`);
        if (t.rules.errors > 0) parts.push(`${unit(t.rules.errors, 'rule error')}`);
      }
      tally.textContent = parts.join(', ');
      results.appendChild(tally);
    }
  }

  /** A section header in the run column: a title, right-aligned counts. */
  private sectionHeader(
    title: string,
    counts: Array<[text: string, className: string]>,
    dashed = false,
  ): HTMLElement {
    const head = document.createElement('div');
    head.className = `ts-run-section${dashed ? ' ts-dashed' : ''}`;
    const left = document.createElement('span');
    left.textContent = title;
    const right = document.createElement('span');
    for (const [text, className] of counts) {
      const count = document.createElement('span');
      count.className = className;
      count.textContent = text;
      if (right.childElementCount > 0) right.append(' ');
      right.appendChild(count);
    }
    head.append(left, right);
    return head;
  }

  /** A span as a link into the editor (GH #524 Phase 2) — the host opens
   *  the file at the line. Null for no span. */
  private sourceLink(file: string | null, line: number, label: string): HTMLElement {
    const link = document.createElement('a');
    link.className = 'ts-src';
    link.href = '#';
    link.textContent = label;
    link.title = 'open in the editor';
    link.addEventListener('click', event => {
      event.preventDefault();
      this.delegate.onOpenSource(file, line);
    });
    return link;
  }

  private spanLink(span: SourceSpan | null): HTMLElement | null {
    const label = siteLabel(span);
    if (!span || label === undefined) return null;
    return this.sourceLink(span.file ?? null, span.line, label);
  }

  /**
   * The coverage strip (ADR-356 D5): three ratios, each a bar and `n / m`,
   * each opening its gap list — the unexercised branches by span, the
   * unreached endings by span, the unentered rooms by id. Open by default
   * while a row has gaps; a full row has nothing to open.
   */
  private renderCoverageStrip(results: HTMLElement, summary: DerivedSummary): void {
    const strip = document.createElement('div');
    strip.className = 'ts-cov';
    const title = document.createElement('div');
    title.className = 'ts-cov-title';
    title.textContent = 'coverage';
    strip.appendChild(title);

    const ratioRow = (
      key: string,
      name: string,
      numerator: number,
      denominator: number,
      failed: number,
      hasDetail: boolean,
    ): boolean => {
      const open = hasDetail && !this.closedCoverage.has(key);
      const rowEl = document.createElement('button');
      rowEl.type = 'button';
      rowEl.className = 'ts-cov-row';
      rowEl.dataset.tsCoverage = key;
      const caret = document.createElement('span');
      caret.className = 'ts-caret';
      caret.textContent = hasDetail ? (open ? '▾' : '▸') : '';
      const label = document.createElement('span');
      label.className = 'ts-cov-name';
      label.textContent = name;
      const bar = document.createElement('span');
      bar.className = 'ts-cov-bar';
      const passWidth = denominator > 0 ? ((numerator - failed) / denominator) * 100 : 0;
      const failWidth = denominator > 0 ? (failed / denominator) * 100 : 0;
      const pass = document.createElement('span');
      pass.className = 'ts-cov-pass';
      pass.style.width = `${Math.max(0, passWidth)}%`;
      const fail = document.createElement('span');
      fail.className = 'ts-cov-fail';
      fail.style.width = `${Math.max(0, failWidth)}%`;
      bar.append(pass, fail);
      const ratio = document.createElement('span');
      ratio.className = 'ts-cov-ratio';
      ratio.textContent = `${numerator} / ${denominator}`;
      rowEl.append(caret, label, bar, ratio);
      if (hasDetail) {
        rowEl.addEventListener('click', () => {
          if (this.closedCoverage.has(key)) this.closedCoverage.delete(key);
          else this.closedCoverage.add(key);
          this.renderRunColumn();
        });
      }
      strip.appendChild(rowEl);
      return open;
    };

    const detailBlock = (): HTMLElement => {
      const block = document.createElement('div');
      block.className = 'ts-cov-detail';
      strip.appendChild(block);
      return block;
    };
    const countSpan = (text: string, className: string): HTMLElement => {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = text;
      return span;
    };

    // Branches: exercised over declared; the bar splits pass from fail.
    const b = summary.branches;
    const branchesOpen = ratioRow('branches', 'Branches', b.exercised, b.declared, b.failed, true);
    if (branchesOpen) {
      const block = detailBlock();
      const line = document.createElement('div');
      line.append(`exercised ${b.exercised} · `, countSpan(`${b.passed} pass`, 'ts-count-pass'));
      if (b.failed > 0) line.append(' · ', countSpan(`${b.failed} fail`, 'ts-count-fail'));
      if (b.gaps.length > 0) {
        const skipped = b.gaps.filter(gap => gap.status === 'skipped').length;
        const errors = b.gaps.length - skipped;
        if (skipped > 0) line.append(' · ', countSpan(`${skipped} skipped`, 'ts-count-skip'));
        if (errors > 0) line.append(' · ', countSpan(`${errors} error${errors === 1 ? '' : 's'}`, 'ts-count-fail'));
      }
      block.appendChild(line);
      if (b.gaps.length === 0 && b.declared > 0) {
        const hint = document.createElement('div');
        hint.className = 'ts-hint';
        hint.textContent = 'every declared branch exercised';
        block.appendChild(hint);
      }
    }

    // Endings: reached over declared; unreached by span, unnamed apart.
    const e = summary.endings;
    const endingsHaveDetail = e.unreached.length > 0 || e.unnamed.length > 0;
    const endingsOpen = ratioRow('endings', 'Endings', e.reached, e.declared, 0, endingsHaveDetail);
    if (endingsOpen) {
      const block = detailBlock();
      for (const ending of e.unreached) {
        const line = document.createElement('div');
        line.append(countSpan('◌', 'ts-count-skip'), ` ${ending.id ?? ''} `, countSpan(`(${ending.statement})`, 'ts-count-skip'));
        const site = endingSiteLabel(ending);
        if (site !== undefined && ending.line !== null) {
          line.append(' · ', this.sourceLink(ending.file, ending.line, site));
        }
        block.appendChild(line);
      }
      if (e.unreached.length > 0) {
        const hint = document.createElement('div');
        hint.className = 'ts-hint';
        hint.textContent = 'no line reaches it — play one and its last card becomes the END STATE card';
        block.appendChild(hint);
      }
      for (const ending of e.unnamed) {
        const line = document.createElement('div');
        line.append(countSpan('◌', 'ts-count-skip'), ` ${ending.statement} without an id`);
        const site = endingSiteLabel(ending);
        if (site !== undefined && ending.line !== null) {
          line.append(' · ', this.sourceLink(ending.file, ending.line, site));
        }
        block.appendChild(line);
      }
      if (e.unnamed.length > 0) {
        const hint = document.createElement('div');
        hint.className = 'ts-hint';
        hint.textContent = 'no END STATE card can name it — give it an id';
        block.appendChild(hint);
      }
    } else if (!endingsHaveDetail && e.declared > 0) {
      const block = detailBlock();
      block.textContent = 'every declared ending reached';
    }

    // Rooms: entered over declared; unentered by IR id.
    const r = summary.rooms;
    const roomsOpen = ratioRow('rooms', 'Rooms', r.entered, r.declared, 0, r.unentered.length > 0);
    if (roomsOpen) {
      const block = detailBlock();
      for (const room of r.unentered) {
        const line = document.createElement('div');
        line.append(countSpan('◌', 'ts-count-skip'), ` ${room}`);
        block.appendChild(line);
      }
    } else if (r.unentered.length === 0 && r.declared > 0) {
      const block = detailBlock();
      block.textContent = 'every declared room entered';
    }

    results.appendChild(strip);
  }

  /**
   * The derived rules section (ADR-356): failures and errors first and
   * open — the label, what was arranged and typed, the failing claim, the
   * span — then passes grouped by subject and SKIPPED grouped by shape,
   * each group closed until opened. A SKIPPED row shows its shape and is
   * never styled as a failure (D5a).
   */
  private renderDerivedRows(results: HTMLElement, rows: DerivedBranchRow[]): void {
    const groups = groupDerivedRows(rows);
    const counts: Array<[string, string]> = [[`${groups.passed}`, 'ts-count-pass']];
    if (groups.failed > 0) counts.push([`${groups.failed} ✗`, 'ts-count-fail']);
    if (groups.errors > 0) counts.push([`${groups.errors} error${groups.errors === 1 ? '' : 's'}`, 'ts-count-fail']);
    if (groups.skipped > 0) counts.push([`${groups.skipped} ◌`, 'ts-count-skip']);
    results.appendChild(this.sectionHeader(`derived rules · ${rows.length}`, counts));

    for (const failure of groups.failures) {
      const rowEl = document.createElement('div');
      rowEl.className = 'ts-derived-row';
      rowEl.dataset.tsDerived = failure.status;
      const head = document.createElement('div');
      head.className = 'ts-head';
      const name = document.createElement('span');
      name.className = 'ts-name';
      name.textContent = failure.label;
      const badge = document.createElement('span');
      badge.className = `ts-badge ${failure.status === 'error' ? 'ts-error' : 'ts-fail'}`;
      badge.textContent = failure.status === 'error' ? 'ERROR' : 'FAIL';
      head.append(name, badge);
      rowEl.appendChild(head);
      const arranged = failure.arranged ?? [];
      if (arranged.length > 0 || failure.command !== undefined) {
        const arrange = document.createElement('div');
        arrange.className = 'ts-arrange';
        const parts: string[] = [];
        if (arranged.length > 0) parts.push(`arrange ${arranged.join(' · ')}`);
        if (failure.command !== undefined) parts.push(`> ${failure.command}`);
        arrange.textContent = parts.join(' · ');
        rowEl.appendChild(arrange);
      }
      const why = failure.status === 'error'
        ? `error${failure.detail !== undefined ? `: ${failure.detail}` : ''}`
        : failure.failure ?? failure.detail ?? 'failed';
      const failureEl = document.createElement('div');
      failureEl.className = 'ts-failure';
      failureEl.textContent = `✗ ${why}`;
      rowEl.appendChild(failureEl);
      const link = this.spanLink(failure.span);
      if (link) {
        const site = document.createElement('div');
        site.className = 'ts-site';
        site.appendChild(link);
        rowEl.appendChild(site);
      }
      results.appendChild(rowEl);
    }

    const groupBlock = (
      key: string,
      title: string,
      titleClass: string,
      countEls: Array<[string, string]>,
      list: DerivedBranchRow[],
      render: (row: DerivedBranchRow) => HTMLElement,
      hint?: string,
    ): void => {
      const open = this.openGroups.has(key);
      const group = document.createElement('div');
      group.className = 'ts-group';
      group.dataset.tsGroup = key;
      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'ts-group-head';
      const caret = document.createElement('span');
      caret.className = 'ts-caret';
      caret.textContent = open ? '▾' : '▸';
      const name = document.createElement('span');
      name.className = titleClass;
      name.textContent = title;
      head.append(caret, name);
      for (const [text, className] of countEls) {
        const count = document.createElement('span');
        count.className = `ts-count ${className}`;
        count.textContent = text;
        head.appendChild(count);
      }
      head.addEventListener('click', () => {
        if (this.openGroups.has(key)) this.openGroups.delete(key);
        else this.openGroups.add(key);
        this.renderRunColumn();
      });
      group.appendChild(head);
      if (open) {
        const listEl = document.createElement('div');
        listEl.className = 'ts-group-list';
        for (const row of list) listEl.appendChild(render(row));
        if (hint !== undefined) {
          const hintEl = document.createElement('div');
          hintEl.className = 'ts-hint';
          hintEl.textContent = hint;
          listEl.appendChild(hintEl);
        }
        group.appendChild(listEl);
      }
      results.appendChild(group);
    };

    for (const { subject, rows: list } of groups.subjects) {
      groupBlock(`subject:${subject}`, subject, 'ts-subject', [[`${list.length} ✓`, 'ts-count-pass']], list, row => {
        const line = document.createElement('div');
        line.className = 'ts-pass';
        line.textContent = `✓ ${restOf(row.label)}`;
        return line;
      });
    }

    if (groups.shapes.length > 0) {
      results.appendChild(this.sectionHeader(`skipped · ${groups.skipped} · by shape`, [], true));
      for (const { shape, rows: list } of groups.shapes) {
        // The shape's detail is the same for every row in it — one hint.
        const detail = list.find(row => row.detail !== undefined)?.detail;
        groupBlock(`shape:${shape}`, shape, 'ts-shape', [[`${list.length}`, 'ts-count-skip']], list, row => {
          const line = document.createElement('div');
          line.append(`◌ ${row.label}`);
          const link = this.spanLink(row.span);
          if (link) line.append(' · ', link);
          return line;
        }, detail);
      }
    }
  }

  scrollToLatest(): void {
    this.session.scrollTop = this.session.scrollHeight;
  }
}
