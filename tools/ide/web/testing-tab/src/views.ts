/**
 * views.ts — the three view modes, the preview, and the document reading surface.
 *
 * Purpose: renders a {@link RunModel} into the tab's markup. Each mode serves one
 *   shape of suite (ADR-301 D3): **Column** is Miller columns for a fan — one
 *   column per level of the selected path, ancestors sliding left as you descend,
 *   with a preview pane last; **List** is the whole tree in order for a chain;
 *   **Documents** is a grid of transcripts as files, which is also the surface a
 *   machine-proposed path is accepted or discarded on (D5). All three render the
 *   same selection and switching preserves it; the mode never changes itself (D4).
 *
 *   The subtree-failure badge on a parent row is required, not decoration (D2):
 *   Column shows only the selected path, so a failure in an unexplored branch has
 *   nowhere else to appear.
 *
 * Public interface: ViewMode, Surface, ViewActions, createSurface, render,
 * renderPromoteSlot (the selection watcher's render-free patch, F3).
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

import { byId, el } from './dom';
import { assertionsByCommandLine, parse, type SaveOutlook, type WrittenAssertion } from './grammar';
import type { Promotion } from './promote';
import {
  ancestry,
  recordingChanges,
  reparentCandidates,
  storyEnd,
  subtreeFailureCount,
  stemOf,
  worldBefore,
  worldDelta,
  type RunModel,
  type StoryEnd,
  type TestNode,
  type Turn,
  type WorldDelta,
} from './model';

/** The three modes. Column is the default (D4). */
export type ViewMode = 'column' | 'list' | 'documents';

/**
 * What an open document shows: the turns the run produced, or the file itself.
 *
 * The source face is not a debugging aid. Saving re-emits the whole file from
 * the parsed model, so it can reformat lines the author never touched; showing
 * what the serializer would write is what keeps that from arriving as a surprise
 * in a diff (ADR-301's "the generated source is visible").
 */
export type DocumentFace = 'cards' | 'source';

/** A transcript's text as the host last read it off disk. */
export interface LoadedSource {
  /** Absolute path, matched against the open node before rendering. */
  file: string;
  /** The file's text, or null while the request is in flight. */
  text: string | null;
  /** Why the host could not read it, when it could not. */
  error: string | null;
  /** What a save would do to this file. Null while the text is still in flight. */
  outlook: SaveOutlook | null;
}

/** What the author is looking at — the state the model does not own. */
export interface Surface {
  mode: ViewMode;
  /** The node every mode agrees is selected. */
  selected: TestNode | null;
  /** The node open as a document, or null for the mode's own pane. */
  opened: TestNode | null;
  /** Which face of the open document is showing. */
  face: DocumentFace;
  /** The open document's file, once the host has answered `requestSource`. */
  source: LoadedSource | null;
  /** Selection tracks the running node until the author clicks a row. */
  follow: boolean;
  /** A pipeline failure or host note; never silently blank. */
  status: string;
  /** The assertion the author's current selection would write, if any. */
  pending: PendingPromotion | null;
  /**
   * What is typed but not yet added in the command field.
   *
   * On the surface rather than left in the DOM because the document is rebuilt on
   * every run event — a live run emits hundreds — and a field whose contents are
   * only in the element would be erased mid-word.
   */
  commandDraft: string;
  /**
   * The command being retyped in place, or null when none is.
   *
   * On the surface for the same reason as {@link commandDraft}: the document is
   * rebuilt on every run event, and an edit that lived only in the DOM would be
   * erased mid-word. `line` is the command's source line — the identity every
   * other edit already uses — and `draft` is what the author has typed so far.
   */
  commandEdit: { line: number; draft: string } | null;
  /**
   * How many edits to this document can still be taken back.
   *
   * Rendered rather than the stack itself, because the surface only needs to know
   * whether to offer Undo and how deep it goes — the texts it would restore are
   * not something a view has any business holding.
   */
  undoDepth: number;
  /**
   * False once an edit has landed and before the next run.
   *
   * A turn's assertions are joined to it by SOURCE LINE, and an edit moves lines.
   * So between a write and the next run the file's claims can no longer be
   * trusted against the run's turns, and showing them anyway would put one
   * command's assertions under another's output. They are hidden instead, which
   * is the same thing the edit note already says in words.
   */
  runMatchesFile: boolean;
  /** What is typed but not yet created in the new-branch field. */
  newBranchName: string;
  /**
   * The parent picked in the reparent control and not yet applied. `''` when
   * nothing is picked; the stem otherwise, with `'<root>'` standing for "no
   * parent". On the surface for the usual reason: the document rebuilds on
   * every run event, and a choice held only in the element would be lost.
   */
  reparentChoice: string;
  /**
   * True once Trash has been asked for and not yet confirmed.
   *
   * A whole transcript is a lot of work to lose to one mis-click, so the gesture
   * is two deliberate acts. The file goes to the Trash rather than being
   * unlinked, so this is a speed bump rather than the only safeguard.
   */
  confirmingTrash: boolean;
  /**
   * Transcripts with a `.golden` recording on disk (ADR-294 D1) — the golden
   * tier, where the recording IS the assertion. Reported by the host, because
   * tier is a filesystem fact the page cannot observe itself.
   */
  goldens: Set<string>;
  /**
   * True once Record golden has been asked for and not yet confirmed.
   *
   * Same two-act shape as Trash: a first record starts a whole suite run, and
   * a RE-record overwrites the baseline every future run is judged against.
   */
  confirmingRecord: boolean;
  /**
   * What the last edit did, shown until the next one.
   *
   * A save changes the file the shown run came from, so every turn after the
   * edited one is now describing a file that no longer exists in that form. The
   * note says so rather than letting the cards quietly become fiction.
   */
  editNote: string;
  /**
   * The attached story's id, or null when none is attached.
   *
   * Gates the New-transcript bar and the empty-suite note: before a story
   * arrives, "no transcripts yet" would be a claim about a suite the page has
   * not seen, and a create would have nowhere to land (ADR-290 D8 — the host
   * infers the path from the story).
   */
  story: string | null;
  /**
   * Assertions written through the editor since the open document's last run,
   * command input → the tags written on it (F2: new and untested shows in
   * orange, immediately). Keyed by INPUT rather than source line because later
   * edits shift lines but not what the author typed. Confirmed writes only —
   * an orange chip for a write that never reached disk would be fiction.
   * Cleared with the rest of the per-document state.
   */
  freshClaims: Map<string, Set<string>>;
}

/** A selection inside one turn's output, and the assertion it earns. */
export interface PendingPromotion {
  /** Source line of the `> command` the selection belongs to. */
  commandLine: number;
  /** The command's text, so the offer can name what it is about. */
  input: string;
  promotion: Promotion;
}

