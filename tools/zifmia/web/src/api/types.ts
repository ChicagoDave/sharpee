/**
 * @module zifmia/web/api/types
 * @purpose Wire-type definitions for the Zifmia HTTP API as consumed
 *   by the web client. Mirrors the response shapes emitted by
 *   `tools/zifmia/src/server/*` route handlers.
 * @owner Zifmia web client (tools/zifmia/web).
 *
 * The web bundle and the Fastify server live in the same repo and the
 * same typed language; per CLAUDE.md rule 8b, this file is the wire
 * contract. When the server's response shape changes, this file
 * changes in the same commit. No runtime-specific types
 * (`Buffer`, `fs.Stats`, etc.) appear here so the file remains safe to
 * import from both sides.
 */

/** Successful body of `POST /identity/register` and `POST /identity/login`. */
export interface SessionResponse {
  id: string;
  handle: string;
  sessionToken: string;
}

/** Successful body of `GET /identity/me`. */
export interface IdentityMe {
  id: string;
  handle: string;
  isAdmin: boolean;
}

/** Server error envelopes share a common shape: `{error, detail?}`. */
export interface ServerError {
  error: string;
  detail?: string;
}

/**
 * Discriminated result for client-side API calls. `ok=true` carries
 * the typed response body; `ok=false` carries the server's error
 * envelope plus the HTTP status. Callers branch on `result.ok` and
 * never throw on expected-4xx outcomes.
 */
export type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string; detail?: string };
