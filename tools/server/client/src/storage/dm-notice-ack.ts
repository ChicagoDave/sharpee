/**
 * Durable acknowledgment of the one-time DM recording notice (ADR-153
 * Decision 11; Plan 04 Phase 5). Global per browser, not per room — the
 * notice is a property of the protocol, not a property of any specific
 * room, so once the user has read it anywhere, they don't need to see it
 * again on a different room.
 *
 * Public interface: {@link readDmNoticeAck}, {@link writeDmNoticeAck}.
 *
 * Bounded context: client-side persistence (ADR-153 Decision 3).
 *
 * Both functions silently no-op (or return false) if localStorage is
 * unavailable. This degrades safely toward "show the notice again" rather
 * than "silently swallow the user's acknowledgment intent."
 */

const KEY = 'sharpee.dm_notice_ack';
const VALUE = '1';

/** True when the user has acknowledged the DM recording notice on this browser. */
export function readDmNoticeAck(): boolean {
  try {
    return window.localStorage.getItem(KEY) === VALUE;
  } catch {
    return false;
  }
}

/** Persist the user's acknowledgment of the DM recording notice. */
export function writeDmNoticeAck(): void {
  try {
    window.localStorage.setItem(KEY, VALUE);
  } catch {
    // ignore — the user will see the notice again next session
  }
}
