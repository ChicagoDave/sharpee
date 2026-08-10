/**
 * main.ts — the testing play surface's entry point (ADR-306 Phases 3–5).
 *
 * Purpose: wires the pieces together inside the testing page. The IDE's
 *   document-start shim queues turn-feed records the Swift side forwards
 *   (`window.__sharpeeTestingSurface.deliver`); this module drains that
 *   queue, folds records into the SessionModel, builds cards, renders, and
 *   posts every view-state change back over the `testingSurface` bridge for
 *   the D8 sidecar.
 *
 * Phase 5 — it is also the REPLAY DRIVER (design §6, ADR-306 D7/D8):
 *   - A branch is a fresh boot at the pinned seed: storage cleared, a real
 *     `restart` typed through the client (the boot script stubs confirm),
 *     the shared prefix's commands replayed SUPPRESSED (their cards exist),
 *     then the alternate typed live — arriving over the same feed as any
 *     turn. Chip selection replays the sibling the same way: the viewed
 *     lineage is always the live lineage.
 *   - Reopen restores the whole fork tree by replay: root first, branches
 *     in id order, the active lineage last; structure re-applies through
 *     position→ordinal mapping, and closed segments' claims re-hydrate
 *     from their `tests/` files (the files are the truth — never clobbered).
 *   - Save/restore dialogs never stall a replay (D7 fold-in): outcomes are
 *     recorded as the author plays and re-applied when a replayed command
 *     opens its dialog; an outcome-less dialog is cancelled. Either way the
 *     turn completes.
 *
 * Public interface: none — the bundle is self-executing inside the page.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import {
  proseTextLinesOf, synthesizePolicyAssertions,
} from '@sharpee/branch-tester/auto-assertion';
import type { AutoAssertionPolicy } from '@sharpee/branch-tester/types';
import { CardsView } from './cards';
import {
  composeSegmentTranscript, composeTurnAssertionLines, rehydrateSegmentClaims,
  type DeleteRef, type TurnSource,
} from './compose';
import {
  SessionModel, type AuthoringMemento, type Segment, type SessionSnapshot,
} from './model';
import { showListPicker, showStatePicker, type StateFact } from './picker';
import { beginRun, createRunState, finishRun, foldRunLine, resetRun } from './run';

/** One world-digest entity as the feed carries it (ADR-306 Phase 2). */
interface DigestEntity {
  kind: 'npc' | 'item';
  name: string;
  token: string;
  location: { name: string; token: string };
}

/** A turn-feed record as forwarded by the IDE (TurnEventRecord / fence). */
interface FeedRecord {
  restart?: boolean;
  turn: number;
  command?: string;
  output?: string;
  captures?: { channel: string; values: unknown[] }[];
  events?: string[];
  world?: { entities?: DigestEntity[] };
}

/** A recorded dialog interaction, keyed to its turn (D7 fold-in). */
interface DialogOutcome {
  type: 'save' | 'restore';
  /** The confirmed slot name; null = the author cancelled. */
  slot: string | null;
}

/** The composite view-state the sidecar holds (opaque to Swift — D8). */
interface CompositeState {
  model: SessionSnapshot;
  /** Written stems keyed `lineage:startPos` — pointers, never content. */
  stems: Record<string, string>;
  /** Dialog outcomes keyed `lineage:pos`. */
  dialogs: [string, DialogOutcome][];
}

/** The boot global the IDE injects (ADR-306 D8), plus the story's
 *  `auto-assertion:` policy and the `tests/` files for re-hydration. */
interface BootSession {
  replay?: string[];
  snapshot?: CompositeState | SessionSnapshot;
  policy?: AutoAssertionPolicy;
  /** Every `tests/*.transcript` by stem — Swift ships them at open. */
  files?: Record<string, string>;
}

interface DeliverShim {
  q?: unknown[];
  deliver(record: unknown): void;
  /** One raw NDJSON line of a `sharpee test --tree --json` run (design §7). */
  runLine?(text: string): void;
  /** The run process exited; `ok` false with no run-end is a pipeline death. */
  runExit?(ok: boolean, note?: string): void;
}

/** A command to type during replay, keyed for dialog outcome lookup. */
interface ReplayStep { command: string; key: string }

const model = new SessionModel();
let activeSegment: Segment | null = null;

/** Every visible delivered record by ordinal — synthesis reads these. */
const records = new Map<number, FeedRecord>();
/** The story's `auto-assertion:` policy, injected by the IDE at boot. */
let policy: AutoAssertionPolicy | undefined;

/** The logical lineage newly delivered visible turns belong to. */
let currentLogical = 1;
/** Fresh ordinal by `lineage:pos` — restore's position mapping. */
const ordinalByPos = new Map<string, number>();
/** Recorded dialog outcomes by `lineage:pos` (D7 fold-in). */
let dialogOutcomes = new Map<string, DialogOutcome>();

// ── driver flags (the deliver pipeline reads these) ───────────────────────

