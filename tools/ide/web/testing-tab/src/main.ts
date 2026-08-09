/**
 * main.ts — the Testing tab's entry point.
 *
 * Purpose: owns the one model and the one surface, wires the host bridge to the
 *   fold and the fold to the views, and coalesces repaints. A run emits an event
 *   per command — a chain run emits over nine hundred — so every event schedules
 *   a repaint on the next animation frame rather than performing one, and a burst
 *   arriving in a single tick costs one render.
 *
 *   Selection follows the running transcript until the author clicks a row, at
 *   which point it stops following: a view that steals your selection while you
 *   are reading is a view you fight. It resumes on the next run, which is why
 *   this has no toggle — a control that re-arms itself every run only ever
 *   governs the run you are already watching. The view MODE, by contrast, never
 *   changes itself at all (ADR-301 D4): restored from the host, persisted back.
 *
 * Public interface: none — this module is the bundle's entry and runs on load.
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

import { installHost } from './host';
import {
  addAssertion,
  addCommand as addCommandTo,
  commandCount,
  deleteCommand as deleteCommandFrom,
  editCommand as editCommandIn,
  newTranscript,
  removeAssertion as removeAssertionFrom,
  reparent as reparentTo,
  saveOutlook,
  type Draft,
} from './grammar';
import { promotionFor } from './promote';
import {
  applyEvent,
  createModel,
  descendantCount,
  dismissRecordingChanges,
  stemOf,
  type RunModel,
  type TestNode,
} from './model';
import { byId } from './dom';
import {
  createSurface,
  render,
  renderPromoteSlot,
  type DocumentFace,
  type PendingPromotion,
  type ViewActions,
  type ViewMode,
} from './views';

let model: RunModel = createModel();
const surface = createSurface();
let framePending = false;

/**
 * The edit sent to the host and not yet answered for.
 *
 * Held here rather than on the surface because it is deliberately not rendered:
 * until the host says the write landed, the file on disk is still the old one,
 * and the source face must show what is on disk.
 */
let inFlightWrite:
  | {
      file: string;
      draft: Draft;
      label: string;
      before: string;
      popsUndo?: boolean;
      /**
       * A consequence the confirmation must carry — the R4 turn-count shift,
       * or a reparent's change of history. Carried on the write rather than
       * shown at attempt time, because a consequence that never reached disk
       * is not one.
       */
      warning?: string;
      /**
       * An assertion this write adds, for the new-and-untested marking (F2):
       * the command's input and the tag written on it. Folded into
       * `surface.freshClaims` only on confirmation — orange for a write that
       * never landed would be fiction.
       */
      freshClaim?: { input: string; tag: string };
    }
  | null = null;

/**
 * The open document's file text as it was before each edit, oldest first.
 *
 * Pushed only when a write is CONFIRMED, so an edit that never reached disk does
 * not leave a way back to a state that was never departed. Dropped whenever the
 * author leaves the document: it holds one file's history, and restoring it into
 * another would write one file's text over another's.
 */
let undoStack: string[] = [];

/**
 * Coalesces repaints: one render per frame however many events land in it.
 *
 * A timer races the animation frame because `requestAnimationFrame` does not
 * fire in a web view that is off screen — the tab sitting behind another tab,
 * or a headless one under test. Without the race a run would stream in
 * perfectly and paint nothing until the author looked at it. Whichever callback
 * arrives first clears the flag; the loser finds it already down and does nothing.
 */
function scheduleRender(): void {
  if (framePending) return;
  framePending = true;
  const paint = (): void => {
    if (!framePending) return;
    framePending = false;
    render(model, surface, actions);
  };
  requestAnimationFrame(paint);
  window.setTimeout(paint, 32);
}

/**
 * Keeps the selection on the running node while following, and gives the surface
 * a selection the first time there is anything to select.
 */
function trackRunning(): void {
  if (surface.opened) return;
  if (surface.follow && model.running) surface.selected = model.running;
  if (!surface.selected) surface.selected = model.roots[0] ?? null;
}

