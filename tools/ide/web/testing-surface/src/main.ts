/**
 * main.ts — the testing play surface's entry point (ADR-307: the tree is the
 * model, the document is its projection).
 *
 * Purpose: wires the pieces together inside the testing page. The IDE's
 *   document-start shim queues turn-feed records the Swift side forwards
 *   (`window.__sharpeeTestingSurface.deliver`); this module drains that
 *   queue, folds records into the TreeSessionModel (always recording, D3),
 *   builds cards, renders, and posts every change over the `testingSurface`
 *   bridge: the WHOLE serialized document on every mutation (D1 — files are
 *   a projection), and a view-state-only sidecar (D7 — active line and
 *   dialog outcomes; nothing the tree can re-derive).
 *
 * It is also the REPLAY DRIVER (D4/D5): the session IS a replay of the tree.
 *   - Reopen deserializes `<story-id>.tests.json` and replays it to the
 *     board: the main line types live (delivered turns BIND to the
 *     document's cards), each branch fresh-boots with its prefix suppressed,
 *     the persisted active line replays last. A refused (newer-version)
 *     document shows its named message and write-locks the session; a
 *     malformed one degrades to a fresh empty tree (AC-4).
 *   - An author restart replays the tree the same way — restart has no
 *     meaning of its own in the Testing tab (D4).
 *   - Branch, chip selection, branch-delete, and tail-cut all ride the same
 *     fresh-boot primitive at the pinned seed; tail-cut realigns the engine
 *     by replaying the cut line (suppressed — its cards are retained).
 *   - Save/restore dialogs never stall a replay: outcomes are recorded as
 *     the author plays and re-applied when a replayed command opens its
 *     dialog; an outcome-less dialog is cancelled.
 *
 * Public interface: none — the bundle is self-executing inside the page.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { DEFAULT_AUTO_ASSERTION_POLICY, proseTextLinesOf } from '@sharpee/branch-tester/auto-assertion';
import type { AutoAssertionPolicy } from '@sharpee/branch-tester/types';
import { deserializeTreeDocument } from '@sharpee/branch-tester/tree-document';
import { CardsView } from './cards';
import {
  cardAssertionLines, openingDefaultClaims, recordedTurnAssertions,
  type DeleteRef, type TurnSource,
} from './compose';
import { MAIN_LINE, TreeSessionModel, type AuthoringMemento } from './model';
import { showListPicker, showStatePicker, type StateFact } from './picker';
import { beginRun, createRunState, finishRun, foldRunLine, resetRun } from './run';

/** One world-digest entity as the feed carries it. */
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

/** A recorded dialog interaction, keyed to its turn (D7). */
interface DialogOutcome {
  type: 'save' | 'restore';
  /** The confirmed slot name; null = the author cancelled. */
  slot: string | null;
}

/** The boot globals the IDE injects: the tree document's text, the story's
 *  `auto-assertion:` policy, and the D7 view-state sidecar. */
interface BootSession {
  /** The `<story-id>.tests.json` bytes, when one exists. */
  document?: string;
  policy?: AutoAssertionPolicy;
  /** View-state ephemera (D7): active line id, dialog outcomes, and
   *  collapsed region-group keys. */
  view?: {
    active?: number;
    dialogs?: [string, DialogOutcome][];
    collapsed?: string[];
  };
  /** The story id (the document's `story` field for a fresh tree). */
  story?: string;
  /** The pinned master seed (D5). */
  seed?: number;
  /** Room name → region name, derived from the Story IR (regions group the
   *  cards — David 2026-08-10; derived, never persisted in the document). */
  regions?: Record<string, string>;
}

interface DeliverShim {
  q?: unknown[];
  deliver(record: unknown): void;
  /** One raw NDJSON line of a `sharpee test --tree --json` run. */
  runLine?(text: string): void;
  /** The run process exited; `ok` false with no run-end is a pipeline death. */
  runExit?(ok: boolean, note?: string): void;
}

/** A command to type during replay, keyed for dialog outcome lookup. */
interface ReplayStep { command: string; key: string }

