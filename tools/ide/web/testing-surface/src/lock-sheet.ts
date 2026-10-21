/**
 * lock-sheet.ts — the lock sheet (ADR-367 D7): the proposed claim, its name,
 * and the three lists as chips the author toggles before Keep.
 *
 * Purpose: D2 says the author owns the set — the proposal is a candidate the
 *   author edits, never a source the walk reads on its own. The sheet is
 *   where the edit happens: the name (the fact by default), then rooms,
 *   things and verbs as chips, each on or off; the cone's trimmed names are
 *   present but struck through and off, so the author sees what the claim
 *   cannot depend on and may still keep it. Keep hands back the lists as
 *   they stand; Cancel hands back nothing. Anchored like a picker and closed
 *   the same way.
 *
 * Public interface: showLockSheet, LockSheetProposal.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { closePicker, mountAnchored } from './picker';
import type { LockNeeds } from './lock';

/** What the sheet shows: the CLI's proposal, as the lock module decoded it. */
export interface LockSheetProposal {
  fact: string;
  name: string;
  rooms: string[];
  things: string[];
  trimmed: string[];
  verbs: string[];
}

/**
 * Show the sheet anchored to a button.
 *
 * @param anchor the Lock… button
 * @param proposal the CLI's proposal
 * @param onKeep the author kept: the name and the lists as they stand
 */
export function showLockSheet(anchor: HTMLElement, proposal: LockSheetProposal, onKeep: (name: string, needs: LockNeeds) => void): void {
  const sheet = mountAnchored(anchor, 'ts-picker ts-lock-sheet');

  const head = document.createElement('div');
  head.className = 'ts-picker-head';
  head.textContent = 'lock this claim';
  sheet.appendChild(head);

  const fact = document.createElement('div');
  fact.className = 'ts-lock-fact';
  fact.textContent = proposal.fact;
  sheet.appendChild(fact);

  const nameInput = document.createElement('input');
  nameInput.className = 'ts-picker-filter ts-lock-name';
  nameInput.value = proposal.name;
  nameInput.title = 'The claim\'s name in the fragment';
  sheet.appendChild(nameInput);

  const trimmed = new Set(proposal.trimmed);
  const rows: Array<{ key: keyof LockNeeds; label: string; names: string[] }> = [
    { key: 'rooms', label: 'needs rooms', names: proposal.rooms },
    { key: 'things', label: 'needs things', names: [...proposal.things, ...proposal.trimmed.filter((name) => !proposal.things.includes(name))] },
    { key: 'verbs', label: 'needs verbs', names: proposal.verbs },
  ];
  const chips = new Map<keyof LockNeeds, Array<{ name: string; on: boolean }>>();
  for (const row of rows) {
    const label = document.createElement('div');
    label.className = 'ts-picker-section';
    label.textContent = row.label;
    sheet.appendChild(label);
    const list = document.createElement('div');
    list.className = 'ts-lock-chips';
    list.dataset.tsLockList = row.key;
    const states = row.names.map((name) => ({ name, on: !trimmed.has(name) }));
    chips.set(row.key, states);
    for (const state of states) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `ts-lock-chip${state.on ? ' ts-on' : ''}${trimmed.has(state.name) ? ' ts-trimmed' : ''}`;
      chip.textContent = state.name;
      chip.title = trimmed.has(state.name) ? 'the claim cannot depend on this — kept off unless you turn it on' : 'click to leave it out';
      chip.addEventListener('click', () => {
        state.on = !state.on;
        chip.classList.toggle('ts-on', state.on);
      });
      list.appendChild(chip);
    }
    if (states.length === 0) {
      const none = document.createElement('span');
      none.className = 'ts-picker-empty';
      none.textContent = '(none)';
      list.appendChild(none);
    }
    sheet.appendChild(list);
  }

  const actions = document.createElement('div');
  actions.className = 'ts-lock-actions';
  const keep = document.createElement('button');
  keep.type = 'button';
  keep.className = 'ts-lock-keep';
  keep.textContent = 'Keep';
  keep.addEventListener('click', () => {
    const picked = (key: keyof LockNeeds): string[] => (chips.get(key) ?? []).filter((state) => state.on).map((state) => state.name);
    const name = nameInput.value.trim() || proposal.fact;
    closePicker();
    onKeep(name, { rooms: picked('rooms'), things: picked('things'), verbs: picked('verbs') });
  });
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'ts-lock-cancel';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => closePicker());
  actions.append(keep, cancel);
  sheet.appendChild(actions);
  nameInput.focus();
}