const actions: ViewActions = {
  select(node: TestNode) {
    surface.selected = node;
    // An explicit click is a decision to look at something; honour it for the
    // rest of the run rather than yanking the selection back on the next event.
    // Following resumes on the next run, which is why it needs no control.
    surface.follow = false;
    scheduleRender();
  },
  open(node: TestNode) {
    surface.opened = node;
    surface.selected = node;
    // Ask on open rather than on the switch to the source face: the answer is
    // what tells the author whether saving would rewrite the file, and finding
    // that out should not require going looking for it.
    loadSource(node.file);
    clearEditingState();
    scheduleRender();
  },
  back() {
    surface.opened = null;
    surface.source = null;
    surface.face = 'cards';
    clearEditingState();
    scheduleRender();
  },
  setMode(mode: ViewMode) {
    surface.mode = mode;
    surface.opened = null;
    surface.source = null;
    surface.face = 'cards';
    clearEditingState();
    host.persistMode(mode);
    scheduleRender();
  },
  setFace(face: DocumentFace) {
    surface.face = face;
    // A document opened before the file was readable, or reopened after an edit
    // elsewhere, gets another chance here rather than showing a stale answer.
    if (face === 'source' && surface.opened && surface.source?.file !== surface.opened.file) {
      loadSource(surface.opened.file);
    }
    scheduleRender();
  },
  openLocation(file: string, line: number) {
    host.openLocation(file, line);
  },
  promote() {
    const pending = surface.pending;
    if (!pending) return;
    // `pending.input` rides along as the targeting check: the card's line came
    // from the last run, and if the file has moved since, the grammar refuses
    // rather than landing the assertion on whatever sits at that line now.
    applyEdit(
      (text, file) =>
        addAssertion(text, file, pending.commandLine, pending.promotion.assertion, pending.input),
      pending.promotion.label,
      { freshClaim: { input: pending.input, tag: pending.promotion.label } },
    );
  },
  addCommand(input: string) {
    // Phase 6e: under an auto-assertion policy the command is written BARE —
    // the policy's trigger — where `[SKIP]` would mean deliberately
    // unasserted and the runner would never touch it.
    applyEdit(
      (text, file) => addCommandTo(text, file, input, surface.autoAssertionPolicy !== null),
      `> ${input}`,
    );
  },
  deleteCommand(commandLine: number) {
    const turn = surface.opened?.turns.find((candidate) => candidate.line === commandLine);
    applyEdit(
      (text, file) => deleteCommandFrom(text, file, commandLine, turn?.input),
      'the removal',
    );
  },
  beginCommandEdit(commandLine: number, current: string) {
    surface.commandEdit = { line: commandLine, draft: current };
    scheduleRender();
  },
  cancelCommandEdit() {
    surface.commandEdit = null;
    scheduleRender();
  },
  editCommand(commandLine: number, input: string) {
    const turn = surface.opened?.turns.find((candidate) => candidate.line === commandLine);
    surface.commandEdit = null;
    // Retyping a command to exactly what it already says is not an edit: writing
    // it anyway would normalize the file and stamp a "run again" note for a
    // change that never happened.
    if (turn && input.trim() === turn.input) {
      scheduleRender();
      return;
    }
    applyEdit(
      (text, file) => editCommandIn(text, file, commandLine, input, turn?.input),
      `> ${input.trim()}`,
    );
  },
  reparent(stem: string | null) {
    const node = surface.opened;
    if (!node) return;
    surface.reparentChoice = '';
    // The one-line edit with the largest semantic reach in the editor: the
    // file now runs from a different history, and so does everything beneath
    // it. The confirmation says so — the run that follows is what shows it.
    const below = descendantCount(node);
    const subtree =
      below > 0
        ? `It and the ${below} transcript${below === 1 ? '' : 's'} below it now run from a different history — their turn numbers and their assertions may no longer hold.`
        : 'It now runs from a different history — its turn numbers and its assertions may no longer hold.';
    applyEdit(
      (text, file) => reparentTo(text, file, stem),
      stem ? `continues: ${stem}` : 'the promotion to a root',
      { warning: subtree },
    );
  },
  newBranch(name: string) {
    const parent = surface.opened;
    if (!parent) return;
    // The editor owns `continues:` — the author typed a name, nothing more.
    const text = newTranscript({
      story: byId('story').textContent ?? '',
      title: name,
      continuesFrom: parent.stem,
    });
    surface.editNote = 'Creating…';
    host.createTranscript(name, text);
    scheduleRender();
  },
  setConfirmingTrash(confirming: boolean) {
    surface.confirmingTrash = confirming;
    scheduleRender();
  },
  trashOpenDocument() {
    const node = surface.opened;
    surface.confirmingTrash = false;
    if (!node) return;
    // A node with children is a parent: removing it orphans every transcript that
    // continues from it, and they would fail as a wall of ordinary-looking errors
    // rather than as the one thing that went wrong.
    if (node.children.length) {
      const count = node.children.length;
      surface.editNote = `${count} transcript${count === 1 ? '' : 's'} continue from ${node.stem}. Remove ${count === 1 ? 'it' : 'them'} first, or reparent ${count === 1 ? 'it' : 'them'}.`;
      scheduleRender();
      return;
    }
    host.trashTranscript(node.file);
  },
  removeAssertion(commandLine: number, index: number) {
    applyEdit((text, file) => removeAssertionFrom(text, file, commandLine, index), 'the removal');
  },
  assertWorldChange(commandLine: number, assertTrue: boolean, expression: string) {
    // R3: the chip already spelled the expression with the runner-picked
    // token, so this is an ordinary assertion write — same path, same undo,
    // same refusals as a promoted selection.
    const chipTurn = surface.opened?.turns.find((candidate) => candidate.line === commandLine);
    applyEdit(
      (text, file) =>
        addAssertion(text, file, commandLine, {
          type: 'state-assert',
          assertTrue,
          stateExpression: expression,
        }),
      `[STATE: ${assertTrue}, ${expression}]`,
      chipTurn
        ? { freshClaim: { input: chipTurn.input, tag: `[STATE: ${assertTrue}, ${expression}]` } }
        : {},
    );
  },
  setConfirmingRecord(confirming: boolean) {
    surface.confirmingRecord = confirming;
    scheduleRender();
  },
  recordGolden() {
    const node = surface.opened;
    surface.confirmingRecord = false;
    if (!node) return;
    // Recording is a run: the host launches the suite with just this node
    // blessed (--bless-file), the stream fills the tab like any run, and the
    // host re-reports `goldens` when the recording is on disk.
    surface.editNote = '';
    host.recordGolden(node.file);
    scheduleRender();
  },
  keepNewRecording() {
    const node = surface.opened;
    if (!node) return;
    // Nothing to write: the re-record already landed the new recording. The
    // review was the chance to read what changed; keeping it just closes it.
    dismissRecordingChanges(node);
    surface.editNote = 'The new recording stands — future runs replay against it.';
    scheduleRender();
  },
  restorePreviousRecording() {
    const node = surface.opened;
    if (!node) return;
    // The review stays on the page until the host confirms the bytes are
    // back — a restore that failed must not read as a restore that happened.
    surface.editNote = 'Restoring the previous recording…';
    host.restoreGolden(node.file);
    scheduleRender();
  },
  undo() {
    const previous = undoStack[undoStack.length - 1];
    if (previous === undefined) return;
    // The restored text goes through the same write path and the same outlook,
    // so an undo is an edit like any other — including in what it reports and in
    // what happens when the write is refused. The stack entry is popped only on
    // confirmation, by the same rule that put it there.
    applyEdit((_, file) => ({ text: previous, outlook: saveOutlook(previous, file) }), 'the undo', {
      popsUndo: true,
    });
  },
};