/** Everything a row can ask for. Rendering never reaches the host directly. */
export interface ViewActions {
  select(node: TestNode): void;
  open(node: TestNode): void;
  back(): void;
  setMode(mode: ViewMode): void;
  setFace(face: DocumentFace): void;
  openLocation(file: string, line: number): void;
  /** Write the pending promotion into the open file. */
  promote(): void;
  /** Append a command to the open file, asserting nothing yet. */
  addCommand(input: string): void;
  /** Remove the command at `commandLine`, and everything asserted about it. */
  deleteCommand(commandLine: number): void;
  /** Start retyping the command at `commandLine`, prefilled with its text. */
  beginCommandEdit(commandLine: number, current: string): void;
  /** Replace the command's text at `commandLine`, keeping its assertions. */
  editCommand(commandLine: number, input: string): void;
  /** Stop retyping without changing anything. */
  cancelCommandEdit(): void;
  /** Put the file back the way it was before the last edit. */
  undo(): void;
  /** Remove one of a command's assertions. */
  removeAssertion(commandLine: number, index: number): void;
  /** Create a transcript that continues from the open one. */
  newBranch(name: string): void;
  /** Rewrite what the open transcript continues from; null makes it a root. */
  reparent(stem: string | null): void;
  /** Move the open transcript to the Trash. */
  trashOpenDocument(): void;
  /** Arm or disarm the Trash confirmation. */
  setConfirmingTrash(confirming: boolean): void;
  /** Record (or re-record) the open transcript's golden — runs the suite. */
  recordGolden(): void;
  /** Arm or disarm the Record golden confirmation. */
  setConfirmingRecord(confirming: boolean): void;
  /** Close a re-record review, keeping the recording already on disk (R6). */
  keepNewRecording(): void;
  /** Ask the host for the pre-re-record recording back (R6). */
  restorePreviousRecording(): void;
  /**
   * Write a `[STATE: assertTrue, expression]` assertion onto the command at
   * `commandLine` (R3) — a world change the author clicked, already spelled
   * with the token that parses.
   */
  assertWorldChange(commandLine: number, assertTrue: boolean, expression: string): void;
}

/** A surface with nothing selected, in the default mode. */
export function createSurface(): Surface {
  return {
    mode: 'column',
    selected: null,
    opened: null,
    face: 'cards',
    source: null,
    follow: true,
    status: '',
    pending: null,
    commandDraft: '',
    commandEdit: null,
    undoDepth: 0,
    runMatchesFile: true,
    newBranchName: '',
    reparentChoice: '',
    confirmingTrash: false,
    goldens: new Set(),
    confirmingRecord: false,
    editNote: '',
    story: null,
    freshClaims: new Map(),
  };
}

/** Status dot class — `running` outranks the node's own status while it runs. */
function dotClass(node: TestNode, model: RunModel): string {
  return `dot ${node === model.running ? 'running' : node.status}`;
}

/** How a node's result reads in one line, in whatever state it is in. */
function resultLine(node: TestNode, model: RunModel): string {
  switch (node.status) {
    case 'unreached':
      return node.blockedBy
        ? `never ran — blocked by ${stemOf(node.blockedBy)}`
        : 'never ran — an ancestor failed';
    case 'pending':
      return 'queued';
    case 'running':
      return `${node.turns.length} of ${node.commandCount ?? '?'} commands…`;
    case 'skipped':
      return 'skipped — no commands yet; open it and add the first one';
    case 'error':
      return node.errorMessage ? `error — ${node.errorMessage}` : 'error — the transcript never ran';
    default: {
      const parts = [`${node.passed} passed`];
      if (node.failed) parts.push(`${node.failed} failed`);
      if (node.expectedFailures) parts.push(`${node.expectedFailures} expected-fail`);
      if (node.skipped) parts.push(`${node.skipped} skipped`);
      return `${parts.join(' · ')} in ${node.duration} ms${node === model.running ? '…' : ''}`;
    }
  }
}

/**
 * One turn row: source line, command, verdict. Clicking opens `file:line`.
 *
 * `showOutput` is the difference between the two surfaces that share this row.
 * The preview is a glance at a node, so it shows the story's words only where
 * they explain a failure. The document is the editing surface (Phase 5, R1), so
 * there the words ARE the content — you cannot promote a span you cannot see.
 * Building the `<pre>` costs real work over a 500-turn node, which is why this
 * is a parameter rather than a CSS rule that hides what was built anyway.
 */
