/**
 * @sharpee/platform-browser/channels/prompt — `prompt` channel renderer.
 *
 * Owner context: browser default. Implements ADR-165 §8 prompt-channel
 * behavior: set the input slot's prompt label.
 *
 * The `prompt` channel is replace-mode text. The renderer:
 *  - Sets the input element's `placeholder` (so the prompt text shows
 *    when the field is empty), and
 *  - Updates a sibling label element if one is provided (so a "> "
 *    prompt prefix can render outside the input).
 */

import type { ChannelRenderer } from '@sharpee/channel-service';

export interface PromptChannelRendererOptions {
  /**
   * Optional sibling label element that displays the prompt text
   * outside the input field (e.g., a `<span>` rendering "> "). The
   * renderer sets its `textContent`. When omitted, only the input
   * placeholder is updated.
   */
  promptLabel?: HTMLElement | null;
}

/**
 * Construct the default browser `prompt` channel renderer.
 *
 * @param input — the `<input>` element the user types into.
 * @param opts.promptLabel — optional sibling label element.
 */
export function createPromptChannelRenderer(
  input: HTMLInputElement,
  opts: PromptChannelRendererOptions = {},
): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (typeof value !== 'string') return;
      input.placeholder = value;
      if (opts.promptLabel) {
        opts.promptLabel.textContent = value;
      }
    },
  };
}
