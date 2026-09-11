/**
 * The input box acts on the ending's *state*, not on its prose
 * (ADR-347 D3a, AC-6; GH #414 defect 3).
 *
 * The old client was told the story had ended only through the
 * `endgame` channel's message string, which it could print and not act
 * on — so the box stayed live over a dead engine. These tests drive the
 * `story-ending` renderer with **no prose at all**: if the box disables,
 * it disabled from the record.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createStoryEndingChannelRenderer } from '../src/channels/story-ending';

describe('story-ending channel renderer (ADR-347 D3a)', () => {
  let input: HTMLInputElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);
  });

  it('AC-6: disables the input from the Ending record, with no prose involved', () => {
    const renderer = createStoryEndingChannelRenderer(input);
    // PRECONDITION: the player can type.
    expect(input.disabled).toBe(false);

    renderer.onValue({ kind: 'victory', turn: 12, messageId: 'won.phrase' });

    expect(input.disabled).toBe(true);
    expect(input.getAttribute('data-story-ended')).toBe('victory');
  });

  it('records which kind of ending it was, so a page can style the two apart', () => {
    createStoryEndingChannelRenderer(input).onValue({ kind: 'defeat', cause: 'grue' });
    expect(input.getAttribute('data-story-ended')).toBe('defeat');
  });

  it('re-enables on the clear signal — an UNDO or RESTORE back to a live turn', () => {
    const renderer = createStoryEndingChannelRenderer(input);
    renderer.onValue({ kind: 'victory', turn: 12 });
    expect(input.disabled).toBe(true);

    renderer.onValue(null);

    expect(input.disabled).toBe(false);
    expect(input.hasAttribute('data-story-ended')).toBe(false);
  });

  it('leaves the input alone for a value it does not recognise', () => {
    // A story may override the channel. Guessing here would lock a player
    // out of their own game, so an unrecognised payload changes nothing.
    const renderer = createStoryEndingChannelRenderer(input);
    renderer.onValue({ kind: 'intermission' });
    expect(input.disabled).toBe(false);

    renderer.onValue('*** You have won ***');
    expect(input.disabled).toBe(false);

    renderer.onValue(undefined);
    expect(input.disabled).toBe(false);
  });
});
