/**
 * source.ts — the source panel's structural render (ADR-306 Phase 3).
 *
 * Purpose: shows the ACTIVE segment as the transcript it will become —
 *   title, `seed:` / `continues:` header, `[SKIP]` ancestry, and the range's
 *   commands. Structure only: assertion synthesis is the toolchain's one
 *   code path (ADR-306 D2) and lands with Phase 4's writer, so this panel
 *   deliberately writes no claims — it marks where they will synthesize.
 *
 * Public interface: renderSource(model, active).
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import type { Segment, SessionModel } from './model';

const escapeHTML = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Renders the active segment's generated-transcript structure. */
export function renderSource(model: SessionModel, active: Segment | null): void {
  const source = document.getElementById('ts-source');
  const title = document.getElementById('ts-source-title');
  if (!source || !title) return;

  if (!active || !model.segments.includes(active)) {
    title.textContent = 'created transcript';
    source.innerHTML =
      '<span class="ts-skip"># tick the opening or a turn to start a transcript</span>';
    return;
  }

  const name = model.titleOf(active);
  title.textContent = `created transcript · ${name}`;

  const parent = model.parentOf(active);
  const end = active.end ?? active.start;
  const lines: string[] = [];
  lines.push(`<span class="ts-hdr">title: ${escapeHTML(name)}</span>`);
  lines.push(parent
    ? `<span class="ts-hdr">continues: ${escapeHTML(model.titleOf(parent))}</span>`
    : `<span class="ts-hdr">seed: 42</span>`);
  lines.push('');
  lines.push('<span class="ts-hdr">---</span>');
  lines.push('');
  lines.push('<span class="ts-skip"># in-range turns assert via the story\'s'
    + ' auto-assertion policy — authoring lands in Phase 4</span>');
  lines.push('');

  const from = parent ? (parent.end ?? parent.start) + 1 : 1;
  for (const turn of model.turns) {
    if (turn.ordinal < from || turn.ordinal > end || turn.ordinal === 0) continue;
    lines.push(`<span class="ts-cmd">&gt; ${escapeHTML(turn.command)}</span>`);
    const inRange = turn.ordinal >= Math.max(active.start, 1);
    if (!inRange || model.isSkipped(turn.ordinal)) {
      lines.push('<span class="ts-skip">[SKIP]</span>');
    }
    lines.push('');
  }

  source.innerHTML = lines.join('\n').replace(/\n$/, '');
}
