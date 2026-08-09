/**
 * turn-events.ts — the IDE play-session turn feed (ADR-277 D5, rebuilt for
 * ADR-305 D4).
 *
 * Purpose: after a turn fully renders, post its record — monotonic ordinal,
 * typed command, engine-composed output, structured channel captures — to the
 * embedding WKWebView's `turnEvents` message handler, so the Sharpee IDE can
 * promote played turns into a `.transcript` (ADR-305). A restart posts a
 * fence record instead: everything before it is dead lineage (ADR-305 D3).
 * This ships in the same client bundle authors' players use, so outside the
 * IDE (no `window.webkit`) every export MUST be a true no-op — never a
 * throw, never a behavior difference.
 *
 * The ordinal counter is module state, not client state: an in-page restart
 * boots a NEW BrowserClient but the anchors' one invariant is page-lifetime
 * uniqueness (ADR-305 D4), so the counter must never reset while the page
 * lives.
 *
 * Public interface: nextPlayTurnOrdinal(), emitTurnEvent(payload),
 * emitRestartEvent(), capturesOf(payloads); types TurnCapture,
 * TurnEventPayload, RestartEventPayload.
 * Owner context: @sharpee/platform-browser (browser player client).
 */

/** One channel's captured values for a single turn, structure preserved. */
export interface TurnCapture {
  channel: string;
  /**
   * The channel's values as the turn packet carried them — structured, never
   * flattened here: flattening to assertion fragments is the synthesis
   * module's job, the one implementation (ADR-305 D5).
   */
  values: unknown[];
}

/** One recorded turn on the wire (ADR-305 D4). */
export interface TurnEventPayload {
  /** Monotonic 1-based ordinal, matching the turn's `data-turn` anchors. */
  turn: number;
  /** The player's typed command (no `> ` prefix). */
  command: string;
  /**
   * The turn's composed prose — the ENGINE's text, packets joined the way
   * the headless harness joins them (`packetProseText` per packet, then
   * '\n' across packets — `@sharpee/bootstrap`'s outputBuffer rule), so an
   * `all-emitted-text` block written from play matches replay.
   */
  output: string;
  /** The turn's channel captures. */
  captures: TurnCapture[];
}

/** A restart fence on the wire (ADR-305 D3): `turn` is the first ordinal of
 *  the NEW lineage. */
export interface RestartEventPayload {
  restart: true;
  turn: number;
}

/** Page-lifetime ordinal counter — survives in-page reboots by design. */
let playTurnCounter = 0;

/**
 * Claim the next turn ordinal. Monotonic and 1-based for the page's lifetime;
 * the same value goes on the turn's `data-turn` anchors and its feed record.
 */
export function nextPlayTurnOrdinal(): number {
  playTurnCounter += 1;
  return playTurnCounter;
}

/**
 * Merge the turn's packet payloads into per-channel capture lists, structure
 * preserved. Scalar payload values wrap into one-element lists; list payloads
 * pass through, so downstream consumers always see `unknown[]` per channel.
 */
export function capturesOf(
  payloads: ReadonlyArray<Readonly<Record<string, unknown>>>
): TurnCapture[] {
  const merged = new Map<string, unknown[]>();
  for (const payload of payloads) {
    for (const [channel, value] of Object.entries(payload)) {
      const values = Array.isArray(value) ? value : [value];
      merged.set(channel, [...(merged.get(channel) ?? []), ...values]);
    }
  }
  return [...merged.entries()].map(([channel, values]) => ({ channel, values }));
}

/**
 * Posts a completed turn's record to the IDE's `turnEvents` bridge when
 * embedded in a WKWebView that registered one; silently does nothing
 * otherwise.
 */
export function emitTurnEvent(payload: TurnEventPayload): void {
  post(payload);
}

/**
 * Posts a restart fence (ADR-305 D3) naming the first ordinal of the new
 * lineage. Call when an in-page reboot begins; a full page reload needs no
 * event — the embedder sees the navigation itself.
 */
export function emitRestartEvent(): void {
  const payload: RestartEventPayload = { restart: true, turn: playTurnCounter + 1 };
  post(payload);
}

/** Shared best-effort post — play must never break on the bridge. */
function post(payload: TurnEventPayload | RestartEventPayload): void {
  const handler = (window as unknown as {
    webkit?: { messageHandlers?: { turnEvents?: { postMessage(body: string): void } } };
  }).webkit?.messageHandlers?.turnEvents;
  if (!handler) return;
  try {
    handler.postMessage(JSON.stringify(payload));
  } catch {
    // The bridge is best-effort observation — play must never break on it.
  }
}