/** Swallow ordinary records until the driver's fence arrives (restart ack). */
let dropBeforeFence = false;
/** The next fence is a driver fork/switch boot — never an author fence. */
let expectDriverFence = false;
/** Swallow records entirely (replayed prefix turns — cards already exist). */
let suppressDelivery = false;
/** A driver replay is in flight (fork, switch, or restore). */
let replayActive = false;
/** The whole driver operation spans this — while set, the sidecar is not
 *  posted and no writes land (a partial mid-replay state must never
 *  overwrite the persisted session), and the input stays held. */
let driverBusy = false;
/** The outcome key armed for the command currently being typed. */
let armedOutcomeKey: string | null = null;

/** The segment whose transcript walk covers `ordinal` — the model's
 *  extent-aware coverage (a mid-recording turn is part of the recording). */
function segmentCovering(ordinal: number): Segment | undefined {
  return model.coveringSegment(ordinal);
}

/** The opening's default contains-fragment (David 2026-08-09: the opening
 *  card lists a default too): the first text line of the opening card's own
 *  prose — the story banner's title in the real client. */
function openingText(): string | undefined {
  const prose = document.querySelector('[data-ts-ordinal="0"] .ts-prose');
  for (const child of prose ? [...prose.children] : []) {
    const text = child.textContent?.trim();
    if (text) return text;
  }
  return undefined;
}

/** The one ComposeOptions builder — every compose, re-hydrate, and card
 *  render must agree on the same inputs, or rehydration would mis-read its
 *  own files as diverged. */
function composeOptionsFor(segment: Segment) {
  return {
    model, segment, policy, seed: 42, source: turnSource,
    ...(openingText() !== undefined ? { openingText: openingText() } : {}),
  };
}

/** The card's assertion list (David's ruling 2026-08-09): the turn's lines
 *  exactly as its transcript carries them, or none outside any range. */
function assertionLinesFor(ordinal: number) {
  const segment = segmentCovering(ordinal);
  if (!segment) return [];
  return composeTurnAssertionLines(composeOptionsFor(segment), ordinal);
}

/** The policy's contains-fragments for a turn — removeDefault's narrowing
 *  base when a non-contains default line is deleted whole. */
function containsDefaultsOf(ordinal: number): string[] {
  const src = turnSource(ordinal);
  if (!policy || !src) return [];
  return synthesizePolicyAssertions(policy, src.output, src.channelValues)
    .filter(a => a.type === 'ok-contains' && a.value !== undefined)
    .map(a => a.value as string);
}

/** Maps a rendered line's DeleteRef onto the model mutator it names —
 *  deletion semantics live in the model, never re-derived here. */
function removeAssertion(del: DeleteRef): void {
  switch (del.kind) {
    case 'default':
      model.removeDefault(del.ordinal, del.index, del.defaults);
      break;
    case 'defaultWhole':
      model.removeDefault(del.ordinal, -1, containsDefaultsOf(del.ordinal));
      break;
    case 'contains': model.removeContains(del.ordinal, del.index); break;
    case 'notContains': model.removeNotContains(del.ordinal, del.index); break;
    case 'state': model.removeState(del.ordinal, del.index); break;
    case 'event': model.removeEvent(del.ordinal, del.index); break;
    case 'channel': model.removeChannel(del.ordinal, del.index); break;
    case 'exact': model.setExact(del.ordinal, false); break;
  }
}

/** Per-ordinal synthesis source for compose (ADR-306 D2). */
function turnSource(ordinal: number): TurnSource | undefined {
  const record = records.get(ordinal);
  if (!record || typeof record.output !== 'string') return undefined;
  const channelValues: Record<string, unknown[]> = {};
  for (const capture of record.captures ?? []) {
    channelValues[capture.channel] =
      [...(channelValues[capture.channel] ?? []), ...capture.values];
  }
  return { output: record.output, channelValues };
}

// ── undo (David's ruling 2026-08-09): authoring gestures are undoable ────
//
// The stack holds authoring mementos — segments, skips, claims, lineage
// table — never played turns. Gestures that change what was PLAYED (fork,
// branch delete, lineage switch, fence, restore) clear it instead of
// joining it: a memento must never resurrect a lineage whose turns are gone.
const undoStack: AuthoringMemento[] = [];
const UNDO_DEPTH = 100;

function pushUndo(): void {
  undoStack.push(model.captureAuthoring());
  if (undoStack.length > UNDO_DEPTH) undoStack.shift();
}

function clearUndo(): void {
  undoStack.length = 0;
}

function performUndo(): void {
  if (driverBusy || replayActive) return;
  const memento = undoStack.pop();
  if (!memento) return;
  model.restoreAuthoring(memento);
  if (activeSegment && !model.segments.includes(activeSegment)) {
    activeSegment = model.openSegment() ?? null;
  }
  update();
}