function turnRow(
  node: TestNode,
  turn: Turn,
  actions: ViewActions,
  showOutput = false,
  claims: WrittenAssertion[] | null = null,
  surface: Surface | null = null,
  terminal: 'ends' | 'dead' | null = null,
  delta: WorldDelta | null = null,
): HTMLElement {
  const row = el(
    'div',
    `turn${turn.passed ? '' : ' bad'}${terminal ? ` ${terminal}` : ''}${turn.passed && turn.diff ? ' rerecorded' : ''}`,
  );
  const line = el('button', 'ln', String(turn.line));
  line.type = 'button';
  line.title = `${node.file}:${turn.line}`;
  line.addEventListener('click', () => actions.openLocation(node.file, turn.line));
  row.append(line);

  const command = el('div', 'cmd');
  command.append(el('b', null, '> '));
  // Retyping a command in place (the surface carries the draft — the document is
  // rebuilt on every run event, and text living only in the element would be
  // erased mid-word). Document face only: `surface` arrives with the claims.
  if (surface?.commandEdit?.line === turn.line) {
    const field = el('input', 'cmdedit');
    field.type = 'text';
    field.id = 'editcommand';
    field.autocomplete = 'off';
    field.value = surface.commandEdit.draft;
    field.addEventListener('input', () => {
      surface.commandEdit = { line: turn.line, draft: field.value };
    });
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        actions.editCommand(turn.line, field.value);
      } else if (event.key === 'Escape') {
        // Escape here abandons the retype, not the document — the global
        // listener that closes the document must not also see this press.
        event.stopPropagation();
        actions.cancelCommandEdit();
      }
    });
    const change = el('button', 'editgo', 'Change');
    change.type = 'button';
    change.addEventListener('click', () => actions.editCommand(turn.line, field.value));
    const keep = el('button', 'editcancel', 'Keep');
    keep.type = 'button';
    keep.addEventListener('click', () => actions.cancelCommandEdit());
    command.append(field, change, keep);
  } else {
    command.append(document.createTextNode(turn.input));
    // The edit that delete-and-re-add cannot express: change the command's text
    // and keep what is asserted about it. Withheld on an unsound file, where no
    // edit is safe to offer.
    if (surface && surface.source?.outlook?.kind !== 'unsound') {
      // The glyph is CSS `::before` content, deliberately: text inside the
      // button would join `.cmd`'s textContent, and the command's text is an
      // identity other code (and the real-path suite) matches exactly.
      const edit = el('button', 'editcmd');
      edit.type = 'button';
      edit.title = `Change "${turn.input}" — what the file asserts about it stays`;
      edit.dataset.editLine = String(turn.line);
      edit.addEventListener('click', () => actions.beginCommandEdit(turn.line, turn.input));
      command.append(edit);
    }
  }
  row.append(command);

  if (showOutput) {
    // The engine turn this command executed as (R4) — document face only, where
    // turn numbers are what an author schedules beats against. Always appended,
    // even empty, so rows without one keep the grid's columns aligned. Meta
    // commands legitimately repeat a number; that is the fact, not a bug.
    const turnNumber = el('span', 'turnno', turn.turn !== undefined ? `turn ${turn.turn}` : '');
    turnNumber.title =
      turn.turn !== undefined
        ? 'The engine turn this command executed as — meta commands share their turn with the next action'
        : '';
    row.append(turnNumber);
  }

  const verdict = el('div', 'verdict');
  verdict.textContent = turn.skipped
    ? 'SKIP'
    : turn.expectedFailure
      ? 'XFAIL'
      : turn.passed
        ? 'PASS'
        : 'FAIL';
  row.append(verdict);

  if (showOutput) {
    // Only in the document, where the row is an editing surface. In the preview
    // it would be a destructive control on a pane meant for glancing.
    const remove = el('button', 'drop', '✕');
    remove.type = 'button';
    remove.title = `Remove "${turn.input}" and everything asserted about it`;
    remove.dataset.deleteLine = String(turn.line);
    remove.addEventListener('click', () => actions.deleteCommand(turn.line));
    row.append(remove);
  }

  // `actualOutput` is absent when the wire did not carry it (a passing turn on a
  // run without `--capture-output`) and empty when the story genuinely printed
  // nothing. Those are different facts and the probe must not merge them: a
  // silent turn is a finding, not a gap, and R10 is the case where treating one
  // as the other steers an author into pinning a bug.
  const captured = turn.actualOutput !== undefined;
  if (turn.error || (captured && (showOutput || !turn.passed))) {
    const detail = el('div', 'detail');
    if (turn.error) detail.append(el('div', 'err', turn.error));
    if (captured) {
      if (turn.actualOutput) {
        const output = el('pre', 'actual', turn.actualOutput);
        // The line is how a selection finds its way back to a command: it is the
        // identity the wire and the parsed file already agree on, and the command
        // TEXT is not — most transcripts run `look` more than once.
        output.dataset.commandLine = String(turn.line);
        detail.append(output);
      } else {
        detail.append(el('div', 'silent', 'The story printed nothing this turn.'));
      }
    }
    row.append(detail);
  }

  // The recording's side of a changed turn (R6). On a PASSING turn this is a
  // re-record's before — the actual output above is the after. On a FAILED
  // replay it is what the recording expects — the other half of the old-vs-new
  // failure view. Verbatim from the runner; the page never re-diffs.
  if (turn.diff && (showOutput || !turn.passed)) {
    const prior = el('div', 'recordedside');
    prior.append(
      el('div', 'recordedlabel', turn.passed ? 'Previously recorded:' : 'The recording expects:'),
    );
    prior.append(el('pre', 'recorded', turn.diff.recorded.join('\n')));
    row.append(prior);
  }

  // R3: what this command changed in the world, each change a click from
  // being asserted. The chip emits the runner-picked TOKEN, so the [STATE:]
  // single-token parse rule never reaches the author. Withheld on an unsound
  // file for the same reason every other edit control is.
  if (delta && surface && surface.source?.outlook?.kind !== 'unsound') {
    const changes = el('div', 'worldrow');
    const chip = (label: string, title: string, assertTrue: boolean, expression: string): void => {
      const button = el('button', 'worldchip', label);
      button.type = 'button';
      button.title = title;
      button.addEventListener('click', () =>
        actions.assertWorldChange(turn.line, assertTrue, expression),
      );
      changes.append(button);
    };
    if (delta.movedTo) {
      chip(
        `→ ${delta.movedTo.name}`,
        `Assert the player ends this turn in ${delta.movedTo.name}`,
        true,
        `player.location = ${delta.movedTo.token}`,
      );
    }
    for (const item of delta.took) {
      chip(
        `+ ${item.name}`,
        `Assert the player is carrying ${item.name} after this turn`,
        true,
        `player.inventory contains ${item.token}`,
      );
    }
    for (const item of delta.dropped) {
      chip(
        `− ${item.name}`,
        `Assert the player is no longer carrying ${item.name} after this turn`,
        false,
        `player.inventory contains ${item.token}`,
      );
    }
    row.append(changes);
  }

  if (claims && claims.length) {
    const list = el('div', 'claims');
    claims.forEach((claim) => list.append(claimRow(turn.line, claim, actions)));
    row.append(list);
  }

  // F2: an assertion written since the last run is visible NOW, in the new-
  // and-untested color — not hidden until the next run the way stale claims
  // are. Tracked by the editor at write time (surface.freshClaims), so this
  // needs no line join against a file the run predates.
  const fresh = surface?.freshClaims.get(turn.input);
  if (fresh && fresh.size) {
    const shown = new Set((claims ?? []).map((claim) => claim.tag));
    const list = el('div', 'claims');
    let any = false;
    fresh.forEach((tag) => {
      if (shown.has(tag)) return;
      const claim = el('div', 'claim fresh');
      claim.append(el('code', 'ctag', tag));
      claim.append(el('span', 'cfresh', 'new — not tested until the next run'));
      list.append(claim);
      any = true;
    });
    if (any) row.append(list);
  }

  // R9's two markings, both statements about the LAST RUN, never guesses about
  // the file. The ender is where the story stopped; everything after it
  // executed against a stopped engine and could not have done anything else.
  // The ✕ stays live on dead turns — trimming them is the edit this marking
  // exists to invite.
  if (terminal === 'ends') {
    row.append(el('div', 'endshere', 'The story ends here.'));
  } else if (terminal === 'dead') {
    row.append(
      el('div', 'deadnote', 'The story had already ended — this command could not run.'),
    );
  }
  return row;
}

/**
 * A command the file has and the shown run does not — authored since that run,
 * or before any run at all (F2). Rendered the moment it exists: [NEW] badge,
 * its assertions in the untested color, and the next step said out loud, so an
 * add is never invisible and never doubles from being retried.
 */
function authoredRow(
  node: TestNode,
  line: number,
  input: string,
  claims: WrittenAssertion[],
  actions: ViewActions,
): HTMLElement {
  const row = el('div', 'turn new');
  const ln = el('button', 'ln', String(line));
  ln.type = 'button';
  ln.title = `${node.file}:${line}`;
  ln.addEventListener('click', () => actions.openLocation(node.file, line));
  row.append(ln);

  const command = el('div', 'cmd');
  command.append(el('b', null, '> '));
  command.append(document.createTextNode(input));
  row.append(command);
  row.append(el('span', 'verdict newbadge', 'NEW'));

  // The auto-written [SKIP] placeholder is not a claim the author made — the
  // guidance line below is what stands in for it until a real assertion does.
  const real = claims.filter((claim) => !(claim.tag === '[SKIP]' && claims.length === 1));
  if (real.length) {
    const list = el('div', 'claims');
    real.forEach((claim) => {
      const item = claimRow(line, claim, actions);
      item.classList.add('fresh');
      list.append(item);
    });
    row.append(list);
  }
  row.append(
    el(
      'div',
      'newnote',
      real.length
        ? 'Not yet run — Run Tests to check it.'
        : 'Not yet run. Run Tests to see what the story says, then select the part that matters to turn it into an assertion.',
    ),
  );
  return row;
}

