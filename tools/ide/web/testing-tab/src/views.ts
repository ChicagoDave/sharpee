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
 * Public interface: ViewMode, Surface, ViewActions, createSurface, render.
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

import { byId, el } from './dom';
import {
  ancestry,
  subtreeFailureCount,
  stemOf,
  type RunModel,
  type TestNode,
  type Turn,
} from './model';

/** The three modes. Column is the default (D4). */
export type ViewMode = 'column' | 'list' | 'documents';

/** What the author is looking at — the state the model does not own. */
export interface Surface {
  mode: ViewMode;
  /** The node every mode agrees is selected. */
  selected: TestNode | null;
  /** The node open as a document, or null for the mode's own pane. */
  opened: TestNode | null;
  /** Selection tracks the running node until the author clicks a row. */
  follow: boolean;
  /** A pipeline failure or host note; never silently blank. */
  status: string;
}

/** Everything a row can ask for. Rendering never reaches the host directly. */
export interface ViewActions {
  select(node: TestNode): void;
  open(node: TestNode): void;
  back(): void;
  setMode(mode: ViewMode): void;
  openLocation(file: string, line: number): void;
}

/** A surface with nothing selected, in the default mode. */
export function createSurface(): Surface {
  return { mode: 'column', selected: null, opened: null, follow: true, status: '' };
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

/** One turn row: source line, command, verdict. Clicking opens `file:line`. */
function turnRow(node: TestNode, turn: Turn, actions: ViewActions): HTMLElement {
  const row = el('div', `turn${turn.passed ? '' : ' bad'}`);
  const line = el('button', 'ln', String(turn.line));
  line.type = 'button';
  line.title = `${node.file}:${turn.line}`;
  line.addEventListener('click', () => actions.openLocation(node.file, turn.line));
  row.append(line);

  const command = el('div', 'cmd');
  command.append(el('b', null, '> '), document.createTextNode(turn.input));
  row.append(command);

  const verdict = el('div', 'verdict');
  verdict.textContent = turn.skipped
    ? 'SKIP'
    : turn.expectedFailure
      ? 'XFAIL'
      : turn.passed
        ? 'PASS'
        : 'FAIL';
  row.append(verdict);

  if (!turn.passed && (turn.error || turn.actualOutput)) {
    const detail = el('div', 'detail');
    if (turn.error) detail.append(el('div', 'err', turn.error));
    if (turn.actualOutput) detail.append(el('pre', 'actual', turn.actualOutput));
    row.append(detail);
  }
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

/** The reading surface: every turn with its source line, click-through to it. */
function renderDocument(model: RunModel, surface: Surface, actions: ViewActions): void {
  const view = byId('docview');
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
  view.append(meta);

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
    turns.append(el('div', 'more', 'No turns recorded.'));
  } else {
    node.turns.forEach((turn) => turns.append(turnRow(node, turn, actions)));
  }
  view.append(turns);
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

  if (showing) renderDocument(model, surface, actions);
  else if (surface.mode === 'column') renderColumns(model, surface, actions);
  else if (surface.mode === 'list') renderList(model, surface, actions);
  else renderDocuments(model, surface, actions);

  renderPathBar(model, surface);
}