const surfaceWindow = window as unknown as {
  __sharpeeTestingSurface?: DeliverShim;
  __SHARPEE_TESTING_SESSION__?: BootSession;
};

const bootSession = surfaceWindow.__SHARPEE_TESTING_SESSION__;
const storyId = bootSession?.story ?? 'story';
const seed = bootSession?.seed ?? 42;
/** The story's declared `auto-assertion:` policy, injected by the IDE at
 *  boot; absent = the PLATFORM default (David 2026-08-10) — the same
 *  constant the CLI walker applies, so both consumers synthesize alike. */
const policy: AutoAssertionPolicy = bootSession?.policy ?? DEFAULT_AUTO_ASSERTION_POLICY;

const model = new TreeSessionModel(storyId, seed);

/** Every delivered record by ordinal — synthesis and pickers read these. */
const records = new Map<number, FeedRecord>();
/** The BOOT's channel captures — the opening defaults' carrier (question D). */
let bootCaptures: Record<string, unknown[]> | undefined;
/** The boot record's delivery ordinal — the opening's channel picker reads
 *  its captures (the opening itself has no record). */
let bootRecordOrdinal: number | undefined;
/** Room name → region name (Story IR, injected at boot) — card grouping. */
const regionByRoom: Record<string, string> = bootSession?.regions ?? {};
/** Collapsed region-group keys (view-state ephemera, D7). */
const collapsedRegions = new Set<string>(bootSession?.view?.collapsed ?? []);

/** The line newly delivered visible turns fold into. */
let currentLine = MAIN_LINE;
/** Recorded dialog outcomes by `line:turnIndex` (D7). */
let dialogOutcomes = new Map<string, DialogOutcome>();

// ── driver flags (the deliver pipeline reads these) ───────────────────────

/** Swallow ordinary records until the driver's fence arrives (restart ack). */
let dropBeforeFence = false;
/** The next fence is a driver fork/switch boot — never an author fence. */
let expectDriverFence = false;
/** Swallow records entirely (replayed prefix turns — cards already exist). */
let suppressDelivery = false;
/** A driver replay is in flight (fork, switch, restore, or realign). */
let replayActive = false;
/** The whole driver operation spans this — while set, nothing posts (a
 *  partial mid-replay state must never overwrite the persisted document),
 *  and the input stays held. */
let driverBusy = false;
/** The outcome key armed for the command currently being typed. */
let armedOutcomeKey: string | null = null;
/** The document on disk is NEWER than this build reads — never write (AC-4). */
let documentWriteLocked = false;
/** The last document text this session posted (or adopted at load). */
let lastDocumentText = '';

/** Per-ordinal synthesis source for compose. */
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

/** The card's assertion lines — the document's claims, verbatim. */
function assertionLinesFor(ordinal: number) {
  return cardAssertionLines({ model }, ordinal);
}

/** Maps a rendered line's DeleteRef onto the model mutator it names —
 *  deletion semantics live in the model, never re-derived here. Every claim
 *  is an ordinary document assertion (JSON = source of truth). */
function removeAssertion(del: DeleteRef): void {
  switch (del.kind) {
    case 'contains': model.removeContains(del.ordinal, del.index); break;
    case 'notContains': model.removeNotContains(del.ordinal, del.index); break;
    case 'state': model.removeState(del.ordinal, del.index); break;
    case 'event': model.removeEvent(del.ordinal, del.index); break;
    case 'channel': model.removeChannel(del.ordinal, del.index); break;
    case 'exact': model.setExact(del.ordinal, null); break;
  }
}

// ── undo: authoring gestures are undoable ─────────────────────────────────
//
// The stack holds authoring mementos — card assertions only, never played
// turns. Gestures that change what was PLAYED (branch, tail-cut,
// branch-delete, line switch, restart) clear it instead of joining it: a
// memento must never refer to cards whose turns are gone (D4/Q-4).
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
  update();
}