/**
 * One assertion the file makes about a turn, and the way to take it back.
 *
 * The tag is the serializer's own, so this reads as the file reads — which is
 * also how an author learns the grammar (R8: the palette is the documentation).
 * `[SKIP]` and `[TODO]` are marked as halting, because a command carrying either
 * has its later assertions silently unevaluated and a surface that listed them
 * as equals would be lying about what the suite checks.
 */
function claimRow(commandLine: number, claim: WrittenAssertion, actions: ViewActions): HTMLElement {
  const row = el('div', claim.haltsEvaluation ? 'claim halts' : 'claim');
  row.append(el('code', 'ctag', claim.tag));
  if (claim.block) row.append(el('pre', 'cblock', claim.block.join('\n')));
  if (claim.haltsEvaluation) {
    row.append(el('span', 'chalt', 'the run stops here — nothing after it is checked'));
  }

  const remove = el('button', 'cdrop', '✕');
  remove.type = 'button';
  remove.title = `Remove ${claim.tag}`;
  remove.dataset.removeAssertion = `${commandLine}:${claim.index}`;
  remove.addEventListener('click', () => actions.removeAssertion(commandLine, claim.index));
  row.append(remove);
  return row;
}

/** The preview pane: what the selected node is, and its most recent turns. */
function preview(model: RunModel, node: TestNode | null, actions: ViewActions): HTMLElement {
  const pane = el('div', 'col preview');
  if (!node) {
    pane.append(el('div', 'more', 'Waiting for the first transcript…'));
    return pane;
  }
  pane.append(el('h3', null, node.stem));
  pane.append(el('div', 'sub', node.file));

  const list = el('dl', 'kv');
  const pair = (key: string, value: string, className?: string): void => {
    list.append(el('dt', null, key), el('dd', className, value));
  };
  pair('Result', resultLine(node, model), node.status === 'failed' ? 'fail' : undefined);
  pair('Ancestry', ancestry(model, node).map((a) => a.stem).join(' › '));
  pair('Children', node.children.length ? String(node.children.length) : 'none — a leaf');
  if (node.replays) {
    pair('Replayed', `${node.replays}× to rebuild a descendant's state`, 'replay');
  }
  const blocked = subtreeFailureCount(node);
  if (blocked) pair('Below', `${blocked} failing descendant${blocked === 1 ? '' : 's'}`, 'fail');
  pane.append(list);

  const open = el('button', 'open', 'Open document');
  open.type = 'button';
  open.addEventListener('click', () => actions.open(node));
  pane.append(open);

  if (node.status === 'unreached') {
    pane.append(el('div', 'more', 'No turns — an ancestor failed, so this branch never executed.'));
    return pane;
  }
  const recent = node.turns.slice(-40);
  const turns = el('div', 'turns');
  recent.forEach((turn) => turns.append(turnRow(node, turn, actions)));
  pane.append(turns);
  if (node.turns.length > recent.length) {
    pane.append(el('div', 'more', `+ ${node.turns.length - recent.length} earlier turns — open the document`));
  }
  return pane;
}

/** A row in Column view. */
function columnRow(model: RunModel, node: TestNode, surface: Surface, actions: ViewActions): HTMLElement {
  const row = el('button', `crow ${node.status}`);
  row.type = 'button';
  row.setAttribute('aria-selected', String(node === surface.selected));
  if (node !== surface.selected && surface.selected && ancestry(model, surface.selected).includes(node)) {
    row.dataset.inpath = 'true';
  }
  row.append(el('span', dotClass(node, model)));
  row.append(el('span', 'stem', node.stem));
  const failures = subtreeFailureCount(node);
  if (failures) row.append(el('span', 'badge', String(failures)));
  if (node.replays) row.append(el('span', 'tag', 'replay'));
  if (node.turns.length) row.append(el('span', 'n', String(node.turns.length)));
  if (node.children.length) row.append(el('span', 'chev', '›'));
  row.addEventListener('click', () => actions.select(node));
  row.addEventListener('dblclick', () => actions.open(node));
  return row;
}

/** Miller columns: one column per level of the selected path, preview last. */
function renderColumns(model: RunModel, surface: Surface, actions: ViewActions): void {
  const host = byId('cols');
  host.replaceChildren();
  const path = surface.selected ? ancestry(model, surface.selected) : [];
  let level = model.roots;
  let depth = 0;
  while (level.length) {
    const column = el('div', 'col');
    level.forEach((node) => column.append(columnRow(model, node, surface, actions)));
    host.append(column);
    const step = path[depth];
    if (!step || !step.children.length) break;
    level = step.children;
    depth += 1;
  }
  host.append(preview(model, surface.selected, actions));
  // Finder auto-scrolls to the deepest column; the shift-left IS the layout.
  host.scrollLeft = host.scrollWidth;
}

/** List: the whole tree in order, with parentage as indentation, preview beside. */
function renderList(model: RunModel, surface: Surface, actions: ViewActions): void {
  const host = byId('list');
  host.replaceChildren();
  const walk = (node: TestNode, depth: number): void => {
    const row = el('button', `lrow ${node.status}`);
    row.type = 'button';
    row.style.paddingLeft = `${10 + depth * 16}px`;
    row.setAttribute('aria-selected', String(node === surface.selected));
    row.append(el('span', dotClass(node, model)));
    row.append(el('span', 'twisty', node.children.length ? '▾' : ''));
    row.append(el('span', 'stem', node.stem));
    const failures = subtreeFailureCount(node);
    if (failures) row.append(el('span', 'badge', String(failures)));
    if (node.replays) row.append(el('span', 'tag', 'replay'));
    if (node.turns.length) row.append(el('span', 'n', String(node.turns.length)));
    row.addEventListener('click', () => actions.select(node));
    row.addEventListener('dblclick', () => actions.open(node));
    host.append(row);
    node.children.forEach((child) => walk(child, depth + 1));
  };
  model.roots.forEach((root) => walk(root, 0));

  const side = byId('list-side');
  side.replaceChildren(preview(model, surface.selected, actions));
}

