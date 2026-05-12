/**
 * @module zifmia/web/api/identity
 * @purpose Typed wrappers around the identity HTTP routes per the
 *   2026-05-12 ADR-161 amendment:
 *   - `POST /api/identities { handle }` — claim a handle. 201 returns
 *     the new identity row; 409 `handle_taken` if the handle is in
 *     use; 400 `invalid_handle` on malformed input.
 *   - `POST /api/identities/erase { handle }` — hard-delete the
 *     row. 200 on success; 404 `unknown_handle` if absent.
 *
 *   There is NO login route — the handle IS the credential, carried
 *   in-band on every request via the `HttpClientOptions.handle` field.
 * @owner Zifmia web client.
 */

import { requestJson, type HttpClientOptions } from './http';
import type { ApiResult, EraseResponse, IdentityRecord } from './types';

/** `POST /api/identities` — public; claims a handle. */
export function createIdentity(
  handle: string,
  options: HttpClientOptions = {}
): Promise<ApiResult<IdentityRecord>> {
  return requestJson<IdentityRecord>(
    '/api/identities',
    { method: 'POST', body: JSON.stringify({ handle }) },
    // Force `handle: null` so the http wrapper doesn't try to splice
    // `handle` into the body (it's already there explicitly).
    { ...options, handle: null }
  );
}

/** `POST /api/identities/erase` — public; frees the handle. */
export function eraseIdentity(
  handle: string,
  options: HttpClientOptions = {}
): Promise<ApiResult<EraseResponse>> {
  return requestJson<EraseResponse>(
    '/api/identities/erase',
    { method: 'POST', body: JSON.stringify({ handle }) },
    { ...options, handle: null }
  );
}