const cards = new CardsView(model, {
  onTick(ordinal, checked) {
    pushUndo();
    if (checked) {
      const result = model.tick(ordinal);
      if (result !== 'noop') activeSegment = model.segmentOf(ordinal) ?? null;
    } else {
      model.untick(ordinal);
      if (activeSegment && !model.segments.includes(activeSegment)) {
        activeSegment = model.segmentOf(ordinal) ?? null;
      }
    }
    update();
  },
  onCollapse(segment) { pushUndo(); model.setCollapsed(segment, true); update(); },
  onExpand(segment) {
    pushUndo();
    model.setCollapsed(segment, false);
    activeSegment = segment;
    update();
  },
  onDeleteLineage(lineage) {
    void performDeleteLineage(lineage);
  },
  onActivate(segment) {
    activeSegment = segment;
  },
  onAddContains(ordinal, text) {
    pushUndo();
    touchSegmentAt(ordinal);
    if (model.addContains(ordinal, text)) {
      activeSegment = model.segmentOf(ordinal) ?? activeSegment;
      update();
    }
  },
  onNotContains(ordinal, text) {
    pushUndo();
    touchSegmentAt(ordinal);
    if (model.addNotContains(ordinal, text)) {
      activeSegment = model.segmentOf(ordinal) ?? activeSegment;
      update();
    }
  },
  onToggleExact(ordinal) {
    pushUndo();
    touchSegmentAt(ordinal);
    if (model.setExact(ordinal, !model.claimsOf(ordinal).exact)) {
      activeSegment = model.segmentOf(ordinal) ?? activeSegment;
      update();
    }
  },
  onStatePicker(ordinal, anchor) {
    // The unseen slice (design §5): entity locations from the digest —
    // never player.location, and only expressions the runner's evaluator
    // accepts (entity.property = value). Score and machine facts join when
    // the evaluator grows their forms.
    const entities = records.get(ordinal)?.world?.entities ?? [];
    const facts: StateFact[] = entities.map(entity => ({
      label: `${entity.name} — ${entity.location.name}`,
      expression: `${entity.token}.location = ${entity.location.token}`,
      kind: entity.kind === 'npc' ? 'NPC locations' : 'item locations',
    }));
    showStatePicker(anchor, facts, fact => {
      pushUndo();
      touchSegmentAt(ordinal);
      if (model.addState(ordinal, fact.expression)) {
        activeSegment = model.segmentOf(ordinal) ?? activeSegment;
        update();
      }
    });
  },
  onEventPicker(ordinal, anchor) {
    const events = records.get(ordinal)?.events ?? [];
    showListPicker(anchor, 'events this turn emitted', events, event => {
      pushUndo();
      touchSegmentAt(ordinal);
      if (model.addEvent(ordinal, event)) {
        activeSegment = model.segmentOf(ordinal) ?? activeSegment;
        update();
      }
    });
  },
  onChannelPicker(ordinal, anchor) {
    const captures = records.get(ordinal)?.captures ?? [];
    const labels = captures.map(capture => {
      const flat = proseTextLinesOf(capture.values).join(' ');
      const scalar = capture.values.length === 1 && typeof capture.values[0] !== 'object'
        ? String(capture.values[0]) : null;
      return `${capture.channel} — ${scalar ?? `"${flat.slice(0, 40)}"`}`;
    });
    showListPicker(anchor, 'channels this turn captured', labels, (_label, index) => {
      const capture = captures[index];
      if (!capture) return;
      const scalarValue = capture.values.length === 1
        && (typeof capture.values[0] === 'number' || typeof capture.values[0] === 'boolean')
        ? capture.values[0] as number | boolean : null;
      const flat = proseTextLinesOf(capture.values).join(' ');
      const claim = scalarValue !== null
        ? { id: capture.channel, is: scalarValue }
        : { id: capture.channel, contains: flat.slice(0, 60) };
      pushUndo();
      touchSegmentAt(ordinal);
      if (model.addChannel(ordinal, claim)) {
        activeSegment = model.segmentOf(ordinal) ?? activeSegment;
        update();
      }
    });
  },
  onBranch(ordinal, command) {
    void performBranch(ordinal, command);
  },
  onSelectLineage(lineage) {
    void selectLineage(lineage);
  },
  onRun() {
    // One run at a time, and never during a driver replay — the run reads
    // the files on disk, which a mid-replay session hasn't finished writing.
    if (runState.inFlight || driverBusy || replayActive) return;
    beginRun(runState);
    cards.render();
    postToBridge({ run: true });
  },
  runColumn: () => runState,
  assertionLines: assertionLinesFor,
  onRemoveAssertion(del) {
    pushUndo();
    touchSegmentAt(del.ordinal);
    removeAssertion(del);
    update();
  },
});

// ── the run column (design §7): fold the relayed NDJSON stream ────────────

const runState = createRunState();

function deliverRunLine(text: string): void {
  foldRunLine(runState, text);
  cards.render();
}

function deliverRunExit(ok: boolean, note?: string): void {
  finishRun(runState, ok, note);
  cards.render();
}

/** Re-render and persist: every model change lands in the sidecar (D8)
 *  and every closed segment lands on disk (design §4's auto-save). */
