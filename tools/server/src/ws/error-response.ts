/**
 * Canonical WebSocket error envelope.
 *
 * Public interface: {@link buildErrorMsg}, {@link sendErr}.
 * Bounded context: client-facing wire protocol (ADR-153 Decision 15).
 *
 * Every WebSocket handler emits rejection errors via this helper so the
 * wire shape is uniform. The shape matches `{ kind: 'error', code, detail }`
 * already declared in `wire/browser-server.ts` — this module exists to
 * concentrate construction + delivery in one place, avoiding 15 slightly
 * different `try { ws.send(JSON.stringify(...)) } catch { }` copies.
 */

import type { WebSocket } from 'ws';
import type { ServerMsg } from '../wire/browser-server.js';

/** Construct an `error` frame. Pure — never touches a socket. */
export function buildErrorMsg(code: string, detail: string): ServerMsg {
  return { kind: 'error', code, detail };
}

/**
 * Send an `error` frame to a single socket. Swallows send-time failures
 * because the socket may already be tearing down — the per-socket close
 * handler will reap the registry entry either way.
 */
export function sendErr(ws: WebSocket, code: string, detail: string): void {
  try {
    ws.send(JSON.stringify(buildErrorMsg(code, detail)));
  } catch {
    /* socket down; nothing to do */
  }
}
