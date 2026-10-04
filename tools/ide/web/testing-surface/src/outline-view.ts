/**
 * outline-view.ts — the outline column: the tree's fork points as pills you
 * can walk, and the door into one line.
 *
 * Purpose: renders {@link Outline} into the surface's left navigator column.
 * A fork point is a heading pill; expanding it shows its lines, each pill
 * naming its own first and last command, where it ends and how long it is.
 * Clicking a line asks the driver to visit it — the one place a boot happens.
 *
 * Nothing here reads the engine or the run: the column is readable on a tree
 * that has never been played, which is the point of it. After a run the
 * caller hands in each line's verdict (line-verdict.ts) and the pills are
 * tinted with it, a fork heading taking the worst of its lines (ADR-357 D4);
 * with no verdicts the column is exactly what it was.
 *
 * The position indicator (ADR-357 D7) renders here too, because it is the
 * same manifest read for one line: the forks from the main line down to it.
 *
 * Public interface: OutlineDelegate, OutlineView, renderPosition.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { rollUpVerdicts, type LineVerdict } from './line-verdict.js';
import type { Outline, OutlineFork, OutlineLine, OutlinePosition } from './outline.js';

/** What the column asks the surface to do. */
export interface OutlineDelegate {
  /** Visit a line: replay its prefix suppressed, type its own cards live. */
  onSelectLine(lineId: string): void;
}

export class OutlineView {
  private host: HTMLElement | null = null;
  /** Fork points the author has opened, keyed by position in the outline. */
  private expanded = new Set<number>();

  constructor(private readonly delegate: OutlineDelegate) {}

  /** Adopt the column element `CardsView.ensureLayout` built. */
  attach(host: HTMLElement): void {
    this.host = host;
  }

  /**
   * Redraw the column.
   *
   * @param outline    the manifest, derived fresh from the document
   * @param activeLine the line the session is on
   * @param verdictOf  each line's verdict from the last run; every line is
   *   `none` (untinted) when omitted
   */
  render(
    outline: Outline,
    activeLine: string,
    verdictOf: (lineId: string) => LineVerdict = () => 'none',
  ): void {
    if (!this.host) return;
    this.host.replaceChildren();

    this.host.appendChild(this.summary(outline));
    this.host.appendChild(tinted(this.rootPill(outline.root, activeLine), verdictOf(outline.root.lineId)));

    outline.forks.forEach((fork, index) => {
      const open = this.expanded.has(index);
      // A closed heading still shows a failure under it (ADR-357 D4).
      const heading = rollUpVerdicts(fork.lines.map((line) => verdictOf(line.lineId)));
      this.host!.appendChild(tinted(this.forkPill(fork, index, open), heading));
      if (!open) return;
      for (const line of fork.lines) {
        this.host!.appendChild(
          tinted(this.linePill(line, fork.depth + 1, activeLine), verdictOf(line.lineId)));
      }
    });
  }

  /** One line of counts — what the tree is, before anything is run. */
  private summary(outline: Outline): HTMLElement {
    const el = document.createElement('div');
    el.className = 'ts-outline-summary';
    const forks = outline.forks.length;
    el.textContent =
      `${outline.lineCount} line${outline.lineCount === 1 ? '' : 's'} · ` +
      `${forks} fork point${forks === 1 ? '' : 's'}`;
    return el;
  }

