/**
 * Durable session-token storage — keyed per room to honour ADR-153's scoping
 * rule that a participant's token is only valid for the room that issued it.
 *
 * Public interface: {@link readToken}, {@link writeToken}, {@link clearToken}.
 *
 * Bounded context: client-side token persistence (ADR-153 Decision 5).
 *
 * Why per-room keys: one browser may hold tokens for multiple rooms
 * simultaneously (Primary Host in room A, Participant in room B). A single
 * `sharpee.token` key would clobber the other side every time the user
 * switches tabs. Keys take the shape `sharpee.token.<roomId>`.
 *
 * All three functions silently no-op (or return null) if localStorage is
 * unavailable — private browsing, quota exceeded, etc. — so a storage fault
 * never breaks the surrounding flow.
 */

function keyFor(roomId: string): string {
  return `sharpee.token.${roomId}`;
}

/**
 * Return the persisted token for this room, or `null` if absent, corrupted,
 * or if storage access throws.
 */
export function readToken(roomId: string): string | null {
  try {
    const value = window.localStorage.getItem(keyFor(roomId));
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Persist a token for this room. No-ops on storage failure. */
export function writeToken(roomId: string, token: string): void {
  if (!roomId || !token) return;
  try {
    window.localStorage.setItem(keyFor(roomId), token);
  } catch {
    // ignore — storage failures must not crash the join flow
  }
}

/** Remove the persisted token for this room. No-ops on storage failure. */
export function clearToken(roomId: string): void {
  try {
    window.localStorage.removeItem(keyFor(roomId));
  } catch {
    // ignore
  }
}