/**
 * Runs one edit against the open file and sends the result to the host.
 *
 * Every edit is the same three steps — build the new whole file, hold it out of
 * sight, ask the host to write it — so they share a path rather than each
 * repeating it. The differences between them live entirely in the callback.
 *
 * @param edit produces the new file from the current one
 * @param label how the edit is described back to the author once it lands
 * @param options `popsUndo` for an undo, which consumes a step back rather than
 *   creating one — the only edit that shortens the stack instead of growing it.
 *   `warning` is a consequence the caller knows and the count check cannot see
 *   (a reparent's change of history); it joins the confirmation the same way.
 */
function applyEdit(
  edit: (text: string, file: string) => Draft,
  label: string,
  options: { popsUndo?: boolean; warning?: string; freshClaim?: { input: string; tag: string } } = {},
): void {
  const loaded = surface.source;
  const node = surface.opened;
  if (!node || !loaded || loaded.text === null) return;

  try {
    const draft = edit(loaded.text, node.file);
    // The draft is held OUT of the surface until the host confirms the write.
    // Showing it first would tell the author the edit had landed while the file
    // on disk still said otherwise — and the source face is the one place that
    // must never disagree with disk.
    inFlightWrite = { file: node.file, draft, label, before: loaded.text, ...options };
    // R4: a parent's command count is a hidden input to every descendant's
    // turn numbers. If this edit changes the count and anything continues from
    // this file, the confirmation must say what it moved. Both counts read
    // through the runner's own parser; an unreadable side yields no warning
    // rather than a guessed one.
    const countBefore = commandCount(loaded.text, node.file);
    const countAfter = commandCount(draft.text, node.file);
    if (countBefore !== null && countAfter !== null && countBefore !== countAfter) {
      const below = descendantCount(node);
      if (below > 0) {
        inFlightWrite.warning = `This changed the file's turn count — ${below} transcript${below === 1 ? '' : 's'} continue${below === 1 ? 's' : ''} from it, and every turn-scheduled beat in ${below === 1 ? 'it' : 'them'} now falls on a different command.`;
      }
    }
    surface.pending = null;
    surface.editNote = 'Writing…';
    host.writeTranscript(node.file, draft.text);
  } catch (error) {
    // A refused edit is reported and nothing is sent. `addAssertion` refusing a
    // `[TODO]` command lands here, and the author reads the reason rather than
    // watching a click do nothing.
    surface.pending = null;
    surface.editNote = error instanceof Error ? error.message : String(error);
  }
  scheduleRender();
}