function update(): void {
  if (activeSegment && !model.segments.includes(activeSegment)) {
    activeSegment = null;
  }
  if (!driverBusy) {
    // Writes BEFORE state: postState's stems must describe the files this
    // very update just landed — the other order persists stems one update
    // stale, and a session ending on a rename would reopen pointing at
    // files that no longer exist (leaving their successors unhydrated and
    // clobberable). Writes also come before the render: a change to the
    // suite on disk resets the run column (its results describe a tree
    // that no longer exists — David's ruling 2026-08-09), and the render
    // must show that reset.
    const suiteChanged = syncWrites();
    if (suiteChanged && !runState.inFlight) resetRun(runState);
    cards.render();
    postState();
  } else {
    cards.render();
  }
}

// ── the auto-save writer (design §4): a closed segment IS a file ──────────

/** What each tracked segment last wrote: its stem and its exact text. */
const written = new Map<Segment, { name: string; text: string }>();

/** Segments whose `tests/` file diverged from what compose reproduces
 *  (hand-edited beyond the claim grammar): never auto-written until the
 *  author's next gesture on the segment takes it back. */
const detached = new Set<Segment>();

/** An authoring gesture on a segment re-attaches its file to the writer. */
function touchSegmentAt(ordinal: number): void {
  const segment = segmentCovering(ordinal);
  if (segment) detached.delete(segment);
}

function postToBridge(payload: Record<string, unknown>): void {
  try {
    (window as unknown as {
      webkit?: { messageHandlers?: { testingSurface?: { postMessage(b: string): void } } };
    }).webkit?.messageHandlers?.testingSurface?.postMessage(JSON.stringify(payload));
  } catch {
    // Observation only — the surface must keep working without the bridge.
  }
}

/**
 * Mirrors the session onto disk: EVERY segment — open ranges included — is a
 * file from its first tick (David's ruling 2026-08-09: every gesture lands
 * in `tests/` immediately; an open recording's file grows as the author
 * plays). Every edit rewrites; a restructure that renames posts
 * `previousName` so the Swift side deletes the old file and cascades
 * children's `continues:`; a segment the author removed (untick, merge)
 * removes its file. A fence only forgets tracking — files already in
 * `tests/` are durable artifacts, never deleted by a restart (ADR-305 D3
 * fences the SESSION, not the suite).
 */
function syncWrites(): boolean {
  let changed = false;
  for (const [segment, last] of [...written]) {
    if (!model.segments.includes(segment)) {
      written.delete(segment);
      postToBridge({ remove: { name: last.name } });
      changed = true;
    }
  }
  for (const segment of [...detached]) {
    if (!model.segments.includes(segment)) detached.delete(segment);
  }
  for (const segment of model.segments) {
    if (detached.has(segment)) continue;
    const { title, text } = composeSegmentTranscript(composeOptionsFor(segment));
    const last = written.get(segment);
    if (last && last.name === title && last.text === text) continue;
    const payload: Record<string, unknown> = { write: { name: title, text } };
    if (last && last.name !== title) {
      (payload.write as Record<string, unknown>).previousName = last.name;
    }
    written.set(segment, { name: title, text });
    postToBridge(payload);
    changed = true;
  }
  return changed;
}

/** Posts the composite view snapshot over the bridge (D8 sidecar): the
 *  model's position-keyed snapshot, written stems as pointers, and dialog
 *  outcomes — session truth only, no assertions, no transcript content. */
function postState(): void {
  const stems: Record<string, string> = {};
  for (const [segment, last] of written) {
    const at = model.positionOf(segment.start);
    if (at) stems[`${segment.lineage}:${segment.start === 0 ? 0 : at.pos}`] = last.name;
  }
  const composite: CompositeState = {
    model: model.snapshot(),
    stems,
    dialogs: [...dialogOutcomes],
  };
  postToBridge({ state: composite });
}

// ── dialogs (D7 fold-in): record as the author plays, drive under replay ──

/** The last dialog interaction, waiting for its turn record to land. */
let pendingDialogOutcome: DialogOutcome | null = null;

