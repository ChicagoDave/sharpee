/**
 * turn-events.ts — the IDE recording bridge (ADR-277 D5).
 *
 * Purpose: after a turn's response has fully rendered, post
 *   `{ command, response }` to the embedding WKWebView's `turnEvents`
 *   message handler so the Sharpee IDE can record play into a draft
 *   `.transcript`. This ships in the same client bundle authors' players
 *   use, so outside the IDE (no `window.webkit`) it MUST be a true no-op —
 *   never a throw, never a behavior difference.
 * Public interface: emitTurnEvent(command, response).
 * Owner context: @sharpee/platform-browser (browser player client).
 */

/** One recorded turn on the wire: the typed command and its rendered response. */
export interface TurnEventPayload {
  command: string;
  response: string;
}

/**
 * Posts a completed turn to the IDE's `turnEvents` bridge when embedded in a
 * WKWebView that registered one; silently does nothing otherwise.
 *
 * @param command  The player's typed command (no `> ` prefix).
 * @param response The turn's rendered response text (paragraphs joined with
 *                 blank lines), as displayed.
 */
export function emitTurnEvent(command: string, response: string): void {
  const handler = (window as unknown as {
    webkit?: { messageHandlers?: { turnEvents?: { postMessage(body: string): void } } };
  }).webkit?.messageHandlers?.turnEvents;
  if (!handler) return;
  const payload: TurnEventPayload = { command, response };
  try {
    handler.postMessage(JSON.stringify(payload));
  } catch {
    // The bridge is best-effort observation — play must never break on it.
  }
}
