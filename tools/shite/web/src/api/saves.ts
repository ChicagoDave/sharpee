/**
 * @module zifmia/web/api/saves
 * @purpose Typed wrappers around the per-room named-save HTTP routes:
 *   - `GET /rooms/:id/saves` — list
 *   - `POST /rooms/:id/saves` — create
 *   - `POST /rooms/:id/restore` — restore (body: `{saveId}`)
 *   No update or delete endpoints exist server-side in v1
 *   (`feedback_no_save_delete`; rename deferred).
 * @owner Zifmia web client.
 */

import { requestJson, type HttpClientOptions } from './http';
import type {
  ApiResult,
  CreateNamedSaveRequest,
  NamedSave,
  RestoreResponse
} from './types';

/** `GET /rooms/:id/saves` — auth-required. */
export function listNamedSaves(
  roomId: string,
  options: HttpClientOptions
): Promise<ApiResult<NamedSave[]>> {
  return requestJson<NamedSave[]>(
    `/rooms/${encodeURIComponent(roomId)}/saves`,
    { method: 'GET' },
    options
  );
}

/**
 * `POST /rooms/:id/saves` — auth-required; 201 returns the created
 * `NamedSave`. 400 `invalid_body`, `no_turns_yet`, `turn_not_saved`.
 */
export function createNamedSave(
  roomId: string,
  body: CreateNamedSaveRequest,
  options: HttpClientOptions
): Promise<ApiResult<NamedSave>> {
  return requestJson<NamedSave>(
    `/rooms/${encodeURIComponent(roomId)}/saves`,
    { method: 'POST', body: JSON.stringify(body) },
    options
  );
}

/**
 * `POST /rooms/:id/restore` — auth-required; 200 returns `{roomId,
 * atTurn}`. 404 `save_not_found`, 409 `save_room_mismatch`, 500
 * `restore_failed`. Server fans `room:restored` to subscribers.
 */
export function restoreNamedSave(
  roomId: string,
  saveId: string,
  options: HttpClientOptions
): Promise<ApiResult<RestoreResponse>> {
  return requestJson<RestoreResponse>(
    `/rooms/${encodeURIComponent(roomId)}/restore`,
    { method: 'POST', body: JSON.stringify({ saveId }) },
    options
  );
}