/** A transcript as a document tile: a sheet whose rule count hints at length. */
function documentTile(model: RunModel, node: TestNode, surface: Surface, actions: ViewActions): HTMLElement {
  const tile = el('button', `doc ${node.status}`);
  tile.type = 'button';
  tile.setAttribute('aria-selected', String(node === surface.selected));

  const sheet = el('div', `sheet ${node.status}`);
  const rules = Math.max(3, Math.min(6, Math.ceil((node.commandCount ?? node.turns.length) / 6)));
  for (let i = 0; i < rules * 2; i += 1) {
    const rule = el('i', i % 2 === 0 ? 'cmd' : undefined);
    rule.style.width = `${i % 2 === 0 ? 62 : [88, 70, 80][(i / 2) | 0] ?? 74}%`;
    sheet.append(rule);
  }
  tile.append(sheet);
  tile.append(el('span', 'name', node.stem));
  tile.append(el('span', 'sub', resultLine(node, model)));
  tile.addEventListener('click', () => actions.select(node));
  tile.addEventListener('dblclick', () => actions.open(node));
  return tile;
}

/** Documents: roots, then each parent's children as its own group. */
function renderDocuments(model: RunModel, surface: Surface, actions: ViewActions): void {
  const host = byId('docs');
  host.replaceChildren();
  const group = (label: string, nodes: TestNode[]): void => {
    if (!nodes.length) return;
    host.append(el('div', 'groupbar', label));
    const grid = el('div', 'grid');
    nodes.forEach((node) => grid.append(documentTile(model, node, surface, actions)));
    host.append(grid);
  };
  group('roots', model.roots);
  for (const node of model.nodes.values()) {
    if (node.children.length) group(`children of ${node.stem}`, node.children);
  }
  if (!model.nodes.size) {
    host.append(el('div', 'more', 'No transcripts yet — run the suite to fill this in.'));
  }
}

/**
 * The source face: the transcript as it is on disk, and what a save would write.
 *
 * The normalization notice is the load-bearing part. Saving re-emits the whole
 * file from the parsed model, so it can rewrite lines the author never touched —
 * comment indentation is gone before the serializer even runs, a comment written
 * between a command's assertions moves above the command, an empty `#` gains a
 * trailing space. Twenty-seven of the corpus's thirty-seven files are untouched
 * by a round trip; this is how an author learns which side of that their file is
 * on, BEFORE the rewrite is a diff they have to review.
 */
function sourceFace(node: TestNode, surface: Surface): HTMLElement {
  const pane = el('div', 'sourceface');
  const loaded = surface.source;

  if (!loaded || loaded.file !== node.file) {
    pane.append(el('div', 'more', 'Reading the file…'));
    return pane;
  }
  if (loaded.error !== null) {
    pane.append(el('div', 'err', loaded.error));
    return pane;
  }
  if (loaded.text === null) {
    pane.append(el('div', 'more', 'Reading the file…'));
    return pane;
  }

  const outlook = loaded.outlook;
  if (outlook?.kind === 'unsound') {
    // Not a formatting question. The runner refuses this file for the reasons
    // listed, and until they are fixed the editor must not offer to rewrite it —
    // an unsound parse serializes to a husk, so a save here would delete work.
    const note = el('div', 'normnote bad');
    note.textContent =
      'The test run would refuse this file, so the editor will not rewrite it:';
    pane.append(note);
    const problems = el('ul', 'problems');
    outlook.problems.forEach((problem) => problems.append(el('li', null, problem)));
    pane.append(problems);
  } else if (outlook?.kind === 'empty') {
    // Not damage — the file simply hasn't begun (D2). Point at the fix rather
    // than listing the refusal it will earn if run as-is.
    pane.append(
      el(
        'div',
        'normnote',
        'No commands yet — a new transcript starts empty so the first command is yours. Add it on the Cards face; the run refuses the file until then.',
      ),
    );
  } else if (outlook?.kind === 'reformats') {
    const n = outlook.changedLines;
    pane.append(
      el(
        'div',
        'normnote',
        `Saving would reformat this file — ${n} line${n === 1 ? '' : 's'} differ from what the serializer writes.`,
      ),
    );
  } else if (outlook?.kind === 'clean') {
    pane.append(el('div', 'normnote clean', 'Saving would leave this file byte-for-byte as it is.'));
  }

  pane.append(el('pre', 'source', loaded.text));
  return pane;
}

