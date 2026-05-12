/**
 * @module zifmia/web/api/identity
 * @purpose Typed wrappers around the three identity HTTP routes.
 *   Returns `ApiResult` envelopes so callers branch on `ok` without
 *   try/catch for expected failures.
 * @owner Zifmia web client.
 */

import { requestJson, type HttpClientOptions } from './http';
import type { ApiResult, IdentityMe, SessionResponse } from './types';

export interface Credentials {
  handle: string;
  passcode: string;
}

/** `POST /identity/register` — 201 on success; 409 handle_taken; 400 on validation. */
export function register(
  creds: Credentials,
  options: HttpClientOptions = {}
): Promise<ApiResult<SessionResponse>> {
  return requestJson<SessionResponse>(
    '/identity/register',
    { method: 'POST', body: JSON.stringify(creds) },
    options
  );
}

/** `POST /identity/login` — 200 on success; uniform 401 invalid_credentials otherwise (AC-11). */
export function login(
  creds: Credentials,
  options: HttpClientOptions = {}
): Promise<ApiResult<SessionResponse>> {
  return requestJson<SessionResponse>(
    '/identity/login',
    { method: 'POST', body: JSON.stringify(creds) },
    options
  );
}

/** `GET /identity/me` — auth-gated session bootstrap; 401 invalidates the stored token. */
export function getMe(
  options: HttpClientOptions
): Promise<ApiResult<IdentityMe>> {
  return requestJson<IdentityMe>(
    '/identity/me',
    { method: 'GET' },
    options
  );
}
