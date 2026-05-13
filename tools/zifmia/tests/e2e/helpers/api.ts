/**
 * Thin HTTP helpers for E2E specs.
 *
 * Owner: zifmia e2e harness.
 *
 * These hit the real spawned server over HTTP. They are NOT a stub of
 * the server — every call goes through Fastify on the production
 * code path.
 */

export interface ClaimIdentityResponse {
  id: string;
  handle: string;
  is_admin: boolean;
}

export interface CreateRoomResponse {
  room: {
    id: string;
    join_code: string;
    title: string;
    story_slug: string;
    primary_host_id: string;
    pinned: boolean;
  };
  participant: {
    id: string;
    room_id: string;
    identity_id: string;
    tier: string;
    is_successor: boolean;
    muted: boolean;
  };
}

async function postJSON<T>(baseURL: string, path: string, body: unknown, expectedStatus: number): Promise<T> {
  const res = await fetch(`${baseURL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (res.status !== expectedStatus) {
    throw new Error(`POST ${path} expected ${expectedStatus}, got ${res.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export async function claimIdentity(baseURL: string, handle: string): Promise<ClaimIdentityResponse> {
  return postJSON<ClaimIdentityResponse>(baseURL, '/api/identities', { handle }, 201);
}

export async function createRoom(
  baseURL: string,
  handle: string,
  story_slug: string,
  title: string
): Promise<CreateRoomResponse> {
  return postJSON<CreateRoomResponse>(baseURL, '/api/rooms', { handle, story_slug, title }, 201);
}

export async function joinRoom(
  baseURL: string,
  roomId: string,
  handle: string
): Promise<{ participant: { tier: string } }> {
  return postJSON(baseURL, `/api/rooms/${roomId}/join`, { handle }, 200);
}

export async function rawPost(
  baseURL: string,
  path: string,
  body: unknown
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${baseURL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // body wasn't JSON; keep raw text
  }
  return { status: res.status, body: parsed };
}

export async function getJSON<T>(baseURL: string, path: string): Promise<T> {
  const res = await fetch(`${baseURL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return (await res.json()) as T;
}
