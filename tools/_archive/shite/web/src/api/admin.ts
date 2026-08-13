/**
 * @module zifmia/web/api/admin
 * @purpose Typed wrappers around the admin HTTP routes for the
 *   Phase 6f-admin dashboard:
 *   - `GET /admin/stories`, `POST /admin/stories`, `DELETE /admin/stories/:id`
 *   - `DELETE /admin/rooms/:id`
 *   - `GET /admin/audit?sinceTs=&limit=`
 *   - `GET /admin/identities?handle=`
 *   - `POST /admin/identities/:id/passcode_reset`
 * @owner Zifmia web client.
 *
 * All endpoints are gated server-side by the [auth, admin] preHandler
 * chain — a non-admin token returns 403. The client also gates the
 * `#admin` route on `identity.isAdmin` so unauthorized users never
 * reach the API in the first place.
 */

import { requestJson, type HttpClientOptions } from './http';
import type {
  AdminAuditResponse,
  AdminEraseResponse,
  AdminIdentitiesResponse,
  AdminStoriesResponse,
  AdminStoryEntry,
  ApiResult
} from './types';

/** `GET /admin/stories`. */
export function listAdminStories(
  options: HttpClientOptions
): Promise<ApiResult<AdminStoriesResponse>> {
  return requestJson<AdminStoriesResponse>(
    '/admin/stories',
    { method: 'GET' },
    options
  );
}

/**
 * `POST /admin/stories` — upload a bundle as
 * `application/octet-stream`. The body must be the raw bundle bytes
 * (a `Uint8Array`/`ArrayBuffer`).
 */
export async function uploadAdminStory(
  bundle: ArrayBuffer | Uint8Array,
  options: HttpClientOptions
): Promise<ApiResult<AdminStoryEntry>> {
  // `application/octet-stream` body — the auth middleware can't read
  // `handle` from a binary body, so we append it as `?handle=...`.
  const base = `${options.baseUrl ?? ''}/admin/stories`;
  const url =
    options.handle != null
      ? `${base}?handle=${encodeURIComponent(options.handle)}`
      : base;
  const headers = new Headers();
  headers.set('content-type', 'application/octet-stream');
  const doFetch = options.fetchImpl ?? fetch;
  const response = await doFetch(url, {
    method: 'POST',
    headers,
    body: bundle
  });
  const text = await response.text();
  const body = text.length > 0 ? (JSON.parse(text) as unknown) : undefined;
  if (response.ok) {
    return { ok: true, value: body as AdminStoryEntry };
  }
  const envelope = (body ?? {}) as { error?: string; detail?: string };
  return {
    ok: false,
    status: response.status,
    error: envelope.error ?? 'unknown_error',
    detail: envelope.detail
  };
}

/** `DELETE /admin/stories/:id` — removes every version of the story. */
export function removeAdminStory(
  storyId: string,
  options: HttpClientOptions
): Promise<ApiResult<undefined>> {
  return requestJson<undefined>(
    `/admin/stories/${encodeURIComponent(storyId)}`,
    { method: 'DELETE' },
    options
  );
}

/** `DELETE /admin/rooms/:id` — soft-closes the room. */
export function killAdminRoom(
  roomId: string,
  options: HttpClientOptions
): Promise<ApiResult<undefined>> {
  return requestJson<undefined>(
    `/admin/rooms/${encodeURIComponent(roomId)}`,
    { method: 'DELETE' },
    options
  );
}

export interface AuditQuery {
  sinceTs?: number;
  limit?: number;
}

/** `GET /admin/audit?sinceTs=&limit=`. */
export function listAdminAudit(
  query: AuditQuery,
  options: HttpClientOptions
): Promise<ApiResult<AdminAuditResponse>> {
  const params = new URLSearchParams();
  if (query.sinceTs !== undefined) params.set('sinceTs', String(query.sinceTs));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const qs = params.toString();
  return requestJson<AdminAuditResponse>(
    `/admin/audit${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
    options
  );
}

/**
 * `GET /admin/identities?target=...` — exact-match lookup.
 * The route accepts `?target=` (not `?handle=`) so it doesn't
 * collide with the auth middleware which consumes `?handle=` for the
 * admin caller's own credentials.
 */
export function lookupAdminIdentities(
  target: string,
  options: HttpClientOptions
): Promise<ApiResult<AdminIdentitiesResponse>> {
  return requestJson<AdminIdentitiesResponse>(
    `/admin/identities?target=${encodeURIComponent(target)}`,
    { method: 'GET' },
    options
  );
}

/**
 * `POST /admin/identities/:id/erase` — admin-driven hard delete.
 * Replaces the previous passcode-reset endpoint per the 2026-05-12
 * ADR-161 amendment (there's no passcode to reset). The user
 * obtains their freed handle out-of-band; they re-claim it via
 * `POST /api/identities`.
 */
export function eraseAdminIdentity(
  identityId: string,
  options: HttpClientOptions
): Promise<ApiResult<AdminEraseResponse>> {
  return requestJson<AdminEraseResponse>(
    `/admin/identities/${encodeURIComponent(identityId)}/erase`,
    { method: 'POST' },
    options
  );
}
