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
 *   are reading is a view you fight. The view MODE never changes itself at all
 *   (ADR-301 D4) — it is restored from the host and persisted back when the
 *   author switches it.
 *
 * Public interface: none — this module is the bundle's entry and runs on load.
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

import { installHost } from './host';
import { applyEvent, createModel, stemOf, type RunModel, type TestNode } from './model';
import { byId } from './dom';
import { createSurface, render, type ViewActions, type ViewMode } from './views';

let model: RunModel = createModel();
const surface = createSurface();
let framePending = false;

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
    surface.follow = false;
    byId('follow').setAttribute('aria-pressed', 'false');
    scheduleRender();
  },
  open(node: TestNode) {
    surface.opened = node;
    surface.selected = node;
    scheduleRender();
  },
  back() {
    surface.opened = null;
    scheduleRender();
  },
  setMode(mode: ViewMode) {
    surface.mode = mode;
    surface.opened = null;
    host.persistMode(mode);
    scheduleRender();
  },
  openLocation(file: string, line: number) {
    host.openLocation(file, line);
  },
};

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
    byId('follow').setAttribute('aria-pressed', 'true');
    byId('story').textContent = story;
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
  onRestoreMode(mode) {
    if (mode === 'column' || mode === 'list' || mode === 'documents') surface.mode = mode;
    scheduleRender();
  },
  onFinished(ok) {
    model.inFlight = false;
    if (!ok && !surface.status) surface.status = 'The test run ended without completing its stream.';
    scheduleRender();
  },
});

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

function installToolbar(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => actions.setMode(button.dataset.mode as ViewMode));
  });
  byId('run-all').addEventListener('click', () => host.runAll());
  byId('run-chain').addEventListener('click', () => host.runChain());
  byId('run-tree').addEventListener('click', () => host.runTree());
  byId('cancel').addEventListener('click', () => host.cancel());
  byId('follow').addEventListener('click', () => {
    surface.follow = !surface.follow;
    byId('follow').setAttribute('aria-pressed', String(surface.follow));
    if (surface.follow) trackRunning();
    scheduleRender();
  });
  // Escape leaves the document view — the one gesture that has no button of its
  // own on screen while a document fills the pane.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && surface.opened) actions.back();
  });
}

installToolbar();
render(model, surface, actions);
host.ready();
