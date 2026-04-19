/**
 * Durable session token helpers.
 *
 * Public interface: {@link generateToken}, {@link parseBearer}.
 * Bounded context: HTTP + WebSocket auth (ADR-153 Decision 4).
 *
 * Tokens are opaque UUIDv4 strings — no signing, no expiry, no JWT. The
 * server resolves a token to a participant via the `participants.token`
 * column. Clients persist the token in localStorage keyed by the room URL;
 * losing the token means losing the seat.
 */

import { randomUUID } from 'node:crypto';

/** Generate a fresh durable session token. */
export function generateToken(): string {
  return randomUUID();
}

/**
 * Extract a bearer token from an Authorization header value.
 *
 * @param header raw header value (may be undefined)
 * @returns the token string, or null if the header is absent or malformed
 */
export function parseBearer(header: string | undefined | null): string | null {
  if (!header) return null;
  const m = header.match(/^\s*Bearer\s+(\S+)\s*$/i);
  return m ? m[1]! : null;
}
