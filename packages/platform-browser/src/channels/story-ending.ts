/**
 * @sharpee/platform-browser/channels/story-ending — `story-ending`
 * channel renderer.
 *
 * Owner context: browser default. The client half of ADR-347 D3a, and
 * the fix for GH #414 defect 3: the input box used to stay live after
 * the story ended, because the only thing the client was told about an
 * ending was the `endgame` channel's prose. Prose can be printed; it
 * cannot be asked "has this story ended". This renderer reads the
 * state-mode sibling that can.
 *
 * It changes one thing — whether the player may type. The end-game
 * prompt itself is not this renderer's business: the engine derives it
 * from the same Ending and it arrives on the `prompt` channel as
 * resolved text, so no English lives here.
 *
 * Public interface: `createStoryEndingChannelRenderer`,
 * `applyStoryEndingToInput`.
 */

import type { ChannelRenderer } from '@sharpee/channel-service';
import type { IStoryEnding } from '@sharpee/if-domain';

/** Whether a channel value is an `IStoryEnding` rather than something else. */
function isStoryEnding(value: unknown): value is IStoryEnding {
  if (typeof value !== 'object' || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return kind === 'victory' || kind === 'defeat';
}

/**
 * Apply an ending state to the input element: an `IStoryEnding` disables
 * it, the clear signal (`null`) re-enables it, anything else leaves it
 * alone.
 *
 * Exported because the channel is not the only way this state arrives.
 * A restore that happens *between* turns — the boot-time autosave
 * restore, or the restore menu — runs no turn and so produces no
 * channel packet, and the client reads the world directly at those two
 * seams. Same fact, same owner, one implementation of what to do about
 * it.
 *
 * @param input — the `<input>` element the user types into.
 * @param value — an `IStoryEnding`, `null` to clear, or anything else to
 *   leave the input untouched.
 */
export function applyStoryEndingToInput(input: HTMLInputElement, value: unknown): void {
  if (isStoryEnding(value)) {
    input.disabled = true;
    input.setAttribute('data-story-ended', value.kind);
    return;
  }
  if (value === null) {
    input.disabled = false;
    input.removeAttribute('data-story-ended');
  }
}

/**
 * Construct the default browser `story-ending` channel renderer.
 *
 * An `IStoryEnding` disables the input; `null` — the channel's clear
 * signal, sent when a RESTORE or UNDO takes the player back to a live
 * turn — re-enables it. Anything else is left alone rather than guessed
 * at, so a story that overrides the channel with its own payload does
 * not silently lock the player out.
 *
 * @param input — the `<input>` element the user types into.
 */
export function createStoryEndingChannelRenderer(input: HTMLInputElement): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      applyStoryEndingToInput(input, value);
    },
  };
}