function installDialogHooks(): void {
  const saveDialog = document.getElementById('save-dialog') as HTMLDialogElement | null;
  const restoreDialog = document.getElementById('restore-dialog') as HTMLDialogElement | null;
  const startupDialog = document.getElementById('startup-dialog') as HTMLDialogElement | null;

  saveDialog?.addEventListener('close', () => {
    if (replayActive) return;
    const name = (document.getElementById('save-name-input') as HTMLInputElement | null)?.value;
    pendingDialogOutcome = saveDialog.returnValue === 'confirm' && name
      ? { type: 'save', slot: name }
      : { type: 'save', slot: null };
  });
  restoreDialog?.addEventListener('close', () => {
    if (replayActive) return;
    const selected = document.querySelector<HTMLElement>(
      '#restore-slots-list .save-slot.selected');
    pendingDialogOutcome = restoreDialog.returnValue === 'confirm'
      ? { type: 'restore', slot: selected?.dataset.slotName ?? null }
      : { type: 'restore', slot: null };
  });

  // Under replay, a dialog must resolve without a human: apply the recorded
  // outcome, or cancel — either way the turn completes (D7: no stall).
  const observe = (dialog: HTMLDialogElement | null, drive: () => void): void => {
    if (!dialog) return;
    new MutationObserver(() => {
      if (dialog.open && replayActive) setTimeout(drive, 0);
    }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  };
  observe(saveDialog, () => {
    const outcome = armedOutcomeKey ? dialogOutcomes.get(armedOutcomeKey) : undefined;
    const input = document.getElementById('save-name-input') as HTMLInputElement | null;
    if (outcome?.type === 'save' && outcome.slot !== null && input) {
      input.value = outcome.slot;
      (document.getElementById('save-confirm-btn') as HTMLElement | null)?.click();
    } else {
      (document.getElementById('save-cancel-btn') as HTMLElement | null)?.click();
    }
  });
  observe(restoreDialog, () => {
    const outcome = armedOutcomeKey ? dialogOutcomes.get(armedOutcomeKey) : undefined;
    const slot = outcome?.type === 'restore' && outcome.slot !== null
      ? document.querySelector<HTMLElement>(
          `#restore-slots-list .save-slot[data-slot-name="${CSS.escape(outcome.slot)}"]`)
      : null;
    if (slot) {
      slot.click();
      (document.getElementById('restore-confirm-btn') as HTMLElement | null)?.click();
    } else {
      (document.getElementById('restore-cancel-btn') as HTMLElement | null)?.click();
    }
  });
  observe(startupDialog, () => {
    // Fresh boots replay their own history — never continue an autosave.
    (document.getElementById('startup-new-btn') as HTMLElement | null)?.click();
  });
}

// ── feed delivery ─────────────────────────────────────────────────────────

/** True until the next record, which is a lineage's automatic boot look. */
let expectBoot = true;
/** Resolvers waiting on the next delivered turn (the replay driver). */
let nextTurnWaiters: (() => void)[] = [];
/** Resolvers waiting on the next restart fence (the replay driver). */
let fenceWaiters: (() => void)[] = [];

/** The room after this turn, from the `room-name` capture. Real channel
 *  values are structured prose trees, so extraction goes through the
 *  synthesis module's own reader (ADR-306 D2: imported, not reimplemented). */
function roomOf(record: FeedRecord): string | undefined {
  const capture = (record.captures ?? [])
    .filter(c => c.channel === 'room-name')
    .at(-1);
  return proseTextLinesOf(capture?.values).at(-1);
}

function deliver(raw: unknown): void {
  const record = raw as FeedRecord;
  if (!record || typeof record.turn !== 'number') return;

  if (record.restart === true) {
    dropBeforeFence = false;
    if (expectDriverFence) {
      // A driver fork/switch boot — a fresh lineage, never a dead one.
      expectDriverFence = false;
      expectBoot = true;
      const waiters = fenceWaiters;
      fenceWaiters = [];
      for (const resolve of waiters) resolve();
      return;
    }
    cards.clear();
    clearUndo();
    model.fence();
    records.clear();
    written.clear();  // files stay — only the session's tracking resets
    detached.clear();
    dialogOutcomes.clear();
    ordinalByPos.clear();
    currentLogical = 1;
    activeSegment = null;
    expectBoot = true;
    pendingDialogOutcome = null;
    update();
    return;
  }

  if (dropBeforeFence) return;         // the driver's restart ack — swallow
  const boot = expectBoot;
  expectBoot = false;
  if (suppressDelivery) {
    // A replayed prefix turn: its card already exists — swallow, but pace
    // the driver's typing loop.
    const waiters = nextTurnWaiters;
    nextTurnWaiters = [];
    for (const resolve of waiters) resolve();
    return;
  }

  cards.ensureLayout();
  records.set(record.turn, record);
  const room = roomOf(record);
  model.addTurn({
    ordinal: record.turn,
    command: record.command ?? '',
    ...(room !== undefined ? { room } : {}),
    boot,
    lineage: currentLogical,
  });
  const at = model.positionOf(record.turn);
  if (at) ordinalByPos.set(`${at.lineage}:${at.pos}`, record.turn);
  if (pendingDialogOutcome && at) {
    dialogOutcomes.set(`${at.lineage}:${at.pos}`, pendingDialogOutcome);
    pendingDialogOutcome = null;
  }
  cards.addTurnCard(record.turn, boot, currentLogical !== 1);
  update();
  cards.scrollToLatest();

  const waiters = nextTurnWaiters;
  nextTurnWaiters = [];
  for (const resolve of waiters) resolve();
}

const awaitNextTurn = (timeoutMs: number): Promise<boolean> =>
  new Promise(resolve => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    nextTurnWaiters.push(() => { clearTimeout(timer); resolve(true); });
  });

const awaitFence = (timeoutMs: number): Promise<boolean> =>
  new Promise(resolve => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    fenceWaiters.push(() => { clearTimeout(timer); resolve(true); });
  });

// ── the replay driver (design §6, ADR-306 D7/D8) ─────────────────────────

/** Types one command into the client's real input — the same door the
 *  author uses, so replayed turns arrive over the same feed as any turn. */