const host = installHost({
  onEvent(event) {
    applyEvent(model, event);
    trackRunning();
    scheduleRender();
  },
  onUndecodable(text) {
    // A line the wire does not vouch for is a contract breach, not noise: the
    // toolchain and the tab disagree, and saying so beats rendering a gap.
    surface.status = `Unreadable line from the test run — the toolchain may be newer than this IDE (${text.slice(0, 120)})`;
    scheduleRender();
  },
  onReset(story) {
    const discovered = [...model.nodes.values()]
      .filter((node) => node.status === 'pending')
      .map((node) => node.file);
    model = createModel();
    seedDiscovered(discovered);
    surface.opened = null;
    surface.selected = null;
    surface.follow = true;
    surface.status = '';
    byId('story').textContent = story;
    // The host's detach path announces "No story open" as if it were a story
    // (TestController's one sentinel on this wire); the surface holds null so
    // every gate downstream asks "is a story attached?" instead of matching
    // display text.
    surface.story = story === 'No story open' ? null : story;
    scheduleRender();
  },
  onStatus(text) {
    surface.status = text;
    scheduleRender();
  },
  onDiscovered(files) {
    seedDiscovered(files);
    trackRunning();
    scheduleRender();
  },
  onGoldens(files) {
    // Tier is a filesystem fact; the host owns it. Replaced whole, never
    // merged — a trashed recording must disappear from the surface too.
    surface.goldens = new Set(files);
    scheduleRender();
  },
  onRestoreMode(mode) {
    if (mode === 'column' || mode === 'list' || mode === 'documents') surface.mode = mode;
    scheduleRender();
  },
  onAutoAssertion(policy) {
    surface.autoAssertionPolicy = policy;
    // Reflected onto the body so the stored policy is OBSERVABLE — the Swift
    // real-path test reads it back through the live page, which is what pins
    // the host → bridge → handler hop end to end (Phase 6e).
    document.body.dataset.autoAssertionPolicy = policy ?? '';
    scheduleRender();
  },
  onFinished(ok) {
    model.inFlight = false;
    if (!ok && !surface.status) surface.status = 'The test run ended without completing its stream.';
    scheduleRender();
  },
  onSource(file, text) {
    // A late answer for a document the author has already left is dropped, not
    // rendered over whatever they are looking at now.
    if (surface.source?.file !== file) return;
    surface.source = { file, text, error: null, outlook: saveOutlook(text, file) };
    scheduleRender();
  },
  onSourceFailed(file, message) {
    if (surface.source?.file !== file) return;
    surface.source = { file, text: null, error: message, outlook: null };
    scheduleRender();
  },
  onSaved(file) {
    const write = inFlightWrite;
    inFlightWrite = null;
    if (!write || write.file !== file) return;
    surface.source = { file, text: write.draft.text, error: null, outlook: write.draft.outlook };
    // The way back is recorded only now, on confirmation — an edit that never
    // reached disk must not leave a way back to a state that was never left.
    if (write.popsUndo) undoStack.pop();
    else undoStack.push(write.before);
    // F2: the assertion is on disk, so it may now show as new-and-untested.
    if (write.freshClaim) {
      const tags = surface.freshClaims.get(write.freshClaim.input) ?? new Set<string>();
      tags.add(write.freshClaim.tag);
      surface.freshClaims.set(write.freshClaim.input, tags);
    }
    surface.undoDepth = undoStack.length;
    // The file has moved and the run has not. Source lines are how a turn finds
    // its assertions, so until the next run they can no longer be matched up.
    surface.runMatchesFile = false;
    // The cards below came from a run of the file as it was. Every turn after
    // the edited one is now describing a file that no longer exists in that
    // form, so say so rather than letting them quietly become fiction.
    surface.editNote = `Wrote ${write.label} — the run below predates this edit. Run again to see it evaluated.`;
    // The consequence rides the confirmation it belongs to: R4's turn-count
    // shift, or a reparent's change of history — whichever the write carried.
    if (write.warning) surface.editNote += ` ${write.warning}`;
    surface.commandDraft = '';
    scheduleRender();
  },
  onCreated(file) {
    // The suite has a new member. `setDiscovered` follows from the host, which is
    // what puts it in the tree; this only reports it and clears both create forms.
    surface.newBranchName = '';
    byId<HTMLInputElement>('newroot').value = '';
    noteCreation(`Created ${stemOf(file)}. Add its first command, then run.`);
    scheduleRender();
  },
  onCreateFailed(message) {
    noteCreation(message);
    scheduleRender();
  },
  onTrashed(file) {
    // The open document is that file, so there is nothing left to look at.
    if (surface.opened?.file === file) {
      surface.opened = null;
      surface.source = null;
      clearEditingState();
    }
    surface.status = `Moved ${stemOf(file)} to the Trash.`;
    scheduleRender();
  },
  onTrashFailed(file, message) {
    surface.editNote = `${stemOf(file)} was not removed. ${message}`;
    scheduleRender();
  },
  onSaveFailed(file, message) {
    const write = inFlightWrite;
    inFlightWrite = null;
    if (!write || write.file !== file) return;
    // The surface is untouched: the file on disk is what it was, and that is
    // exactly what the source face is still showing.
    surface.editNote = `The assertion was not written. ${message}`;
    scheduleRender();
  },
  onGoldenRestored(file) {
    // The review closes only now, on confirmation. The last run's outputs
    // still diverge from the restored baseline, and the note says what that
    // means rather than letting the next red run look like a new surprise.
    const node = model.nodes.get(file);
    if (node) dismissRecordingChanges(node);
    if (surface.opened?.file === file) {
      surface.editNote =
        'The previous recording was restored — the next run replays against it, and stays red until the story matches it again.';
    }
    scheduleRender();
  },
  onGoldenRestoreFailed(file, message) {
    // The review stays: the new recording is still the one on disk.
    surface.editNote = `${stemOf(file)}'s previous recording was not restored. ${message}`;
    scheduleRender();
  },
});

