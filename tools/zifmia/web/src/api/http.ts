/**
 * @module zifmia/web/api/http
 * @purpose Thin `fetch` wrapper that normalizes responses into the
 *   `ApiResult<T>` discriminated union. Centralizes JSON parsing,
 *   bearer-token injection, and the 2xx/4xx/5xx branching every
 *   manager needs.
 * @owner Zifmia web client.
 */

import type { ApiResult } from './types';

export interface HttpClientOptions {
  /** Base URL (defaults to the page origin in the browser; tests
   * inject `http://127.0.0.1:<port>`). */
  baseUrl?: string;
  /** Bearer token (omitted when calling unauthenticated routes). */
  sessionToken?: string | null;
  /** `fetch` implementation override — primarily a test seam. */
  fetchImpl?: typeof fetch;
}

/**
 * Issue a JSON request and return an `ApiResult<T>`. The function
 * never throws on a parseable HTTP response; the only `throw`s come
 * from network failure or non-JSON responses, in which case the
 * caller sees the underlying error.
 */
export async function requestJson<T>(
  path: string,
  init: RequestInit & { method: string },
  options: HttpClientOptions = {}
): Promise<ApiResult<T>> {
  const url = `${options.baseUrl ?? ''}${path}`;
  const headers = new Headers(init.headers ?? {});
  if (init.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (options.sessionToken) {
    headers.set('authorization', `Bearer ${options.sessionToken}`);
  }
  const doFetch = options.fetchImpl ?? fetch;
  const response = await doFetch(url, { ...init, headers });

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
