/**
 * @sharpee/platform-browser/channels/notify — `death`, `endgame`,
 * `score_notify` channel renderers.
 *
 * Owner context: browser default. Implements ADR-165 §8 notification
 * behavior: render a transient toast or modal in the `notify` slot
 * for each notification kind.
 *
 * All three are event-mode channels (sparse). Each emission produces
 * a new DOM node appended to the notify slot; existing notifications
 * stay so the player can read multiple in sequence (a death + a
 * final score, for example). A `data-kind` attribute marks each so
 * stories can style them with `[data-kind="death"]` selectors.
 */

import type { ChannelRenderer } from '@sharpee/channel-service';

export interface NotifyChannelRendererOptions {
  /**
   * Optional auto-dismiss delay (ms). When set, notifications are
   * removed from the DOM after this many milliseconds. Useful for
   * `score_notify` toasts that should fade. Defaults to undefined
   * (never auto-dismiss; suitable for `death` and `endgame`).
   */
  dismissAfterMs?: number;
}

function appendNotification(
  slot: HTMLElement,
  text: string,
  kind: 'death' | 'endgame' | 'score_notify',
  opts: NotifyChannelRendererOptions,
): void {
  const doc = slot.ownerDocument;
  const div = doc.createElement('div');
  div.classList.add('notify', `notify-${kind}`);
  div.setAttribute('data-kind', kind);
  div.setAttribute('role', 'alert');
  div.textContent = text;
  slot.appendChild(div);
  if (typeof opts.dismissAfterMs === 'number' && opts.dismissAfterMs > 0) {
    const dismissAfter = opts.dismissAfterMs;
    const w = doc.defaultView;
    if (w) {
      w.setTimeout(() => {
        if (div.parentNode === slot) slot.removeChild(div);
      }, dismissAfter);
    }
  }
}

/**
 * `death` channel — event, text. Renders a persistent death notice.
 */
export function createDeathChannelRenderer(slot: HTMLElement): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (typeof value !== 'string') return;
      appendNotification(slot, value, 'death', {});
    },
  };
}

/**
 * `endgame` channel — event, text. Renders a persistent endgame
 * notice (game won or game lost).
 */
export function createEndgameChannelRenderer(slot: HTMLElement): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (typeof value !== 'string') return;
      appendNotification(slot, value, 'endgame', {});
    },
  };
}

/**
 * `score_notify` channel — event, text. Renders a transient toast.
 * Default `dismissAfterMs` is 4000 (4 seconds).
 */
export function createScoreNotifyChannelRenderer(
  slot: HTMLElement,
  opts: NotifyChannelRendererOptions = {},
): ChannelRenderer {
  const effective: NotifyChannelRendererOptions = {
    dismissAfterMs: opts.dismissAfterMs ?? 4000,
  };
  return {
    onValue(value: unknown): void {
      if (typeof value !== 'string') return;
      appendNotification(slot, value, 'score_notify', effective);
    },
  };
}