const cards = new CardsView(model, {
  onTailCut(ordinal) {
    void performTailCut(ordinal);
  },
  onDeleteBranch(lineId) {
    void performDeleteBranch(lineId);
  },
  onAddContains(ordinal, text) {
    pushUndo();
    if (model.addContains(ordinal, text)) update();
  },
  onNotContains(ordinal, text) {
    pushUndo();
    if (model.addNotContains(ordinal, text)) update();
  },
  onToggleExact(ordinal) {
    pushUndo();
    const exact = model.claimsOf(ordinal)?.exact;
    if (exact !== undefined) {
      model.setExact(ordinal, null);
    } else {
      const output = records.get(ordinal)?.output ?? '';
      model.setExact(ordinal, output.replace(/\s+$/, '').split('\n'));
    }
    update();
  },
  onStatePicker(ordinal, anchor) {
    // The unseen slice: entity locations from the digest — never
    // player.location, and only expressions the runner's evaluator accepts.
    const entities = records.get(ordinal)?.world?.entities ?? [];
    const facts: StateFact[] = entities.map(entity => ({
      label: `${entity.name} — ${entity.location.name}`,
      expression: `${entity.token}.location = ${entity.location.token}`,
      kind: entity.kind === 'npc' ? 'NPC locations' : 'item locations',
    }));
    showStatePicker(anchor, facts, fact => {
      pushUndo();
      if (model.addState(ordinal, fact.expression)) update();
    });
  },
  onEventPicker(ordinal, anchor) {
    const events = records.get(ordinal)?.events ?? [];
    showListPicker(anchor, 'events this turn emitted', events, event => {
      pushUndo();
      if (model.addEvent(ordinal, event)) update();
    });
  },
  onChannelPicker(ordinal, anchor) {
    // The OPENING (ordinal 0) has no record of its own — its channels are
    // the boot flush, riding the boot record's captures.
    const source = ordinal === 0 && bootRecordOrdinal !== undefined
      ? records.get(bootRecordOrdinal)
      : records.get(ordinal);
    const captures = source?.captures ?? [];
    const labels = captures.map(capture => {
      const flat = proseTextLinesOf(capture.values).join(' ');
      const scalar = capture.values.length === 1 && typeof capture.values[0] !== 'object'
        ? String(capture.values[0]) : null;
      return `${capture.channel} — ${scalar ?? `"${flat.slice(0, 40)}"`}`;
    });
    showListPicker(anchor, 'channels this turn captured', labels, (_label, index) => {
      const capture = captures[index];
      if (!capture) return;
      const flat = proseTextLinesOf(capture.values).join(' ');
      // The document's channel claims are strings (`is` a string value) —
      // scalars flatten to their rendering.
      const scalar = capture.values.length === 1
        && (typeof capture.values[0] === 'number' || typeof capture.values[0] === 'boolean')
        ? String(capture.values[0]) : null;
      const claim = scalar !== null
        ? { id: capture.channel, is: scalar }
        : { id: capture.channel, contains: [flat.slice(0, 60)] };
      pushUndo();
      if (model.addChannel(ordinal, claim)) update();
    });
  },
  onBranch(ordinal, command) {
    void performBranch(ordinal, command);
  },
  onSelectLine(lineId) {
    void selectLine(lineId);
  },
  onRun() {
    // One run at a time, and never during a driver replay — the run reads
    // the document on disk, which a mid-replay session hasn't finished
    // writing.
    if (runState.inFlight || driverBusy || replayActive) return;
    beginRun(runState);
    cards.render();
    postToBridge({ run: true });
  },
  runColumn: () => runState,
  assertionLines: assertionLinesFor,
  onRemoveAssertion(del) {
    pushUndo();
    removeAssertion(del);
    update();
  },
  // Region grouping (David 2026-08-10): derived from the Story IR's map,
  // collapse state is D7 view ephemera — nothing touches the document.
  regionOf: (room) => (room !== undefined ? regionByRoom[room] : undefined),
  isRegionCollapsed: (key) => collapsedRegions.has(key),
  onToggleRegion(key) {
    if (collapsedRegions.has(key)) collapsedRegions.delete(key);
    else collapsedRegions.add(key);
    postState();
    cards.render();
  },
});

