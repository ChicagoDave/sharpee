/**
 * main.ts — the testing play surface's entry point (ADR-306 Phase 3).
 *
 * Purpose: wires the pieces together inside the testing page. The IDE's
 *   document-start shim queues turn-feed records the Swift side forwards
 *   (`window.__sharpeeTestingSurface.deliver`); this module drains that
 *   queue, folds records into the SessionModel, builds cards, renders, and
 *   posts every view-state change back over the `testingSurface` bridge for
 *   the D8 sidecar. On boot it also runs restore-by-replay: the commands the
 *   sidecar logged are typed into the client's real input, one per delivered
 *   turn, then the persisted segment structure is re-applied.
 *
 * Public interface: none — the bundle is self-executing inside the page.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { proseTextLinesOf } from '@sharpee/branch-tester/auto-assertion';
import { CardsView } from './cards';
import { SessionModel, type Segment, type SessionSnapshot } from './model';
import { renderSource } from './source';

/** A turn-feed record as forwarded by the IDE (TurnEventRecord / fence). */
interface FeedRecord {
  restart?: boolean;
  turn: number;
  command?: string;
  captures?: { channel: string; values: unknown[] }[];
}

/** The boot global the IDE injects for restore-by-replay (ADR-306 D8). */
interface BootSession {
  replay?: string[];
  snapshot?: SessionSnapshot;
}

interface DeliverShim { q?: unknown[]; deliver(record: unknown): void; }

const model = new SessionModel();
let activeSegment: Segment | null = null;

const cards = new CardsView(model, {
  onTick(ordinal, checked) {
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
  onCollapse(segment) { model.setCollapsed(segment, true); update(); },
  onExpand(segment) {
    model.setCollapsed(segment, false);
    activeSegment = segment;
    update();
  },
  onMergeUp(segment) {
    const parent = model.parentOf(segment);
    if (model.mergeUp(segment)) activeSegment = parent ?? null;
    update();
  },
  onSplitAt(ordinal) {
    if (model.splitAt(ordinal)) activeSegment = model.segmentOf(ordinal) ?? null;
    update();
  },
  onActivate(segment) {
    activeSegment = segment;
    renderSource(model, activeSegment);
  },
});

/** Re-render and persist: every model change lands in the sidecar (D8). */
function update(): void {
  if (activeSegment && !model.segments.includes(activeSegment)) {
    activeSegment = null;
  }
  cards.render();
  renderSource(model, activeSegment);
  postState();
}

/** Posts the view snapshot over the `testingSurface` bridge (D8 sidecar). */
function postState(): void {
  try {
    (window as unknown as {
      webkit?: { messageHandlers?: { testingSurface?: { postMessage(b: string): void } } };
    }).webkit?.messageHandlers?.testingSurface?.postMessage(
      JSON.stringify({ state: model.snapshot() }));
  } catch {
    // Observation only — the surface must keep working without the bridge.
  }
}

// ── feed delivery ─────────────────────────────────────────────────────────

/** True until the next record, which is a lineage's automatic boot look. */
let expectBoot = true;
/** Resolvers waiting on the next delivered turn (the replay driver). */
let nextTurnWaiters: (() => void)[] = [];

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
    cards.clear();
    model.fence();
    activeSegment = null;
    expectBoot = true;
    update();
    return;
  }

  cards.ensureLayout();
  const boot = expectBoot;
  expectBoot = false;
  const room = roomOf(record);
  model.addTurn({
    ordinal: record.turn,
    command: record.command ?? '',
    ...(room !== undefined ? { room } : {}),
    boot,
  });
  cards.addTurnCard(record.turn, boot);
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

// ── restore-by-replay (ADR-306 D8) ────────────────────────────────────────

/** Types one command into the client's real input — the same door the
 *  author uses, so replayed turns arrive over the same feed as any turn. */
function typeCommand(command: string): void {
  const input = document.getElementById('command-input') as HTMLInputElement | null;
  if (!input) return;
  input.value = command;
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

/**
 * Replays the sidecar's command log after the boot look lands, then
 * re-applies the persisted view structure. A turn that never arrives stops
 * the replay and applies what fits — degraded, never an error (D8).
 */
async function restoreSession(session: BootSession): Promise<void> {
  const input = document.getElementById('command-input') as HTMLInputElement | null;
  const commands = session.replay ?? [];
  if (commands.length > 0) {
    if (input) {
      input.disabled = true;
      input.placeholder = 'restoring session…';
    }
    for (const command of commands) {
      typeCommand(command);
      if (!(await awaitNextTurn(15_000))) break;
    }
    if (input) {
      input.disabled = false;
      input.placeholder = '';
      input.focus();
    }
  }
  if (session.snapshot) {
    model.restore(session.snapshot);
    activeSegment = model.openSegment()
      ?? model.segments[model.segments.length - 1] ?? null;
    update();
  }
}

// ── boot ──────────────────────────────────────────────────────────────────

const surfaceWindow = window as unknown as {
  __sharpeeTestingSurface?: DeliverShim;
  __SHARPEE_TESTING_SESSION__?: BootSession;
};

const queued = surfaceWindow.__sharpeeTestingSurface?.q ?? [];
surfaceWindow.__sharpeeTestingSurface = { deliver };

cards.ensureLayout();
for (const record of queued) deliver(record);

const bootSession = surfaceWindow.__SHARPEE_TESTING_SESSION__;
if (bootSession && ((bootSession.replay?.length ?? 0) > 0 || bootSession.snapshot)) {
  void (async () => {
    // The boot look is automatic — wait for it (unless it already arrived
    // in the drained queue) before typing the first replayed command.
    if (model.turns.length === 0) await awaitNextTurn(15_000);
    await restoreSession(bootSession);
  })();
}