/** The reading surface: every turn with its source line, click-through to it. */
function renderDocument(model: RunModel, surface: Surface, actions: ViewActions): void {
  const view = byId('docview');
  // A live run rebuilds this on every event. If the author is typing a command
  // when one lands, replacing the subtree takes their focus with it — so the
  // caret is put back where it was, on the field that carries it. Both fields
  // that can hold a mid-word draft are covered: the add bar and the in-place
  // retype.
  const focused = document.activeElement?.id;
  const typing = focused === 'addcommand' || focused === 'editcommand' ? focused : null;
  view.replaceChildren();
  const node = surface.opened;
  if (!node) return;

  const header = el('header');
  const back = el('button', 'back', '‹ Back');
  back.type = 'button';
  back.addEventListener('click', () => actions.back());
  header.append(back, el('h2', null, node.stem));
  const path = el('button', 'path', node.file);
  path.type = 'button';
  path.title = 'Open this transcript in the editor';
  path.addEventListener('click', () => actions.openLocation(node.file, 1));
  header.append(path);

  // The same segmented control the mode switcher uses — two readings of one
  // document, chosen the way the author already chooses a view mode.
  const faces = el('div', 'seg faces');
  ([
    ['cards', 'Cards', 'The run: each command with what the story said'],
    ['source', 'Source', 'The file on disk, and what saving would write'],
  ] as const).forEach(([face, label, title]) => {
    const button = el('button', null, label);
    button.type = 'button';
    button.title = title;
    button.dataset.face = face;
    button.setAttribute('aria-pressed', String(surface.face === face));
    button.addEventListener('click', () => actions.setFace(face));
    faces.append(button);
  });
  header.append(faces);
  view.append(header);

  const meta = el('div', 'docmeta');
  const cell = (key: string, value: string, className?: string): void => {
    const box = el('div');
    box.append(el('span', 'k', key), el('span', `v${className ? ` ${className}` : ''}`, value));
    meta.append(box);
  };
  cell('Result', resultLine(node, model), node.status === 'passed' ? 'pass' : node.status === 'failed' ? 'fail' : undefined);
  cell('Ancestry', ancestry(model, node).map((a) => a.stem).join(' › '));
  cell('Children', node.children.length ? String(node.children.length) : 'leaf');
  if (node.replays) cell('Replays', `${node.replays}×`, 'replay');
  // Tier is a filesystem fact the host reports (ADR-294 D2/D7): a recording
  // exists, or the file's own assertions are what the run checks.
  if (surface.goldens.has(node.file)) cell('Tier', 'golden — the recording is the assertion', 'gold');
  // R5: where this file STARTS from — its ancestry's world, legible without
  // holding the ancestors in your head. Shown only when the run captured it.
  if (node.entryWorld) {
    const entry = node.entryWorld;
    const carrying = entry.inventory.length
      ? entry.inventory.map((item) => item.name).join(', ')
      : 'nothing';
    cell(
      'Starts',
      `${entry.location ? `in ${entry.location.name}` : 'in an unnamed place'} · carrying ${carrying}`,
      'entry',
    );
  }
  view.append(meta);

  // The two faces share the header and the meta row — they are two readings of
  // one document, not two screens.
  if (surface.face === 'source') {
    view.append(sourceFace(node, surface));
    return;
  }

  // F2: what the author wrote exists before any run does. Commands beyond the
  // run's turns render as cards the moment they land — [NEW] — instead of
  // waiting for the next run. Beyond-count is the honest join: adds append to
  // the file, and mid-file edits already carry the "run again" edit note.
  let authoredTail: { line: number; input: string; claims: WrittenAssertion[] }[] = [];
  if (surface.source?.file === node.file && surface.source.text !== null) {
    try {
      const transcript = parse(surface.source.text, node.file);
      const byLine = assertionsByCommandLine(surface.source.text, node.file);
      authoredTail = transcript.commands.slice(node.turns.length).map((command) => ({
        line: command.lineNumber,
        input: command.input,
        claims: byLine.get(command.lineNumber) ?? [],
      }));
    } catch {
      // An unreadable file has no authored tail to show — the source face says why.
    }
  }

  const turns = el('div', 'turns');
  if (node.status === 'unreached') {
    turns.append(
      el(
        'div',
        'more',
        node.blockedBy
          ? `This branch never executed — ${stemOf(node.blockedBy)} failed above it.`
          : 'This branch never executed — an ancestor failed.',
      ),
    );
  } else if (!node.turns.length) {
    if (!authoredTail.length) turns.append(el('div', 'more', 'No turns recorded.'));
  } else {
    // The file's claims are joined to the run's turns by source line, so they are
    // shown only while the two still describe the same file.
    const claims =
      surface.runMatchesFile && surface.source?.file === node.file && surface.source.text !== null
        ? assertionsByCommandLine(surface.source.text, node.file)
        : null;
    // R9: where the last run showed the story ending, the cards say so — the
    // ender is badged, and everything after it is marked dead rather than
    // rendered as ordinary failures the author has to diagnose one by one.
    const end = storyEnd(node);
    const firstDead = end ? node.turns.length - end.dead.length : -1;
    node.turns.forEach((turn, index) =>
      turns.append(
        turnRow(
          node,
          turn,
          actions,
          true,
          claims?.get(turn.line) ?? null,
          surface,
          end === null ? null : index >= firstDead ? 'dead' : index === firstDead - 1 ? 'ends' : null,
          worldDelta(worldBefore(node, index), turn.world),
        ),
      ),
    );
  }
  if (node.status !== 'unreached') {
    authoredTail.forEach((command) =>
      turns.append(authoredRow(node, command.line, command.input, command.claims, actions)),
    );
  }
  view.append(turns);

  // R6: a re-record is a review, not a blind overwrite. The changed cards
  // above carry their before/after; this bar is the decision that closes it.
  const changed = recordingChanges(node);
  if (changed.length && surface.goldens.has(node.file)) {
    view.append(reviewBar(changed.length, actions));
  }

  const end = storyEnd(node);
  view.append(fileBar(model, node, surface, actions));
  // A file the run showed reaching the story's ending cannot grow: an appended
  // command can only ever error. The append bar gives way to the explanation
  // and the affordance R9 names — branch a NEW transcript from the point
  // before the ending, which is exactly how fuse-cut and fuse-lose are shaped.
  if (end) view.append(terminalBar(node, end));
  else view.append(commandBar(surface, actions));
  if (surface.editNote) view.append(editNote(surface, actions));
  // The promote offer lives in a persistent slot, filled in place — never by a
  // document render. A render rebuilds the turns subtree, and rebuilding the
  // nodes a selection lives in collapses the selection mid-drag (F3, phase-6
  // log) — the exact gesture the offer exists to answer.
  const slot = el('div');
  slot.id = 'promoteslot';
  view.append(slot);
  renderPromoteSlot(surface, actions);

  if (typing) {
    const field = document.getElementById(typing) as HTMLInputElement | null;
    field?.focus();
    field?.setSelectionRange(field.value.length, field.value.length);
  }
}

/**
 * File-level operations on the open transcript: branch from it, or bin it.
 *
 * Branching lives here rather than on the tree because a branch is defined by
 * what it continues FROM, and that is the document you are reading. The author
 * names it; the editor writes `continues:`, and the host decides the path
 * (ADR-290 D8) — so neither the field name nor the folder is ever something to
 * get wrong.
 */