// ── the run column: fold the relayed NDJSON stream ────────────────────────

const runState = createRunState();

function deliverRunLine(text: string): void {
  foldRunLine(runState, text);
  cards.render();
}

function deliverRunExit(ok: boolean, note?: string): void {
  finishRun(runState, ok, note);
  cards.render();
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
 * Re-render and persist: every model change posts the WHOLE document (D1 —
 * one write target, no per-file tracking) and the view-state sidecar (D7).
 * A change to the suite resets the run column — its results describe a tree
 * that no longer exists. A refused document write-locks the session (AC-4:
 * an older writer must never clobber a newer document).
 */
function update(): void {
  if (!driverBusy) {
    const text = model.serialize();
    if (text !== lastDocumentText) {
      lastDocumentText = text;
      if (!documentWriteLocked) postToBridge({ document: { text } });
      if (!runState.inFlight) resetRun(runState);
    }
    cards.render();
    postState();
  } else {
    cards.render();
  }
}

/** Posts the view-state sidecar (D7): active line, dialog outcomes, and
 *  collapsed region groups — session ephemera only; everything else lives
 *  in the document. */
function postState(): void {
  postToBridge({
    state: {
      active: model.activeLine,
      dialogs: [...dialogOutcomes],
      collapsed: [...collapsedRegions],
    },
  });
}

// ── dialogs (D7): record as the author plays, drive under replay ──────────

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
  // outcome, or cancel — either way the turn completes (no stall).
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

/** True until the next record, which is a boot's automatic first look. */
let expectBoot = true;
/** The last folded record's ordinal — the restart-ack strip reads it. */
let lastDeliveredOrdinal: number | undefined;
/** Resolvers waiting on the next delivered turn (the replay driver). */
let nextTurnWaiters: (() => void)[] = [];
/** Resolvers waiting on the next restart fence (the replay driver). */
let fenceWaiters: (() => void)[] = [];

/** The room after this turn, from the `room-name` capture. */
function roomOf(record: FeedRecord): string | undefined {
  const capture = (record.captures ?? [])
    .filter(c => c.channel === 'room-name')
    .at(-1);
  return proseTextLinesOf(capture?.values).at(-1);
}

/** Structured captures of a record, keyed by channel id. */
function capturesOf(record: FeedRecord): Record<string, unknown[]> {
  const values: Record<string, unknown[]> = {};
  for (const capture of record.captures ?? []) {
    values[capture.channel] = [...(values[capture.channel] ?? []), ...capture.values];
  }
  return values;
}

function deliver(raw: unknown): void {
  const record = raw as FeedRecord;
  if (!record || typeof record.turn !== 'number') return;

  if (record.restart === true) {
    dropBeforeFence = false;
    if (expectDriverFence) {
      // A driver fork/switch boot — a fresh line, never a dead session.
      expectDriverFence = false;
      expectBoot = true;
      const waiters = fenceWaiters;
      fenceWaiters = [];
      for (const resolve of waiters) resolve();
      return;
    }
    // An AUTHOR restart: the session IS a replay of the tree (D4 — restart
    // has no meaning of its own). The board clears, the document does not;
    // the tree replays onto the rebooted engine. The client's ack turn
    // ("the story restarts") landed as a card just before this fence — it
    // is the restart mechanics, not a recorded turn: strip it.
    if (lastDeliveredOrdinal !== undefined
        && records.get(lastDeliveredOrdinal)?.command === 'restart') {
      model.spliceOut(lastDeliveredOrdinal);
    }
    const activeBefore = model.activeLine;
    cards.clear();
    clearUndo();
    records.clear();
    model.beginRebindAll();
    model.activateLine(MAIN_LINE);
    currentLine = MAIN_LINE;
    expectBoot = true;
    pendingDialogOutcome = null;
    bootCaptures = undefined;
    bootRecordOrdinal = undefined;
    update();
    void replayTree(activeBefore);
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
  lastDeliveredOrdinal = record.turn;
  if (boot && currentLine === MAIN_LINE) {
    bootCaptures = capturesOf(record);
    bootRecordOrdinal = record.turn;
  }
  const room = roomOf(record);
  model.activateLine(currentLine);
  // Record-time synthesis (David 2026-08-10: the JSON is the source of
  // truth): the effective policy reads THIS turn's real captures and what it
  // says persists into the card. The model applies these only when the
  // delivery APPENDS — a binding replay rebuilds state, never claims.
  const recorded = recordedTurnAssertions(policy, turnSource(record.turn));
  const openingClaims =
    boot && currentLine === MAIN_LINE ? openingDefaultClaims(policy, bootCaptures) : [];
  model.addTurn({
    ordinal: record.turn,
    command: record.command ?? '',
    boot,
    ...(room !== undefined ? { room } : {}),
    ...(recorded.assertions !== undefined ? { assertions: recorded.assertions } : {}),
    ...(recorded.skip === true ? { skip: true } : {}),
    ...(openingClaims.length > 0
      ? { openingAssertions: { channels: openingClaims } }
      : {}),
  });
  if (pendingDialogOutcome) {
    const at = model.turnIndexOf(record.turn);
    if (at) dialogOutcomes.set(`${at.lineId}:${at.index}`, pendingDialogOutcome);
    pendingDialogOutcome = null;
  }
  cards.addTurnCard(record.turn, boot, currentLine !== MAIN_LINE);
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

// ── the replay driver (D4/D5) ─────────────────────────────────────────────

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

/** A line's full path as replay steps, keyed `line:turnIndex` so recorded
 *  dialog outcomes re-apply wherever their command replays. */
function pathSteps(lineId: number): ReplayStep[] {
  return model.pathStepsOf(lineId).map(step => ({
    command: step.command,
    key: `${step.lineId}:${step.index}`,
  }));
}

/** The path steps BEFORE the line's own cards — a branch replay's prefix. */
function prefixSteps(lineId: number): ReplayStep[] {
  const prefixLength = model.prefixCommandsOf(lineId).length;
  return pathSteps(lineId).slice(0, prefixLength);
}

/**
 * The fresh-boot primitive every fork, switch, restore branch, and realign
 * rides: storage-clean in-page restart (the fence arrives flagged as the
 * driver's, so nothing clears), the boot look and `replay` steps suppressed
 * (their cards exist), then `live` steps typed visibly into `line`. Returns
 * false when a turn never arrived — the caller's state stays honest
 * (degraded, never an error).
 */
async function driveFreshBoot(
  line: number,
  replay: ReplayStep[],
  live: ReplayStep[],
): Promise<boolean> {
  const wasBusy = driverBusy;
  driverBusy = true;
  replayActive = true;
  setInputHeld(true, 'replaying…');
  try {
    localStorage.clear();       // fresh boots are storage-clean
    dropBeforeFence = true;
    expectDriverFence = true;
    // Pre-announce: the Swift side marks the coming fence as a driver boot,
    // so its own bookkeeping never mistakes it for an author restart.
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
    currentLine = line;
    model.activateLine(line);
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

/** Branch… (D2/D5): the card's gesture means "try a different command FROM
 *  this state" — the fork lives ON the card. Fork the model, then boot the
 *  branch live. */
async function performBranch(ordinal: number, command: string): Promise<void> {
  if (replayActive || driverBusy) return;
  clearUndo();
  const id = model.branch(ordinal, command);
  if (id === null) return;
  currentLine = id;
  update();                     // the pending chip shows immediately
  await driveFreshBoot(id, prefixSteps(id), [{ command, key: `${id}:0` }]);
}

/** Chip selection: the viewed line is always the live line — replay the
 *  sibling live (all suppressed — its cards are retained), then show. */
async function selectLine(lineId: number): Promise<void> {
  if (replayActive || driverBusy || lineId === model.activeLine) return;
  if (!model.activateLine(lineId)) return;
  clearUndo();
  currentLine = lineId;
  update();                     // the view switches on retained cards
  await driveFreshBoot(lineId, pathSteps(lineId), []);
}

/** Chip ✕: the branch, its descendants, and their cards go. Deleting the
 *  VIEWED branch replays its parent live — the view is always the live
 *  line. Not on the ⌘Z stack: it changes what was played. */
async function performDeleteBranch(lineId: number): Promise<void> {
  if (replayActive || driverBusy) return;
  const result = model.deleteBranch(lineId);
  if (result === null) return;
  clearUndo();
  currentLine = model.activeLine;
  update();                     // chips/cards/document reconcile immediately
  if (result.wasActive) {
    // The dead branch was live on the engine — replay the surviving parent.
    await driveFreshBoot(result.parentLine, pathSteps(result.parentLine), []);
  }
}

/** Card ✕ (D4/Q-4): tail-cut — the turn and everything after it, branches
 *  included. The engine holds post-cut state, so the surviving line replays
 *  (suppressed — its cards are retained) to realign. Clears ⌘Z. */
async function performTailCut(ordinal: number): Promise<void> {
  if (replayActive || driverBusy) return;
  const result = model.tailCut(ordinal);
  if (result === null) return;
  clearUndo();
  currentLine = model.activeLine;
  update();                     // the cut cards leave the board immediately
  await driveFreshBoot(model.activeLine, pathSteps(model.activeLine), []);
}

// ── restore on boot / after an author restart ─────────────────────────────

/**
 * Replays the whole tree onto a booting engine: the main line types live
 * (delivered turns bind to the document's cards), each branch line
 * fresh-boots with its prefix suppressed and its own cards typed live, and
 * the target active line replays last so it ends up live. Any step that
 * fails leaves what landed — degraded, never an error.
 */
async function replayTree(activeTarget: number): Promise<void> {
  driverBusy = true;
  replayActive = true;
  setInputHeld(true, 'restoring session…');
  try {
    currentLine = MAIN_LINE;
    model.activateLine(MAIN_LINE);
    // The root's boot look plays itself — wait for it unless it already
    // arrived (drained queue, or the fence's reboot landing first).
    if (!model.hasOpening) await awaitNextTurn(15_000);
    let intact = true;
    const mainCommands = model.ownCommandsOf(MAIN_LINE);
    for (const [index, command] of mainCommands.entries()) {
      armedOutcomeKey = `${MAIN_LINE}:${index}`;
      typeCommand(command);
      const landed = await awaitNextTurn(15_000);
      armedOutcomeKey = null;
      if (!landed) { intact = false; break; }
    }
    replayActive = false;

    if (intact) {
      for (const lineId of model.lineIds()) {
        if (lineId === MAIN_LINE) continue;
        const own = model.ownCommandsOf(lineId);
        if (own.length === 0) continue;
        const ownSteps = own.map((command, index) => ({
          command,
          key: `${lineId}:${index}`,
        }));
        if (!(await driveFreshBoot(lineId, prefixSteps(lineId), ownSteps))) break;
      }

      // The active line replays last — view is live.
      if (model.lineIds().includes(activeTarget) && activeTarget !== currentLine) {
        model.activateLine(activeTarget);
        await driveFreshBoot(activeTarget, pathSteps(activeTarget), []);
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

// ── boot ──────────────────────────────────────────────────────────────────

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

// Adopt the persisted document BEFORE draining the queue, so the boot look
// binds to the document's cards rather than appending fresh ones.
let loadedDocument = false;
if (bootSession?.document !== undefined) {
  const read = deserializeTreeDocument(bootSession.document);
  if (read.status === 'ok') {
    model.load(read.document);
    lastDocumentText = model.serialize();
    dialogOutcomes = new Map(bootSession.view?.dialogs ?? []);
    loadedDocument = true;
  } else if (read.status === 'refused') {
    // AC-4: a newer document is refused BY NAME and never written — the
    // session works as a scratch board over a fresh tree.
    documentWriteLocked = true;
    cards.setNotice(read.message);
  }
  // Malformed: the model already holds a fresh empty tree — degrade quietly.
}

for (const record of queued) deliver(record);

if (loadedDocument && model.document.cards.length > 0) {
  void replayTree(bootSession?.view?.active ?? MAIN_LINE);
}
