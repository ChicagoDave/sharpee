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
import type { AutoAssertionPolicy } from '@sharpee/branch-tester/types';
import { CardsView } from './cards';
import { composeSegmentTranscript, type DeleteRef, type TurnSource } from './compose';
import { SessionModel, type Segment, type SessionSnapshot } from './model';
import { renderSource } from './source';

/** A turn-feed record as forwarded by the IDE (TurnEventRecord / fence). */
interface FeedRecord {
  restart?: boolean;
  turn: number;
  command?: string;
  output?: string;
  captures?: { channel: string; values: unknown[] }[];
}

/** The boot global the IDE injects for restore-by-replay (ADR-306 D8),
 *  plus the story's `auto-assertion:` policy for synthesis. */
interface BootSession {
  replay?: string[];
  snapshot?: SessionSnapshot;
  policy?: AutoAssertionPolicy;
}

interface DeliverShim { q?: unknown[]; deliver(record: unknown): void; }

const model = new SessionModel();
let activeSegment: Segment | null = null;

/** Every delivered record by ordinal — synthesis reads outputs/captures. */
const records = new Map<number, FeedRecord>();
/** The story's `auto-assertion:` policy, injected by the IDE at boot. */
let policy: AutoAssertionPolicy | undefined;

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

/** Routes a source-panel ✕ onto the model (design §5's delete semantics). */
function applyDelete(ref: DeleteRef): void {
  switch (ref.kind) {
    case 'default': model.removeDefault(ref.ordinal, ref.index, ref.defaults); break;
    case 'defaultWhole': model.removeDefault(ref.ordinal, -1, []); break;
    case 'contains': model.removeContains(ref.ordinal, ref.index); break;
    case 'notContains': model.removeNotContains(ref.ordinal, ref.index); break;
    case 'state': model.removeState(ref.ordinal, ref.index); break;
    case 'event': model.removeEvent(ref.ordinal, ref.index); break;
    case 'channel': model.removeChannel(ref.ordinal, ref.index); break;
    case 'exact': model.setExact(ref.ordinal, false); break;
  }
  update();
}

const sourceContext = () => ({
  policy,
  seed: 42,
  source: turnSource,
  onDelete: applyDelete,
});

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
    renderSource(model, activeSegment, sourceContext());
  },
});

/** Re-render and persist: every model change lands in the sidecar (D8)
 *  and every closed segment lands on disk (design §4's auto-save). */
function update(): void {
  if (activeSegment && !model.segments.includes(activeSegment)) {
    activeSegment = null;
  }
  cards.render();
  renderSource(model, activeSegment, sourceContext());
  postState();
  syncWrites();
}

// ── the auto-save writer (design §4): a closed segment IS a file ──────────

/** What each tracked segment last wrote: its stem and its exact text. */
const written = new Map<Segment, { name: string; text: string }>();

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
 * Mirrors the session onto disk: every CLOSED segment writes immediately and
 * rewrites on every edit; a restructure that renames posts `previousName` so
 * the Swift side deletes the old file and cascades children's `continues:`;
 * a segment the author removed (untick, merge) removes its file. An open
 * range is not a file yet (design §3) and a fence only forgets tracking —
 * files already in `tests/` are durable artifacts, never deleted by a
 * restart (ADR-305 D3 fences the SESSION, not the suite).
 */
function syncWrites(): void {
  for (const [segment, last] of [...written]) {
    if (!model.segments.includes(segment)) {
      written.delete(segment);
      postToBridge({ remove: { name: last.name } });
    }
  }
  for (const segment of model.segments) {
    if (segment.end === null) {
      const last = written.get(segment);
      if (last) {
        // A reopened range is no longer a complete file — take it back.
        written.delete(segment);
        postToBridge({ remove: { name: last.name } });
      }
      continue;
    }
    const { title, text } = composeSegmentTranscript({
      model, segment, policy, seed: 42, source: turnSource,
    });
    const last = written.get(segment);
    if (last && last.name === title && last.text === text) continue;
    const payload: Record<string, unknown> = { write: { name: title, text } };
    if (last && last.name !== title) {
      (payload.write as Record<string, unknown>).previousName = last.name;
    }
    written.set(segment, { name: title, text });
    postToBridge(payload);
  }
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
    records.clear();
    written.clear();  // files stay — only the session's tracking resets
    activeSegment = null;
    expectBoot = true;
    update();
    return;
  }

  cards.ensureLayout();
  const boot = expectBoot;
  expectBoot = false;
  records.set(record.turn, record);
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
policy = bootSession?.policy;
if (bootSession && ((bootSession.replay?.length ?? 0) > 0 || bootSession.snapshot)) {
  void (async () => {
    // The boot look is automatic — wait for it (unless it already arrived
    // in the drained queue) before typing the first replayed command.
    if (model.turns.length === 0) await awaitNextTurn(15_000);
    await restoreSession(bootSession);
  })();
}
