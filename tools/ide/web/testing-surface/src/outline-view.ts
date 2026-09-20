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
 * that has never been played, which is the point of it.
 *
 * Public interface: OutlineDelegate, OutlineView.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import type { Outline, OutlineFork, OutlineLine } from './outline.js';

/** What the column asks the surface to do. */
export interface OutlineDelegate {
  /** Visit a line: replay its prefix suppressed, type its own cards live. */
  onSelectLine(lineId: number): void;
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
   */
  render(outline: Outline, activeLine: number): void {
    if (!this.host) return;
    this.host.replaceChildren();

    this.host.appendChild(this.summary(outline));
    this.host.appendChild(this.rootPill(outline.root, activeLine));

    outline.forks.forEach((fork, index) => {
      const open = this.expanded.has(index);
      this.host!.appendChild(this.forkPill(fork, index, open));
      if (!open) return;
      for (const line of fork.lines) {
        this.host!.appendChild(this.linePill(line, fork.depth + 1, activeLine));
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

  private rootPill(root: OutlineLine, activeLine: number): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ts-outline-pill ts-outline-root';
    if (activeLine === 0) button.classList.add('ts-outline-here');
    button.append(
      span('ts-outline-name', 'root'),
      span('ts-outline-cmd', `${root.start ?? '—'} → ${root.end ?? '—'}`),
      span('ts-outline-spacer', ''),
      span('ts-outline-turns', String(root.turns)),
    );
    button.addEventListener('click', () => this.delegate.onSelectLine(0));
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

  private linePill(line: OutlineLine, depth: number, activeLine: number): HTMLElement {
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
