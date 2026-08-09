/**
 * picker.ts — the surface's pickers (ADR-306 Phase 4, design §5).
 *
 * Purpose: the author asserts from LISTS of what the world and the turn
 *   actually hold — never a blank field. The State picker implements ADR-306
 *   D6 (AC-5): ONE type-to-filter list of the world digest's facts with a
 *   Grouped toggle folding the same list into collapsible kind sections; a
 *   live filter auto-expands every group so a hit never hides inside a fold.
 *   Event and Channel pickers are plain lists over the turn's record.
 *
 * Public interface: showStatePicker(anchor, facts, onPick),
 *   showListPicker(anchor, head, items, onPick), closePicker(), StateFact.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

/** One digest fact the State picker offers (D6: kind is presentation only). */
export interface StateFact {
  /** The picker row's display text (e.g. "Tobias — Gravel Drive"). */
  label: string;
  /** The `[STATE:]` expression the pick writes — evaluable by construction. */
  expression: string;
  /** The Grouped toggle's section for this fact. */
  kind: string;
}

let openPickerElement: HTMLElement | null = null;
let outsideListener: ((event: MouseEvent) => void) | null = null;

/** Closes any open picker. */
export function closePicker(): void {
  openPickerElement?.remove();
  openPickerElement = null;
  if (outsideListener) {
    document.removeEventListener('mousedown', outsideListener);
    outsideListener = null;
  }
}

function mountPicker(anchor: HTMLElement): HTMLElement {
  closePicker();
  const menu = document.createElement('div');
  menu.className = 'ts-picker';
  const rect = anchor.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 340))}px`;
  menu.style.top = `${rect.bottom + 4}px`;
  document.body.appendChild(menu);
  openPickerElement = menu;
  outsideListener = event => {
    if (openPickerElement && !openPickerElement.contains(event.target as Node)) closePicker();
  };
  setTimeout(() => {
    if (outsideListener) document.addEventListener('mousedown', outsideListener);
  }, 0);
  return menu;
}

/** A plain list picker (Event…, Channel…): head + clickable rows. */
export function showListPicker(
  anchor: HTMLElement,
  head: string,
  items: string[],
  onPick: (item: string, index: number) => void,
): void {
  const menu = mountPicker(anchor);
  const header = document.createElement('div');
  header.className = 'ts-picker-head';
  header.textContent = head;
  menu.appendChild(header);
  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'ts-picker-empty';
    empty.textContent = 'nothing captured this turn';
    menu.appendChild(empty);
    return;
  }
  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'ts-item';
    row.textContent = item;
    row.addEventListener('click', () => {
      onPick(item, index);
      closePicker();
    });
    menu.appendChild(row);
  });
}

/**
 * The State picker (ADR-306 D6): one searchable list over the digest's
 * facts, a Grouped toggle folding it into collapsible kind sections, and a
 * live filter that auto-expands every fold — a hit never hides.
 */
export function showStatePicker(
  anchor: HTMLElement,
  facts: StateFact[],
  onPick: (fact: StateFact) => void,
): void {
  const menu = mountPicker(anchor);

  const header = document.createElement('div');
  header.className = 'ts-picker-head';
  const title = document.createElement('span');
  title.textContent = 'world after this turn';
  const groupToggle = document.createElement('button');
  groupToggle.className = 'ts-picker-group-toggle';
  groupToggle.textContent = 'Grouped';
  header.append(title, groupToggle);
  menu.appendChild(header);

  const filter = document.createElement('input');
  filter.className = 'ts-picker-filter';
  filter.placeholder = 'filter…';
  menu.appendChild(filter);

  const list = document.createElement('div');
  list.className = 'ts-picker-list';
  menu.appendChild(list);

  let grouped = false;
  /** Kinds the author folded shut; a live filter overrides every fold. */
  const collapsed = new Set<string>();

  const factRow = (fact: StateFact): HTMLElement => {
    const row = document.createElement('div');
    row.className = 'ts-item';
    row.textContent = fact.label;
    row.title = fact.expression;
    row.addEventListener('click', () => {
      onPick(fact);
      closePicker();
    });
    return row;
  };

  const render = (): void => {
    const query = filter.value.trim().toLowerCase();
    const hits = facts.filter(fact =>
      query === '' ||
      fact.label.toLowerCase().includes(query) ||
      fact.expression.toLowerCase().includes(query));
    list.textContent = '';
    if (hits.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ts-picker-empty';
      empty.textContent = facts.length === 0 ? 'no unseen facts this turn' : 'no matches';
      list.appendChild(empty);
      return;
    }
    if (!grouped) {
      for (const fact of hits) list.appendChild(factRow(fact));
      return;
    }
    const kinds = [...new Set(hits.map(fact => fact.kind))];
    for (const kind of kinds) {
      const sectionHead = document.createElement('div');
      sectionHead.className = 'ts-picker-section';
      // A live filter auto-expands every group (D6) — folds only bind when
      // the list is unfiltered.
      const folded = query === '' && collapsed.has(kind);
      sectionHead.textContent = `${folded ? '▸' : '▾'} ${kind}`;
      sectionHead.addEventListener('click', () => {
        if (collapsed.has(kind)) collapsed.delete(kind); else collapsed.add(kind);
        render();
      });
      list.appendChild(sectionHead);
      if (folded) continue;
      for (const fact of hits.filter(f => f.kind === kind)) {
        list.appendChild(factRow(fact));
      }
    }
  };

  groupToggle.addEventListener('click', () => {
    grouped = !grouped;
    groupToggle.classList.toggle('ts-active', grouped);
    render();
  });
  filter.addEventListener('input', render);
  render();
  filter.focus();
}
