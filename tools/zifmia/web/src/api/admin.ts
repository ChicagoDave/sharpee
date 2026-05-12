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
  AdminIdentitiesResponse,
  AdminStoriesResponse,
  AdminStoryEntry,
  ApiResult,
  PasscodeResetResponse
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
  const url = `${options.baseUrl ?? ''}/admin/stories`;
  const headers = new Headers();
  headers.set('content-type', 'application/octet-stream');
  if (options.sessionToken) {
    headers.set('authorization', `Bearer ${options.sessionToken}`);
  }
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

/** `GET /admin/identities?handle=...` — exact-match lookup. */
export function lookupAdminIdentities(
  handle: string,
  options: HttpClientOptions
): Promise<ApiResult<AdminIdentitiesResponse>> {
  return requestJson<AdminIdentitiesResponse>(
    `/admin/identities?handle=${encodeURIComponent(handle)}`,
    { method: 'GET' },
    options
  );
}

/**
 * `POST /admin/identities/:id/passcode_reset` — generates a fresh
 * random passcode for the target identity, persists its hash,
 * invalidates every active session for that identity, and returns
 * the plaintext EXACTLY ONCE in the response body. Callers must not
 * persist or log the plaintext — render it once, let the admin copy
 * it, and release the reference.
 */
export function resetAdminPasscode(
  identityId: string,
  options: HttpClientOptions
): Promise<ApiResult<PasscodeResetResponse>> {
  return requestJson<PasscodeResetResponse>(
    `/admin/identities/${encodeURIComponent(identityId)}/passcode_reset`,
    { method: 'POST' },
    options
  );
}