/**
 * Asks the host for a transcript's text and marks the request in flight.
 *
 * The in-flight record carries the file, which is what lets a late answer for a
 * document the author has already closed be recognised and dropped.
 */
function loadSource(file: string): void {
  surface.source = { file, text: null, error: null, outlook: null };
  host.requestSource(file);
}

/**
 * Drops the offer and the last edit's note when the author leaves a document.
 *
 * Both are about one file. Carrying either to the next document would show an
 * offer for a command that is not on screen, or claim an edit to a file the
 * author is no longer looking at.
 */
function clearEditingState(): void {
  surface.pending = null;
  surface.editNote = '';
  surface.commandDraft = '';
  surface.commandEdit = null;
  surface.undoDepth = 0;
  surface.runMatchesFile = true;
  surface.newBranchName = '';
  surface.reparentChoice = '';
  surface.confirmingTrash = false;
  surface.confirmingRecord = false;
  surface.freshClaims = new Map();
  undoStack = [];
  inFlightWrite = null;
}

/**
 * Puts the transcripts found on disk into the model as `pending` nodes, so the
 * tab shows the suite before it has ever been run.
 *
 * Parentage is unknown here — `continues:` is resolved by the tree assembler at
 * run time, not by looking at filenames — so every discovered transcript starts
 * as a root and is re-parented by the first `transcript-start` that names it.
 */
function seedDiscovered(files: string[]): void {
  for (const file of files) {
    if (model.nodes.has(file)) continue;
    const node: TestNode = {
      file,
      stem: stemOf(file),
      parent: null,
      children: [],
      status: 'pending',
      replays: 0,
      turns: [],
      passed: 0,
      failed: 0,
      expectedFailures: 0,
      skipped: 0,
      duration: 0,
      blockedBy: null,
      index: model.nodes.size,
    };
    model.nodes.set(file, node);
    model.roots.push(node);
  }
}

