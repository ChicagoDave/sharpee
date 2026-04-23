/**
 * Thin JSON fetch wrapper and typed endpoint helpers.
 *
 * Public interface: {@link ApiError}, {@link getJson}, {@link postJson},
 * {@link listStories}, {@link listRooms}.
 *
 * Bounded context: HTTP client for the multi-user browser client.
 * `fetch` is called relatively (`/api/*`) so the Vite dev proxy and the
 * production Node server both serve from the same origin.
 *
 * Errors: any non-2xx response throws an {@link ApiError} carrying the
 * server's `{code, detail}` envelope if the body parses as JSON. The UI
 * layer is responsible for translating error codes into user copy.
 */

import type {
  CreateRoomRequest,
  CreateRoomResponse,
  ErrorEnvelope,
  JoinRoomRequest,
  JoinRoomResponse,
  ListRoomsResponse,
  ListStoriesResponse,
} from '../types/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;

  constructor(status: number, envelope: ErrorEnvelope) {
    super(`${envelope.code}: ${envelope.detail}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = envelope.code;
    this.detail = envelope.detail;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  const fallback: ErrorEnvelope = {
    code: `http_${res.status}`,
    detail: res.statusText || 'request failed',
  };
  try {
    const body = (await res.json()) as Partial<ErrorEnvelope>;
    return new ApiError(res.status, {
      code: typeof body.code === 'string' ? body.code : fallback.code,
      detail: typeof body.detail === 'string' ? body.detail : fallback.detail,
    });
  } catch {
    return new ApiError(res.status, fallback);
  }
}

/** GET a JSON endpoint and return a typed body. Throws ApiError on non-2xx. */
export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    method: 'GET',
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

/** POST a JSON body to an endpoint and return a typed body. Throws on non-2xx. */
export async function postJson<TBody, TResp>(
  path: string,
  body: TBody,
  init?: RequestInit,
): Promise<TResp> {
  const res = await fetch(path, {
    ...init,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as TResp;
}

// ---------- endpoint helpers ----------

export function listStories(): Promise<ListStoriesResponse> {
  return getJson<ListStoriesResponse>('/api/stories');
}

export function listRooms(): Promise<ListRoomsResponse> {
  return getJson<ListRoomsResponse>('/api/rooms');
}

export function createRoom(body: CreateRoomRequest): Promise<CreateRoomResponse> {
  return postJson<CreateRoomRequest, CreateRoomResponse>('/api/rooms', body);
}

export function joinRoom(
  room_id: string,
  body: JoinRoomRequest,
): Promise<JoinRoomResponse> {
  return postJson<JoinRoomRequest, JoinRoomResponse>(`/api/rooms/${room_id}/join`, body);
}
