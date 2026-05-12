/**
 * @module zifmia/web/api/rooms
 * @purpose Typed wrappers around the room HTTP routes used by the
 *   lobby and room views — `GET /rooms` (public list) and
 *   `POST /rooms` (auth-required create).
 * @owner Zifmia web client.
 */

import { requestJson, type HttpClientOptions } from './http';
import type {
  ApiResult,
  CreateRoomRequest,
  CreatedRoom,
  RoomStateBody,
  RoomSummary,
  TurnPacketResponse
} from './types';

/** `GET /rooms` — public list of joinable rooms. No auth required. */
export function listRooms(
  options: HttpClientOptions = {}
): Promise<ApiResult<RoomSummary[]>> {
  return requestJson<RoomSummary[]>('/rooms', { method: 'GET' }, options);
}

/**
 * `POST /rooms` — auth-required; 201 on success returns the new room
 * record. 400 `invalid_body` on malformed body, 404 `story_not_found`
 * if the storyId has no active version installed.
 */
export function createRoom(
  body: CreateRoomRequest,
  options: HttpClientOptions
): Promise<ApiResult<CreatedRoom>> {
  return requestJson<CreatedRoom>(
    '/rooms',
    { method: 'POST', body: JSON.stringify(body) },
    options
  );
}

/**
 * `GET /rooms/:id/state` — auth-required mid-session state load.
 * Returns the room's CMGT manifest, transcript window, and reserved
 * `currentValues`. 404 `room_not_found` on unknown room.
 */
export function getRoomState(
  roomId: string,
  options: HttpClientOptions
): Promise<ApiResult<RoomStateBody>> {
  return requestJson<RoomStateBody>(
    `/rooms/${encodeURIComponent(roomId)}/state`,
    { method: 'GET' },
    options
  );
}

/**
 * `POST /rooms/:id/command` — auth-required turn submit. 200 on
 * success returns the typed `TurnPacket` (raw blocks + events +
 * channelPacket). 400 `invalid_body`, 404 `room_not_found`, 410
 * `room_closed`, 500 `turn_failed` on engine throw.
 */
export function postCommand(
  roomId: string,
  command: string,
  options: HttpClientOptions
): Promise<ApiResult<TurnPacketResponse>> {
  return requestJson<TurnPacketResponse>(
    `/rooms/${encodeURIComponent(roomId)}/command`,
    { method: 'POST', body: JSON.stringify({ command }) },
    options
  );
}