/**
 * Watches for a selection inside one turn's output and offers the assertion it
 * earns.
 *
 * Bound to `selectionchange` on the document rather than to each `<pre>`, because
 * the turns are re-rendered on every event of a live run and per-element
 * listeners would be rebound hundreds of times.
 *
 * A selection that starts in one turn and ends in another is refused rather than
 * clamped: it is not a claim about either command, and silently asserting half
 * of what was dragged over would be the editor making a claim the author did not.
 */
function installSelectionWatcher(): void {
  document.addEventListener('selectionchange', () => {
    const next = selectionPromotion();
    // Cheap identity check — this fires on every caret move.
    const same =
      next?.commandLine === surface.pending?.commandLine &&
      next?.promotion.label === surface.pending?.promotion.label;
    if (same) return;
    surface.pending = next;
    // Patch the offer slot ONLY — never a document render from here. A render
    // rebuilds the turns subtree, and replacing the nodes the selection
    // anchors in collapses it mid-drag (F3): the author could never finish
    // the very gesture the offer answers.
    renderPromoteSlot(surface, actions);
  });
}

/** The pending promotion for the current selection, or null if there is none. */
function selectionPromotion(): PendingPromotion | null {
  if (!surface.opened || surface.face !== 'cards') return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  // The selected text is read from the RANGE, not from `selection.toString()`.
  // They agree while the page has focus and diverge when it does not: WebKit
  // keeps the range but returns an empty string for the selection in an
  // unfocused web view. The range is the authoritative source in both cases, so
  // reading it is both more correct and what makes this reachable from a test
  // driving an off-screen view.
  const range = selection.getRangeAt(0);
  if (range.collapsed) return null;

  const output = outputElementFor(range.startContainer);
  if (!output || output !== outputElementFor(range.endContainer)) return null;

  const commandLine = Number(output.dataset.commandLine);
  const turn = surface.opened.turns.find((candidate) => candidate.line === commandLine);
  if (!turn || turn.actualOutput === undefined) return null;

  const promotion = promotionFor(turn.actualOutput, range.toString());
  if (!promotion) return null;
  return { commandLine, input: turn.input, promotion };
}

/** The `.actual` block a node sits inside, or null if it is not in one. */
function outputElementFor(node: Node | null): HTMLElement | null {
  const start = node instanceof Element ? node : node?.parentElement ?? null;
  return start?.closest<HTMLElement>('#docview .turn .actual[data-command-line]') ?? null;
}

/**
 * Where a create's answer lands: the open document's edit note, or the browse
 * surface's status line. The host answers `created`/`createFailed` without
 * saying which surface asked, and a confirmation rendered only inside a
 * document is invisible to the browse-mode create that needs it most (D1).
 */
function noteCreation(message: string): void {
  if (surface.opened) surface.editNote = message;
  else surface.status = message;
}

/**
 * Creates a ROOT transcript — the browse surface's create, and the only way to
 * make an empty suite's first file (phase-6 log, D1). A root carries no
 * `continues:`; the host decides the path (ADR-290 D8). The name comes in from
 * the static `#newroot` field, already trimmed and non-empty.
 */
function createRootTranscript(name: string): void {
  const text = newTranscript({
    story: surface.story ?? '',
    title: name,
    continuesFrom: null,
  });
  noteCreation('Creating…');
  host.createTranscript(name, text);
  scheduleRender();
}

/**
 * Wires the New-transcript bar once, statically — like Run and Cancel, and
 * unlike the re-rendered document bars: the field keeps its own value, so a
 * render storm from a live run never clobbers what the author is typing.
 */
function installNewTranscriptBar(): void {
  const field = byId<HTMLInputElement>('newroot');
  const create = (): void => {
    const name = field.value.trim();
    if (!name) return;
    createRootTranscript(name);
  };
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      create();
    }
  });
  byId('newroot-create').addEventListener('click', create);
}

function installToolbar(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => actions.setMode(button.dataset.mode as ViewMode));
  });
  byId('run').addEventListener('click', () => host.run());
  byId('cancel').addEventListener('click', () => host.cancel());
  // Escape leaves the document view — the one gesture that has no button of its
  // own on screen while a document fills the pane.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && surface.opened) actions.back();
  });
}

installToolbar();
installNewTranscriptBar();
installSelectionWatcher();
render(model, surface, actions);
host.ready();