function typeCommand(command: string): void {
  const input = document.getElementById('command-input') as HTMLInputElement | null;
  if (!input) return;
  input.value = command;
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

function setInputHeld(held: boolean, placeholder = ''): void {
  const input = document.getElementById('command-input') as HTMLInputElement | null;
  if (!input) return;
  input.disabled = held;
  input.placeholder = placeholder;
  if (!held) input.focus();
}

/**
 * The fresh-boot primitive every fork, switch, and restore branch rides:
 * storage-clean in-page restart (the fence arrives flagged as the driver's,
 * so nothing clears), the boot look and `replay` steps suppressed (their
 * cards exist), then `live` steps typed visibly into `logical`. Dialog
 * outcomes ride each step's key. Returns false when a turn never arrived —
 * the caller's state stays honest (degraded, never an error — D8).
 */
async function driveFreshBoot(
  logical: number,
  replay: ReplayStep[],
  live: ReplayStep[],
): Promise<boolean> {
  const wasBusy = driverBusy;
  driverBusy = true;
  replayActive = true;
  setInputHeld(true, 'replaying…');
  try {
    localStorage.clear();       // ADR-302 D17: fresh boots are storage-clean
    dropBeforeFence = true;
    expectDriverFence = true;
    // Pre-announce: the Swift side marks the coming fence as a driver boot
    // (`fork: true`), so its linear replay plan never crosses one.
    postToBridge({ forkBoot: true });
    typeCommand('restart');
    if (!(await awaitFence(15_000))) return false;
    suppressDelivery = true;
    if (!(await awaitNextTurn(15_000))) return false;   // the boot look
    for (const step of replay) {
      armedOutcomeKey = step.key;
      typeCommand(step.command);
      const landed = await awaitNextTurn(15_000);
      armedOutcomeKey = null;
      if (!landed) return false;
    }
    suppressDelivery = false;
    currentLogical = logical;
    for (const step of live) {
      armedOutcomeKey = step.key;
      typeCommand(step.command);
      const landed = await awaitNextTurn(15_000);
      armedOutcomeKey = null;
      if (!landed) return false;
    }
    return true;
  } finally {
    dropBeforeFence = false;
    expectDriverFence = false;
    suppressDelivery = false;
    armedOutcomeKey = null;
    replayActive = false;
    driverBusy = wasBusy;
    setInputHeld(driverBusy, driverBusy ? 'restoring session…' : '');
    update();
  }
}

/** The replay steps that reproduce the shared prefix of a fork at `n`. */
function ancestryStepsBefore(n: number): ReplayStep[] {
  const lineage = model.lineageOf(n);
  if (lineage === undefined) return [];
  return model.pathTurns(lineage)
    .filter(t => t.ordinal > 0 && t.ordinal < n && !t.boot)
    .map(t => {
      const at = model.positionOf(t.ordinal);
      return { command: t.command, key: at ? `${at.lineage}:${at.pos}` : '' };
    });
}

/** Branch… (design §6): the card's gesture means "try a different command
 *  FROM this state" (David 2026-08-09) — the fork point is the NEXT turn on
 *  the active path, whose command the alternate replaces. Fork the model,
 *  then boot the branch live. */
async function performBranch(ordinal: number, command: string): Promise<void> {
  if (replayActive) return;
  const at = model.forkPointAfter(ordinal);
  if (at === undefined) return;
  clearUndo();
  const ancestry = ancestryStepsBefore(at);
  const id = model.fork(at, command);
  if (id === null) return;
  update();                     // the pending chip shows immediately
  await driveFreshBoot(id, ancestry, [{ command, key: '' }]);
}

/** Chip selection: the viewed lineage is always the live lineage — replay
 *  the sibling live (all suppressed — its cards are retained), then show. */
async function selectLineage(lineage: number): Promise<void> {
  if (replayActive || lineage === model.activeLineage) return;
  clearUndo();
  if (!model.activateLineage(lineage)) return;
  const path = model.pathTurns(lineage)
    .filter(t => t.ordinal > 0 && !t.boot)
    .map(t => {
      const at = model.positionOf(t.ordinal);
      return { command: t.command, key: at ? `${at.lineage}:${at.pos}` : '' };
    });
  update();                     // the view switches on retained cards
  await driveFreshBoot(lineage, path, []);
}

/** Chip ✕ (David's ruling 2026-08-09): the branch, its descendants, and
 *  their files go. Deleting the VIEWED branch replays its parent live —
 *  the view is always the live lineage (Phase 5's rule). Not on the ⌘Z
 *  stack: it changes what was played, so the stack clears instead. */
async function performDeleteLineage(lineage: number): Promise<void> {
  if (replayActive || driverBusy) return;
  const result = model.deleteLineage(lineage);
  if (result === null) return;
  clearUndo();
  if (activeSegment && !model.segments.includes(activeSegment)) {
    activeSegment = model.openSegment() ?? null;
  }
  update();                     // chips/cards/files reconcile immediately
  if (result.wasActive) {
    // The dead branch was live on the engine — replay the surviving parent.
    const path = model.pathTurns(result.parentId)
      .filter(t => t.ordinal > 0 && !t.boot)
      .map(t => {
        const at = model.positionOf(t.ordinal);
        return { command: t.command, key: at ? `${at.lineage}:${at.pos}` : '' };
      });
    await driveFreshBoot(result.parentId, path, []);
  }
}

// ── restore on boot (ADR-306 D8) ─────────────────────────────────────────

/** The steps for a snapshot lineage's shared prefix, walked snapshot-side
 *  (the model has no turns yet during restore). */
function snapshotAncestrySteps(
  snap: SessionSnapshot,
  lineageId: number,
  uptoPos: number | undefined,
): ReplayStep[] {
  const byId = new Map(snap.lineages.map(l => [l.id, l]));
  const chain: { id: number; cutPos: number | undefined }[] = [];
  let cursor = byId.get(lineageId);
  let cut = uptoPos;
  while (cursor) {
    chain.unshift({ id: cursor.id, cutPos: cut });
    cut = cursor.forkAtPos;
    cursor = cursor.parentId === undefined ? undefined : byId.get(cursor.parentId);
  }
  const steps: ReplayStep[] = [];
  for (const { id, cutPos } of chain) {
    const lineage = byId.get(id);
    if (!lineage) continue;
    lineage.turns.forEach((turn, index) => {
      const pos = index + 1;
      if (cutPos !== undefined && pos >= cutPos) return;
      if (turn.boot) return;
      steps.push({ command: turn.command, key: `${id}:${pos}` });
    });
  }
  return steps;
}

/** Whether a parsed value looks like the Phase 5 composite state. */
function isComposite(value: unknown): value is CompositeState {
  return typeof value === 'object' && value !== null
    && 'model' in value
    && Array.isArray((value as { model?: { lineages?: unknown } }).model?.lineages);
}

/**
 * Scopes a persisted snapshot to its own suite BEFORE replay (ADR-306
 * ruling 11 applies on read as well as write): per lineage, only the turns
 * its segments reach (an open range keeps its whole recording), its skips,
 * and surviving children's fork points replay; segmentless branches drop
 * whole. A sidecar written before the write-side trim — or by anything
 * else — must not type unticked commands back into a reopened session.
 */
function scopeSnapshotToSuite(snap: SessionSnapshot): SessionSnapshot {
  const surviving = new Set<number>([1]);
  for (;;) {
    const before = surviving.size;
    for (const lineage of snap.lineages) {
      if (surviving.has(lineage.id)) continue;
      const hasOwn = (snap.segments ?? []).some(s => s.lineage === lineage.id)
        || lineage.pendingCommand !== undefined;
      const hasHeir = snap.lineages.some(l =>
        l.parentId === lineage.id && surviving.has(l.id));
      if (hasOwn || hasHeir) surviving.add(lineage.id);
    }
    if (surviving.size === before) break;
  }
  const neededOf = (lineage: SessionSnapshot['lineages'][number]): number => {
    let needed = 0;
    for (const s of snap.segments ?? []) {
      if (s.lineage !== lineage.id) continue;
      if (s.endPos === null || s.endPos === undefined) return lineage.turns.length;
      needed = Math.max(needed, s.endPos);
    }
    for (const skip of snap.skipped ?? []) {
      if (skip.lineage === lineage.id) needed = Math.max(needed, skip.pos);
    }
    for (const child of snap.lineages) {
      if (child.parentId === lineage.id && surviving.has(child.id)
          && child.forkAtPos !== undefined) {
        needed = Math.max(needed, child.forkAtPos);
      }
    }
    return needed;
  };
  return {
    ...snap,
    lineages: snap.lineages
      .filter(lineage => surviving.has(lineage.id))
      .map(lineage => ({ ...lineage, turns: lineage.turns.slice(0, neededOf(lineage)) })),
    active: surviving.has(snap.active) ? snap.active : 1,
  };
}

/**
 * Restores the whole session by replay (D8): root lineage first, branch
 * lineages in id order, and the snapshot's active lineage replayed last so
 * it ends up live; then structure re-applies through the position→ordinal
 * map, and each written segment's claims re-hydrate from its `tests/` file.
 * Any step that fails leaves what landed — degraded, never an error.
 */
async function restoreComposite(
  composite: CompositeState,
  files: Record<string, string>,
): Promise<void> {
  const snap = scopeSnapshotToSuite(composite.model);
  dialogOutcomes = new Map(composite.dialogs ?? []);

  driverBusy = true;
  replayActive = true;
  setInputHeld(true, 'restoring session…');
  try {
    // The root's boot look plays itself — wait for it unless it already
    // arrived in the drained queue.
    if (model.turns.length === 0) await awaitNextTurn(15_000);
    const root = snap.lineages.find(l => l.id === 1);
    let intact = true;
    for (const [index, turn] of (root?.turns ?? []).entries()) {
      if (turn.boot) continue;
      armedOutcomeKey = `1:${index + 1}`;
      typeCommand(turn.command);
      const landed = await awaitNextTurn(15_000);
      armedOutcomeKey = null;
      if (!landed) { intact = false; break; }
    }
    replayActive = false;

    if (intact) {
      const branches = snap.lineages
        .filter(l => l.id !== 1 && l.parentId !== undefined)
        .sort((a, b) => a.id - b.id);
      for (const lineage of branches) {
        const forkOrdinal = lineage.forkAtPos !== undefined && lineage.parentId !== undefined
          ? ordinalByPos.get(`${lineage.parentId}:${lineage.forkAtPos}`)
          : undefined;
        model.registerLineage({
          id: lineage.id,
          ...(lineage.parentId !== undefined ? { parentId: lineage.parentId } : {}),
          ...(forkOrdinal !== undefined ? { forkAt: forkOrdinal } : {}),
          ...(lineage.pendingCommand !== undefined
            ? { pendingCommand: lineage.pendingCommand } : {}),
        });
        if (lineage.turns.length === 0) continue;
        const ancestry = snapshotAncestrySteps(snap, lineage.parentId!, lineage.forkAtPos);
        const live = lineage.turns.map((turn, index) => ({
          command: turn.command, key: `${lineage.id}:${index + 1}`,
        }));
        if (!(await driveFreshBoot(lineage.id, ancestry, live))) break;
      }

      // The active lineage replays last — view is live (Phase 5's rule).
      if (typeof snap.active === 'number'
          && snap.active !== currentLogical
          && model.activateLineage(snap.active)) {
        const path = snapshotAncestrySteps(snap, snap.active, undefined);
        await driveFreshBoot(snap.active, path, []);
      }
    }

    model.restore(snap, (lineage, pos) => ordinalByPos.get(`${lineage}:${pos}`));
    activeSegment = model.openSegment()
      ?? model.segments[model.segments.length - 1] ?? null;

    // Segments' claims live in their files — parse them back (Phase 5:
    // reopening must never rewrite authored claims away). Open ranges
    // rehydrate too: they are files from their first tick, and the replay
    // reproduced exactly the turns their file was last written over.
    for (const [key, stem] of Object.entries(composite.stems ?? {})) {
      const [lineageText, posText] = key.split(':');
      const start = Number(posText) === 0
        ? (model.hasOpening ? 0 : undefined)
        : ordinalByPos.get(`${Number(lineageText)}:${Number(posText)}`);
      if (start === undefined) continue;
      const segment = model.segmentOf(start);
      if (!segment || segment.start !== start) continue;
      const fileText = files[stem];
      if (typeof fileText !== 'string') {
        // The recorded file left the disk (David's ruling 2026-08-09: the
        // files are the truth) — the segment goes with it, never re-written
        // from defaults over the author's deliberate delete.
        model.untick(segment.start);
        continue;
      }
      const result = rehydrateSegmentClaims(composeOptionsFor(segment), fileText);
      if (result === 'attached') {
        written.set(segment, { name: stem, text: fileText });
      } else {
        detached.add(segment);
      }
    }
  } finally {
    replayActive = false;
    driverBusy = false;
    armedOutcomeKey = null;
    setInputHeld(false);
    update();
  }
}

/** The commands-only linear restore (no composite in the sidecar): type
 *  the tail Swift computed; structure and claims have nothing to restore. */
async function restoreLinear(session: BootSession): Promise<void> {
  const commands = session.replay ?? [];
  if (commands.length > 0) {
    replayActive = true;
    setInputHeld(true, 'restoring session…');
    if (model.turns.length === 0) await awaitNextTurn(15_000);
    for (const command of commands) {
      typeCommand(command);
      if (!(await awaitNextTurn(15_000))) break;
    }
    replayActive = false;
    setInputHeld(false);
  }
  update();
}

// ── boot ──────────────────────────────────────────────────────────────────

const surfaceWindow = window as unknown as {
  __sharpeeTestingSurface?: DeliverShim;
  __SHARPEE_TESTING_SESSION__?: BootSession;
};

const queued = surfaceWindow.__sharpeeTestingSurface?.q ?? [];
surfaceWindow.__sharpeeTestingSurface = {
  deliver,
  runLine: deliverRunLine,
  runExit: deliverRunExit,
};

cards.ensureLayout();
installDialogHooks();
// ⌘Z — undo the last authoring gesture (never inside a text field, where
// the field's own undo belongs to the field).
document.addEventListener('keydown', event => {
  if (!(event.metaKey || event.ctrlKey) || event.key !== 'z' || event.shiftKey) return;
  const target = event.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
  event.preventDefault();
  performUndo();
});
for (const record of queued) deliver(record);

const bootSession = surfaceWindow.__SHARPEE_TESTING_SESSION__;
policy = bootSession?.policy;
if (bootSession) {
  if (isComposite(bootSession.snapshot)) {
    void restoreComposite(bootSession.snapshot, bootSession.files ?? {});
  } else if ((bootSession.replay?.length ?? 0) > 0) {
    void restoreLinear(bootSession);
  }
}
