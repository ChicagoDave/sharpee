/**
 * Error envelope — uniform 4xx/5xx JSON shape across every route.
 *
 * Public interface: {@link HttpError}, {@link installErrorEnvelope}, {@link ErrorEnvelope}.
 * Bounded context: HTTP layer. The same `{ code, detail }` shape is used by
 * the WebSocket `ServerMsg { kind: 'error' }` (ADR-153 Interface Contracts),
 * so clients can render one error UI regardless of transport.
 */

import type { Hono, Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export interface ErrorEnvelope {
  code: string;
  detail: string;
}

/**
 * Sub-class of Hono's HTTPException that carries a machine-readable error code.
 * Routes throw this and the error handler formats the envelope.
 */
export class HttpError extends HTTPException {
  public readonly code: string;
  constructor(status: 400 | 401 | 403 | 404 | 409 | 429 | 500, code: string, detail: string) {
    super(status, { message: detail });
    this.code = code;
  }
}

/**
 * Install the shared error handler on a Hono app.
 *
 * - {@link HttpError} → the declared status with `{ code, detail }`
 * - unknown errors → 500 with `{ code: 'internal_error', detail: 'unexpected server error' }`
 *
 * @param app the Hono app to install the handler on
 */
export function installErrorEnvelope(app: Hono): void {
  app.onError((err, c: Context) => {
    if (err instanceof HttpError) {
      return c.json<ErrorEnvelope>({ code: err.code, detail: err.message }, err.status);
    }
    // Hono's own HTTPException (e.g. from c.req.json() on bad JSON) — surface a generic code.
    if (err instanceof HTTPException) {
      return c.json<ErrorEnvelope>({ code: 'bad_request', detail: err.message }, err.status);
    }
    // Anything else is unexpected. Log and return a generic 500.
    console.error('[sharpee-server] unhandled error:', err);
    return c.json<ErrorEnvelope>(
      { code: 'internal_error', detail: 'unexpected server error' },
      500
    );
  });
}
