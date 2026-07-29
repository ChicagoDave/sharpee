/**
 * InputManager's document-click focus handler vs. text selection.
 *
 * The handler exists so an author can type without clicking the command box
 * first. But a drag that selects prose ENDS in a click, and focusing an input
 * collapses the document selection — so the unguarded handler destroyed every
 * selection at the moment it was made. Reading the transcript is a first-class
 * use of the pane, and the IDE's selection-aware bless (ADR-282 D2) samples
 * `window.getSelection()` from the live page, so it read "" every time.
 *
 * These pin both halves: the guard fires on a live selection, and the
 * convenience still works when there is none.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputManager } from '../src/managers/InputManager';

describe('InputManager document-click focus', () => {
  let commandInput: HTMLInputElement;
  let prose: HTMLParagraphElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    // The selection outlives the nodes it pointed at, so it must be cleared
    // explicitly or a selecting test poisons every test after it.
    window.getSelection()?.removeAllRanges();

    prose = document.createElement('p');
    prose.textContent = 'The cellar door hangs open, and the dark below is patient.';
    document.body.appendChild(prose);

    commandInput = document.createElement('input');
    commandInput.type = 'text';
    document.body.appendChild(commandInput);

    new InputManager({
      commandInput,
      onCommand: async () => {},
      isDialogOpen: () => false,
    }).setupHandlers();
  });

  /** Puts a real, non-collapsed selection across the prose node. */
  function selectProse(): void {
    const range = document.createRange();
    range.selectNodeContents(prose);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  }

  it('leaves focus alone while a selection is live, so the selection survives', () => {
    selectProse();
    expect(window.getSelection()!.isCollapsed).toBe(false);

    const focus = vi.spyOn(commandInput, 'focus');
    prose.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(focus).not.toHaveBeenCalled();
    // The state that actually matters: what bless would read off the page.
    expect(window.getSelection()!.toString()).toContain('the dark below is patient');
  });

  it('still focuses the input on an ordinary click with no selection', () => {
    expect(window.getSelection()!.isCollapsed).toBe(true);

    const focus = vi.spyOn(commandInput, 'focus');
    prose.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(focus).toHaveBeenCalled();
  });

  it('does not focus a disabled input even with no selection', () => {
    commandInput.disabled = true;

    const focus = vi.spyOn(commandInput, 'focus');
    prose.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(focus).not.toHaveBeenCalled();
  });
});
