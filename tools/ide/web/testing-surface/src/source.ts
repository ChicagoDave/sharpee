/**
 * source.ts — the source panel, which IS the editor (ADR-306 Phase 4,
 * design §5).
 *
 * Purpose: renders the active segment's transcript from the same plan the
 *   auto-save writer serializes (`composeSegmentLines`), so the panel shows
 *   exactly what the file carries. Every assertion line deletes via hover-✕;
 *   the DeleteRef on each line maps straight onto a SessionModel mutator in
 *   main.ts — narrowing, whole-block deletion, and `[SKIP]` demotion are
 *   model semantics, never re-derived here.
 *
 * Public interface: renderSource(model, active, context).
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { composeSegmentLines, type DeleteRef, type TurnSource } from './compose';
import type { AutoAssertionPolicy } from '@sharpee/branch-tester/types';
import type { Segment, SessionModel } from './model';

/** What rendering needs beyond the model. */
export interface SourceContext {
  policy?: AutoAssertionPolicy;
  seed: number;
  source: (ordinal: number) => TurnSource | undefined;
  onDelete: (ref: DeleteRef) => void;
}

const kindClass: Record<string, string> = {
  header: 'ts-hdr',
  separator: 'ts-hdr',
  command: 'ts-cmd',
  assertion: 'ts-ok',
  skip: 'ts-skip',
  block: 'ts-lit',
  blank: '',
};

/** Renders the active segment's generated transcript, editable by ✕. */
export function renderSource(
  model: SessionModel,
  active: Segment | null,
  context: SourceContext,
): void {
  const sourceHost = document.getElementById('ts-source');
  const title = document.getElementById('ts-source-title');
  if (!sourceHost || !title) return;

  if (!active || !model.segments.includes(active)) {
    title.textContent = 'created transcript';
    sourceHost.textContent = '';
    const hint = document.createElement('span');
    hint.className = 'ts-skip';
    hint.textContent = '# tick the opening or a turn to start a transcript';
    sourceHost.appendChild(hint);
    return;
  }

  const lines = composeSegmentLines({
    model,
    segment: active,
    policy: context.policy,
    seed: context.seed,
    source: context.source,
  });
  title.textContent = `created transcript · ${model.titleOf(active)}`;

  sourceHost.textContent = '';
  lines.forEach((line, index) => {
    const row = document.createElement('span');
    row.className = `ts-line ${kindClass[line.kind] ?? ''}`.trim();
    row.appendChild(document.createTextNode(line.text));
    if (line.del) {
      const del = document.createElement('span');
      del.className = 'ts-del';
      del.textContent = '✕';
      del.title = 'Delete this assertion';
      const ref = line.del;
      del.addEventListener('click', () => context.onDelete(ref));
      row.appendChild(del);
    }
    sourceHost.appendChild(row);
    if (index < lines.length - 1) sourceHost.appendChild(document.createTextNode('\n'));
  });
}