function fileBar(model: RunModel, node: TestNode, surface: Surface, actions: ViewActions): HTMLElement {
  const bar = el('div', 'filebar');

  const field = el('input', 'branchinput');
  field.type = 'text';
  field.id = 'newbranch';
  field.placeholder = 'Branch from this transcript…';
  field.autocomplete = 'off';
  field.value = surface.newBranchName;
  // R9: a branch replays its ancestry, ending included — every command in a
  // child of a terminal file would error against a stopped engine. Refused
  // here, at the gesture, rather than discovered as a wall of red on the
  // child's first run.
  if (storyEnd(node)) {
    field.disabled = true;
    field.placeholder = 'The story ends in this transcript — a branch from it could never run.';
  }
  field.addEventListener('input', () => {
    surface.newBranchName = field.value;
  });
  const branch = (): void => {
    const name = field.value.trim();
    if (!name) return;
    actions.newBranch(name);
  };
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      branch();
    }
  });

  const go = el('button', 'branchgo', 'Branch');
  go.type = 'button';
  // The button follows the field: a name typed before the run revealed the
  // ending would otherwise still be submittable.
  go.disabled = field.disabled;
  go.addEventListener('click', branch);
  bar.append(field, go);

  // Reparenting: rewriting `continues:`, the field the editor owns end to end
  // (R5) — the author picks a parent from the tree the run proved, and never
  // types the field. The candidates already exclude this file, its own
  // descendants (a cycle by construction) and any file whose run reached the
  // story's ending; the current parent is dropped here because re-picking it
  // is not an edit, so it is not an offer.
  const option = (label: string, value: string): HTMLOptionElement => {
    const choice = el('option', null, label);
    choice.value = value;
    return choice;
  };
  const pick = el('select', 'repick');
  const lead = option(
    node.parent ? `Continues from ${stemOf(node.parent)}…` : 'A root — continues from nothing…',
    '',
  );
  lead.disabled = true;
  pick.append(lead);
  if (node.parent) pick.append(option('nothing — make it a root', '<root>'));
  for (const candidate of reparentCandidates(model, node)) {
    if (candidate.file === node.parent) continue;
    pick.append(option(candidate.stem, candidate.stem));
  }
  pick.value = surface.reparentChoice || '';
  const apply = el('button', 'reparentgo', 'Reparent');
  apply.type = 'button';
  apply.disabled = surface.reparentChoice === '';
  // The button follows the picker directly — no repaint rides on a pick, so
  // its enabled state cannot wait for one.
  pick.addEventListener('change', () => {
    surface.reparentChoice = pick.value;
    apply.disabled = pick.value === '';
  });
  apply.addEventListener('click', () => {
    const choice = surface.reparentChoice;
    if (!choice) return;
    actions.reparent(choice === '<root>' ? null : choice);
  });
  bar.append(pick, apply);

  // Goldens (ADR-294 D1): record — or re-record — this file's recording, by
  // running the suite with just this node blessed. Two acts, like Trash: a
  // first record starts a whole run, and a re-record overwrites the baseline
  // every future run is judged against. Disabled mid-run — recording IS a run,
  // and two runs cannot share the engine.
  const isGolden = surface.goldens.has(node.file);
  if (surface.confirmingRecord) {
    const confirm = el('button', 'recordgold armed', isGolden ? 'Overwrite the recording?' : 'Run and record?');
    confirm.type = 'button';
    confirm.addEventListener('click', () => actions.recordGolden());
    const keep = el('button', 'recordcancel', 'Keep as is');
    keep.type = 'button';
    keep.addEventListener('click', () => actions.setConfirmingRecord(false));
    bar.append(confirm, keep);
  } else {
    const ask = el('button', 'recordgold', isGolden ? 'Re-record golden…' : 'Record golden…');
    ask.type = 'button';
    ask.disabled = model.inFlight;
    ask.title = isGolden
      ? 'Run the suite and overwrite this file’s recording with what the story says now'
      : 'Run the suite and record this file’s output as its golden — the recording becomes the assertion, and any per-command assertions in the file stop being evaluated (ADR-294 D2)';
    ask.addEventListener('click', () => actions.setConfirmingRecord(true));
    bar.append(ask);
  }

  // Two acts, not one. The file still goes to the Trash rather than being
  // unlinked, so this is a speed bump rather than the only thing between an
  // author and a lost afternoon.
  if (surface.confirmingTrash) {
    const confirm = el('button', 'trash armed', 'Move to Trash?');
    confirm.type = 'button';
    confirm.addEventListener('click', () => actions.trashOpenDocument());
    const cancel = el('button', 'trashcancel', 'Keep');
    cancel.type = 'button';
    cancel.addEventListener('click', () => actions.setConfirmingTrash(false));
    bar.append(confirm, cancel);
  } else {
    const ask = el('button', 'trash', 'Trash…');
    ask.type = 'button';
    ask.title = 'Move this transcript to the Trash';
    ask.addEventListener('click', () => actions.setConfirmingTrash(true));
    bar.append(ask);
  }
  return bar;
}

/**
 * What the last edit did, and the way back from it.
 *
 * Undo sits here rather than in a menu because this line is where the author
 * learns an edit happened; the reversal belongs next to the report of it. It is
 * offered only while there is something to reverse in THIS document — the stack
 * is dropped when the author leaves, since it holds one file's history and
 * restoring it into another would be a different file's text.
 */
function editNote(surface: Surface, actions: ViewActions): HTMLElement {
  const note = el('div', 'editnote');
  note.append(el('span', 'said', surface.editNote));
  if (surface.undoDepth > 0) {
    const undo = el('button', 'undo', surface.undoDepth > 1 ? `Undo (${surface.undoDepth})` : 'Undo');
    undo.type = 'button';
    undo.title = 'Put the file back the way it was before the last edit';
    undo.addEventListener('click', () => actions.undo());
    note.append(undo);
  }
  return note;
}

/**
 * What stands where the append bar would, on a file whose run reached the
 * story's ending (R9).
 *
 * Not a disabled field with a tooltip: the fact changes what the surface IS
 * for. A terminal file is a finished leaf — the losing and winning branches
 * are only expressible as files whose last live command ends the story — and
 * the way to keep exploring is a NEW transcript branched from before the
 * ending, on the parent's document. Trimming any dead tail stays available on
 * the cards themselves (each dead turn keeps its ✕).
 */
/**
 * Closes a re-record review (R6): the recording already on disk is the new
 * one, so keeping it writes nothing — the review was the chance to read what
 * changed. Restoring asks the host for the pre-run bytes back, and the review
 * stays open until the host confirms; the restored recording becomes the
 * baseline again, red until the story matches it.
 */
function reviewBar(changed: number, actions: ViewActions): HTMLElement {
  const bar = el('div', 'reviewbar');
  bar.append(
    el(
      'span',
      'said',
      `${changed} turn${changed === 1 ? '' : 's'} changed from the previous recording — the changed cards show both sides.`,
    ),
  );
  const keep = el('button', 'keepnew', 'Keep the new recording');
  keep.type = 'button';
  keep.addEventListener('click', () => actions.keepNewRecording());
  const restore = el('button', 'restoreold', 'Restore the previous recording');
  restore.type = 'button';
  restore.title =
    'Put back the recording as it was before this re-record — the next run replays against it, and stays red until the story matches it again';
  restore.addEventListener('click', () => actions.restorePreviousRecording());
  bar.append(keep, restore);
  return bar;
}

function terminalBar(node: TestNode, end: StoryEnd): HTMLElement {
  const bar = el('div', 'terminalbar');
  const from = node.parent
    ? `branch a new transcript from ${stemOf(node.parent)}`
    : 'branch a new transcript from an earlier point';
  bar.append(
    el(
      'span',
      'said',
      end.endsAt
        ? `The story ends at "> ${end.endsAt.input}" — a command appended here could never run. To explore another path, ${from}.`
        : 'The story had already ended when this file began — its ancestry reaches an ending, so no command here can run.',
    ),
  );
  return bar;
}

/**
 * Where a transcript grows: type a command, and it is appended asserting nothing.
 *
 * This is the other half of R1's loop. A command added here runs on the next run,
 * its output appears on its card, and selecting that output is the assertion —
 * so the author never types a command and an expectation in the same breath, and
 * is never asked to predict what the story will say.
 */
function commandBar(surface: Surface, actions: ViewActions): HTMLElement {
  const bar = el('div', 'addcmd');
  const field = el('input', 'cmdinput');
  field.type = 'text';
  field.id = 'addcommand';
  field.placeholder = 'Add a command…';
  field.autocomplete = 'off';
  field.value = surface.commandDraft;
  field.addEventListener('input', () => {
    // Recorded, never re-rendered from: repainting on every keystroke would move
    // the caret out from under the author.
    surface.commandDraft = field.value;
  });
  // An unsound file cannot be edited at all: serializing it would write a husk
  // over the author's work, so the field says why rather than failing on Enter.
  // An EMPTY file is the exception the kind exists for (D2): this field is the
  // fix, so it stays open and says it is the beginning.
  const unsound = surface.source?.outlook?.kind === 'unsound';
  field.disabled = unsound;
  if (unsound) field.placeholder = 'The test run would refuse this file — fix it in the editor first.';
  if (surface.source?.outlook?.kind === 'empty') field.placeholder = 'Add the first command…';

  const submit = (): void => {
    const input = field.value.trim();
    if (!input) return;
    field.value = '';
    surface.commandDraft = '';
    actions.addCommand(input);
  };
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  });

  const add = el('button', 'addgo', 'Add');
  add.type = 'button';
  add.disabled = unsound;
  add.addEventListener('click', submit);

  bar.append(field, add);
  return bar;
}

