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
  CreateIdentityRequest,
  CreateIdentityResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  EraseIdentityRequest,
  EraseIdentityResponse,
  ErrorEnvelope,
  JoinRoomRequest,
  JoinRoomResponse,
  ListRoomsResponse,
  ListStoriesResponse,
  ResolveCodeResponse,
  UploadIdentityRequest,
  UploadIdentityResponse,
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

/**
 * Resolve a public join code (the `/r/:code` fragment) to the room it unlocks.
 * Throws `ApiError` with `code: 'room_not_found'` on 404.
 */
export function resolveCode(code: string): Promise<ResolveCodeResponse> {
  return getJson<ResolveCodeResponse>(`/r/${encodeURIComponent(code)}`);
}

// ---------- ADR-161 identity lifecycle helpers ----------

/**
 * POST /api/identities — create a new persistent identity.
 *
 * The server generates the `id` (Crockford-32) and `passcode` (EFF
 * word-pair); the caller supplies only the desired Handle. The plaintext
 * passcode is returned exactly once and must be persisted by the client
 * (see `identity-store.ts`) — the server cannot recover it later.
 *
 * Throws ApiError with codes `invalid_handle`, `handle_taken`,
 * `missing_field`, or `rate_limited`.
 */
export function createIdentity(
  body: CreateIdentityRequest,
): Promise<CreateIdentityResponse> {
  return postJson<CreateIdentityRequest, CreateIdentityResponse>(
    '/api/identities',
    body,
  );
}

/**
 * POST /api/identities/upload — register or accept an existing identity
 * with the server using the user's downloaded `(id, handle, passcode)`
 * triple.
 *
 * Throws ApiError with codes `malformed_id`, `invalid_handle`,
 * `bad_passcode`, `id_mismatch`, `handle_taken`, `missing_field`, or
 * `rate_limited`. Status 200 means accepted-existing; 201 means
 * registered-new — both responses have the same shape.
 */
export function uploadIdentity(
  body: UploadIdentityRequest,
): Promise<UploadIdentityResponse> {
  return postJson<UploadIdentityRequest, UploadIdentityResponse>(
    '/api/identities/upload',
    body,
  );
}

/**
 * POST /api/identities/erase — hard-delete an identity. Live WS sessions
 * bound to the identity are closed with code 4007 `identity_erased`. The
 * Handle becomes reclaimable.
 *
 * Throws ApiError with codes `unknown_handle`, `bad_passcode`,
 * `missing_field`, or `rate_limited`.
 */
export function eraseIdentity(
  body: EraseIdentityRequest,
): Promise<EraseIdentityResponse> {
  return postJson<EraseIdentityRequest, EraseIdentityResponse>(
    '/api/identities/erase',
    body,
  );
}

export interface RenameRoomResponse {
  room_id: string;
  title: string;
}

/**
 * PATCH /api/rooms/:room_id — Primary Host renames the room.
 * Requires the Host's Bearer token. Non-PH calls resolve to `ApiError` with
 * `code: 'insufficient_authority'`; validation errors follow the same code
 * set as create (`missing_field`, `invalid_title`).
 */
export async function renameRoom(
  room_id: string,
  title: string,
  token: string,
): Promise<RenameRoomResponse> {
  const res = await fetch(`/api/rooms/${encodeURIComponent(room_id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    // parseError is module-local; re-parse inline to avoid exporting it.
    const fallback: ErrorEnvelope = {
      code: `http_${res.status}`,
      detail: res.statusText || 'request failed',
    };
    let envelope: ErrorEnvelope = fallback;
    try {
      const body = (await res.json()) as Partial<ErrorEnvelope>;
      envelope = {
        code: typeof body.code === 'string' ? body.code : fallback.code,
        detail: typeof body.detail === 'string' ? body.detail : fallback.detail,
      };
    } catch {
      /* fall through */
    }
    throw new ApiError(res.status, envelope);
  }
  return (await res.json()) as RenameRoomResponse;
}