  private rootPill(root: OutlineLine, activeLine: string): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ts-outline-pill ts-outline-root';
    if (activeLine === root.lineId) button.classList.add('ts-outline-here');
    button.append(
      span('ts-outline-name', 'root'),
      span('ts-outline-cmd', `${root.start ?? '—'} → ${root.end ?? '—'}`),
      span('ts-outline-spacer', ''),
      span('ts-outline-turns', String(root.turns)),
    );
    button.addEventListener('click', () => this.delegate.onSelectLine(root.lineId));
    return button;
  }

  private forkPill(fork: OutlineFork, index: number, open: boolean): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ts-outline-pill ts-outline-fork';
    button.style.marginLeft = `${fork.depth * 16}px`;
    button.setAttribute('aria-expanded', String(open));
    const count = fork.lines.length;
    button.append(
      span('ts-outline-twisty', open ? '▾' : '▸'),
      span('ts-outline-cmd', fork.command ?? '—'),
      locationSpan(fork.location, fork.locationAsserted),
      span('ts-outline-spacer', ''),
      span('ts-outline-turns', String(count)),
    );
    button.addEventListener('click', () => {
      if (this.expanded.has(index)) this.expanded.delete(index);
      else this.expanded.add(index);
      // Redraw from the same outline: expansion is view state, not document
      // state, so it never round-trips through the model.
      button.dispatchEvent(new CustomEvent('ts-outline-toggle', { bubbles: true }));
    });
    return button;
  }

  private linePill(line: OutlineLine, depth: number, activeLine: string): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ts-outline-pill ts-outline-line';
    button.style.marginLeft = `${depth * 16}px`;
    if (line.lineId === activeLine) button.classList.add('ts-outline-here');

    // The name is what the siblings do NOT have. Leading with the first
    // command would read `se` against nine lines at one fork, and leading
    // with the first divergence reads `wait` against a line that is seven
    // waits — both accurate, neither any use.
    const top = document.createElement('span');
    top.className = 'ts-outline-row';
    const name = span('ts-outline-cmd', line.name);
    if (line.nameKind === 'shape') {
      name.classList.add('ts-outline-shape');
      name.title = 'nothing in this line is rare among its siblings — this is its shape';
    }
    if (line.nameKind === 'empty') name.classList.add('ts-outline-unasserted');
    top.append(name);

    const bottom = document.createElement('span');
    bottom.className = 'ts-outline-row ts-outline-sub';
    // The destination is shown only when the line asserts one: inheriting the
    // fork's room printed `Alley` against branches that walk away from Alley.
    if (line.destination !== undefined) {
      bottom.append(span('ts-outline-loc', line.destination));
    } else if (line.turns > 0) {
      const silent = span('ts-outline-loc ts-outline-unasserted', 'no location asserted');
      silent.title = 'this line never asserts where it ends';
      bottom.append(silent);
    }
    bottom.append(
      span('ts-outline-spacer', ''),
      span('ts-outline-turns', `${line.turns} turn${line.turns === 1 ? '' : 's'}`),
    );

    button.append(top, bottom);
    button.addEventListener('click', () => this.delegate.onSelectLine(line.lineId));
    return button;
  }
}

/**
 * Render where the active line sits: `main line › <fork command> → <line
 * name> › …`, one step per fork from the main line down.
 *
 * @param host     the indicator's element (built by CardsView.ensureLayout)
 * @param position the line's position, from {@link positionOf}
 */
export function renderPosition(host: HTMLElement, position: OutlinePosition): void {
  host.replaceChildren(span('ts-position-step ts-position-root', 'main line'));
  for (const step of position.steps) {
    host.append(span('ts-position-sep', '›'));
    const el = span('ts-position-step', '');
    if (step.forkCommand !== undefined) {
      el.append(span('ts-position-fork', step.forkCommand), span('ts-position-arrow', ' → '));
    }
    el.append(span('ts-position-name', step.name));
    host.append(el);
  }
  host.title = position.steps.length === 0
    ? 'you are on the main line'
    : `you are ${position.steps.length} fork${position.steps.length === 1 ? '' : 's'} down from the main line`;
}

/** What each verdict says on hover — the tint alone is not the whole story. */
const VERDICT_TITLE: Record<LineVerdict, string> = {
  pass: 'passed on the last run',
  fail: 'failed on the last run',
  unreached: 'the last run could not reach this line',
  stale: 'edited since the last run — this result is unverified',
  none: '',
};

/** Mark a pill with its verdict: a class the stylesheet tints, and a title. */
function tinted(pill: HTMLElement, verdict: LineVerdict): HTMLElement {
  if (verdict === 'none') return pill;
  pill.classList.add(`ts-verdict-${verdict}`);
  pill.dataset.verdict = verdict;
  if (!pill.title) pill.title = VERDICT_TITLE[verdict];
  return pill;
}

function span(className: string, text: string): HTMLElement {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

/** A location, marked when it is inherited rather than asserted. */
function locationSpan(
  location: string | undefined,
  asserted: boolean,
  absent = '—',
): HTMLElement {
  const el = span('ts-outline-loc', location ?? absent);
  if (!asserted) {
    el.classList.add('ts-outline-unasserted');
    el.title = 'inherited from the fork — this line asserts no location';
    el.textContent = `${location ?? absent} ⌁`;
  }
  return el;
}
