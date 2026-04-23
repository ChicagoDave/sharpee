/**
 * Durable join-code storage — per-room, so the room view can render a
 * "Copy code" / "Copy URL" button when the client knew the code at join
 * time. Welcome snapshots don't carry `join_code`, and participants who
 * arrive via `/r/:code` lose the code from the URL once they navigate to
 * `/room/:room_id`, so the client persists what it saw at join.
 *
 * Public interface: {@link readCode}, {@link writeCode}, {@link clearCode}.
 *
 * Bounded context: client-side persistence (ADR-153 Decision 3).
 *
 * Keys take the shape `sharpee.code.<roomId>`. All three functions silently
 * no-op (or return null) if localStorage is unavailable.
 */

function keyFor(roomId: string): string {
  return `sharpee.code.${roomId}`;
}

/** Return the persisted join code for this room, or `null` if absent. */
export function readCode(roomId: string): string | null {
  try {
    const value = window.localStorage.getItem(keyFor(roomId));
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Persist a join code for this room. No-ops on empty inputs or storage failure. */
export function writeCode(roomId: string, code: string): void {
  if (!roomId || !code) return;
  try {
    window.localStorage.setItem(keyFor(roomId), code);
  } catch {
    // ignore
  }
}

/** Remove the persisted join code for this room. No-ops on storage failure. */
export function clearCode(roomId: string): void {
  try {
    window.localStorage.removeItem(keyFor(roomId));
  } catch {
    // ignore
  }
}