/**
 * The offer: what selecting this span would write, and the button that writes it.
 *
 * It names the assertion tag itself rather than describing it, because the tag
 * IS what lands in the file — and because for most authors this surface is where
 * they learn what a transcript can express (R8: the palette is the documentation).
 * The reason is shown too, so the rule behind the choice is visible rather than
 * magic: an inline fragment cannot hold a double quote, and being told that once
 * beats discovering it as a parse error.
 */
function promoteBar(
  pending: PendingPromotion,
  surface: Surface,
  actions: ViewActions,
): HTMLElement {
  const bar = el('div', 'promote');
  bar.append(el('span', 'for', `> ${pending.input}`));
  bar.append(el('code', 'tag', pending.promotion.label));
  bar.append(el('span', 'why', pending.promotion.because));

  const button = el('button', 'go', 'Add assertion');
  button.type = 'button';
  button.dataset.promote = pending.promotion.form;
  // An unsound file has no safe edit: serializing it would write a husk over the
  // author's work. Saying why beats a button that does nothing.
  const unsound = surface.source?.outlook?.kind === 'unsound';
  button.disabled = unsound;
  if (unsound) button.title = 'The test run would refuse this file — fix it in the editor first.';
  button.addEventListener('click', () => actions.promote());
  bar.append(button);
  return bar;
}

/** The toolbar's tallies, phase chips and progress bar. */
function renderHeader(model: RunModel, surface: Surface): void {
  const nodes = [...model.nodes.values()];
  const count = (status: TestNode['status']): number => nodes.filter((n) => n.status === status).length;
  const failed = count('failed') + count('error');
  const unreached = count('unreached');

  byId('tally-pass').textContent = String(count('passed'));
  const failCell = byId('tally-fail');
  failCell.textContent = String(failed);
  failCell.className = `v${failed ? ' fail' : ''}`;
  const unreachedCell = byId('tally-unreached');
  unreachedCell.textContent = String(unreached);
  unreachedCell.className = `v${unreached ? ' unreached' : ''}`;

  const done = model.authoredCommands + model.replayedCommands;
  byId('tally-commands').textContent = String(done);
  byId('tally-commands-sub').textContent =
    `${model.authoredCommands} authored · ${model.replayedCommands} replayed`;

  const total = model.progress?.total;
  byId('progress-text').textContent = total ? `${model.progress?.done ?? done} / ${total}` : `${done}`;
  const bar = byId('progress-bar');
  bar.style.width = total ? `${Math.min(100, ((model.progress?.done ?? done) / total) * 100)}%` : '0';

  const phases = byId('phases');
  phases.replaceChildren();
  model.phases.forEach((phase) => {
    const chip = el('span', `chip${phase.finishedAt === undefined ? ' busy' : ''}`);
    chip.append(document.createTextNode(phase.name));
    chip.append(
      el('span', 'ms', phase.finishedAt === undefined ? '…' : `${phase.finishedAt - phase.startedAt} ms`),
    );
    phases.append(chip);
  });

  const meta: string[] = [];
  if (model.mode) meta.push(model.mode);
  meta.push(`${model.nodes.size} node${model.nodes.size === 1 ? '' : 's'}`);
  if (model.summary) meta.push(`${model.summary.totalDuration} ms`);
  byId('meta').textContent = meta.join(' · ');

  const status = byId('status');
  status.textContent = surface.status;
  status.classList.toggle('on', surface.status !== '');

  byId('cancel').toggleAttribute('disabled', !model.inFlight);
  byId('run').toggleAttribute('disabled', model.inFlight);
}

/** The breadcrumb under the panes — the selected path, always. */
function renderPathBar(model: RunModel, surface: Surface): void {
  const bar = byId('pathbar');
  bar.replaceChildren();
  const target = surface.opened ?? surface.selected;
  if (target) {
    const path = ancestry(model, target);
    path.forEach((node, i) => {
      if (i) bar.append(el('span', 'sep', '›'));
      bar.append(i === path.length - 1 ? el('b', null, node.stem) : el('span', null, node.stem));
    });
  }
  bar.append(
    el(
      'span',
      'hint',
      surface.opened
        ? 'Back returns to the view · click a line number to open it in the editor'
        : 'Click selects · double-click opens the document',
    ),
  );
}

/** Repaints the whole surface. Called on every applied event and every click. */
/**
 * Fills (or empties) the promote-offer slot in place.
 *
 * The selection watcher calls THIS instead of a document render: a render
 * rebuilds the turns subtree, and replacing the nodes a selection anchors in
 * collapses it mid-drag (F3, phase-6 log). The slot is the one region a
 * selection change is allowed to touch. Document renders also call it, so a
 * full repaint and a selection patch agree on what the slot shows.
 */
export function renderPromoteSlot(surface: Surface, actions: ViewActions): void {
  const slot = document.getElementById('promoteslot');
  if (!slot) return;
  slot.replaceChildren();
  if (surface.pending) slot.append(promoteBar(surface.pending, surface, actions));
}

export function render(model: RunModel, surface: Surface, actions: ViewActions): void {
  renderHeader(model, surface);

  const showing = surface.opened !== null;
  byId('docview').classList.toggle('on', showing);
  const panes: Record<ViewMode, string> = {
    column: 'pane-column',
    list: 'pane-list',
    documents: 'pane-documents',
  };
  (Object.keys(panes) as ViewMode[]).forEach((mode) => {
    byId(panes[mode]).classList.toggle('on', !showing && surface.mode === mode);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.mode === surface.mode));
  });

  // The browse surface owns ROOT creation: a branch is defined by its parent
  // and so lives on the open document, but the suite's FIRST transcript has no
  // parent and no document to be reached from. Without this bar an empty suite
  // is a dead end (phase-6 log, D1).
  byId('newbar').classList.toggle('on', !showing && surface.story !== null);

  if (showing) renderDocument(model, surface, actions);
  else if (surface.mode === 'column') renderColumns(model, surface, actions);
  else if (surface.mode === 'list') renderList(model, surface, actions);
  else renderDocuments(model, surface, actions);

  // An empty suite says how to begin, over whichever pane is showing —
  // three blank panes claim the tab is broken, not that nothing exists yet.
  if (!showing && surface.story !== null && model.nodes.size === 0) {
    const containers: Record<ViewMode, string> = { column: 'cols', list: 'list', documents: 'docs' };
    byId(containers[surface.mode]).replaceChildren(
      el(
        'div',
        'emptysuite',
        'This story has no transcripts yet. Name the first one above and press Create — it starts empty, and its first command is yours.',
      ),
    );
  }

  renderPathBar(model, surface);
}
