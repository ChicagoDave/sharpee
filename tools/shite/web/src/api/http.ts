/**
 * @module zifmia/web/api/http
 * @purpose Thin `fetch` wrapper that normalizes responses into the
 *   `ApiResult<T>` discriminated union. Centralizes JSON parsing,
 *   handle injection, and the 2xx/4xx/5xx branching every manager
 *   needs.
 * @owner Zifmia web client.
 *
 * Per the 2026-05-12 ADR-161 amendment, identity auth is the user's
 * `handle` carried in-band: for POST/PUT/DELETE the wrapper merges
 * `handle` into the JSON body; for GET it appends `?handle=...` to
 * the URL. The HTTP layer is therefore "just JSON, plus a handle
 * field everywhere"; there are no headers, no bearer tokens.
 */

import type { ApiResult } from './types';

export interface HttpClientOptions {
  /** Base URL (defaults to the page origin in the browser; tests
   * inject `http://127.0.0.1:<port>`). */
  baseUrl?: string;
  /** Caller's handle — the ADR-161-amended credential. Omitted when
   * the route is public (`POST /api/identities`, `GET /rooms`,
   * `GET /stories`, `GET /health`). */
  handle?: string | null;
  /** `fetch` implementation override — primarily a test seam. */
  fetchImpl?: typeof fetch;
}

/**
 * Issue a JSON request and return an `ApiResult<T>`. Merges the
 * caller's `handle` into the request:
 *  - body methods (POST/PUT/DELETE) — `handle` is spliced into the
 *    JSON body object the caller supplied
 *  - GET / methods with no body — `?handle=...` is appended to the URL
 *
 * The function never throws on a parseable HTTP response; the only
 * `throw`s come from network failure or non-JSON responses, in which
 * case the caller sees the underlying error.
 */
export async function requestJson<T>(
  path: string,
  init: RequestInit & { method: string },
  options: HttpClientOptions = {}
): Promise<ApiResult<T>> {
  const handle = options.handle ?? null;
  let urlPath = path;
  let finalInit: RequestInit & { method: string } = { ...init };

  if (init.body !== undefined && handle !== null) {
    // The caller passed a body (already JSON-stringified by the
    // wrapper functions above). Re-parse, splice in `handle`, and
    // re-stringify so the server can read it from `body.handle`.
    try {
      const original = JSON.parse(String(init.body)) as Record<string, unknown>;
      finalInit = {
        ...init,
        body: JSON.stringify({ ...original, handle })
      };
    } catch {
      // The body wasn't valid JSON (e.g., a Blob / Uint8Array for
      // bundle upload). Fall back to ?handle= in the query string.
      urlPath = appendHandleQuery(urlPath, handle);
    }
  } else if (handle !== null) {
    urlPath = appendHandleQuery(urlPath, handle);
  }

  const headers = new Headers(init.headers ?? {});
  if (init.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const url = `${options.baseUrl ?? ''}${urlPath}`;
  const doFetch = options.fetchImpl ?? fetch;
  const response = await doFetch(url, { ...finalInit, headers });

  const text = await response.text();
  const body = text.length > 0 ? (JSON.parse(text) as unknown) : undefined;

  if (response.ok) {
    return { ok: true, value: body as T };
  }
  const envelope = (body ?? {}) as { error?: string; detail?: string };
  return {
    ok: false,
    status: response.status,
    error: envelope.error ?? 'unknown_error',
    detail: envelope.detail
  };
}

function appendHandleQuery(path: string, handle: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}handle=${encodeURIComponent(handle)}`;
}
