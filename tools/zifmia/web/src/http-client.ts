/**
 * Typed HTTP client for the zifmia API.
 *
 * Public interface: {@link HttpClient}, {@link createHttpClient}.
 * Owner: web client.
 *
 * Every state-changing call carries `handle` in-band per ADR-161
 * amended. The client exposes one method per HTTP route — callers
 * import the typed surface rather than building URLs by hand.
 */

import type { Tier } from '../../src/rooms/types.js';

export interface IdentitySummary {
  readonly id: string;
  readonly handle: string;
  readonly is_admin: boolean;
}

export interface RoomLobbyRow {
  readonly id: string;
  readonly join_code: string;
  readonly title: string;
  readonly story_slug: string;
  readonly pinned: boolean;
  readonly last_activity_at: number;
  readonly participants: ReadonlyArray<{
    readonly identity_id: string;
    readonly handle: string;
    readonly tier: Tier;
  }>;
}

export interface RoomDetail {
  readonly id: string;
  readonly join_code: string;
  readonly title: string;
  readonly story_slug: string;
  readonly pinned: boolean;
  readonly primary_host_id: string;
  readonly recording_notice: string;
}

export interface RosterRow {
  readonly participant_id: string;
  readonly identity_id: string;
  readonly handle: string;
  readonly tier: Tier;
  readonly muted: boolean;
  readonly connected: boolean;
  readonly is_successor: boolean;
}

export interface RoomStateResponse {
  readonly room: RoomDetail;
  readonly cmgt: unknown;
  readonly transcript_backlog: ReadonlyArray<{
    readonly turnId: string;
    readonly channels: Record<string, unknown[]>;
  }>;
  readonly roster: ReadonlyArray<RosterRow>;
  readonly lock: { readonly holder: string | null; readonly expiresAt: number | null };
  readonly grace?: { readonly pending: boolean };
}

export interface StorySummary { readonly slug: string; }

export interface SaveSummary {
  readonly save_id: string;
  readonly room_id: string;
  readonly actor_id: string;
  readonly name: string;
  readonly created_at: number;
}

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly body: unknown) {
    super(`HTTP ${status}: ${JSON.stringify(body)}`);
    this.name = 'HttpError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
  });
  let body: unknown = null;
  try { body = await res.json(); } catch { /* empty body is fine for some endpoints */ }
  if (!res.ok) throw new HttpError(res.status, body);
  return body as T;
}

export interface HttpClient {
  // Identity
  claimIdentity(handle: string): Promise<IdentitySummary>;
  eraseIdentity(handle: string): Promise<{ erased: boolean }>;

  // Lobby
  listLobby(opts?: { code?: string }): Promise<{ rooms: RoomLobbyRow[] }>;
  resolveJoinCode(code: string): Promise<{ id: string; join_code: string; title: string }>;
  listStories(): Promise<{ stories: StorySummary[] }>;

  // Rooms
  createRoom(input: { handle: string; story_slug: string; title: string }): Promise<{ room: RoomDetail; participant: RosterRow }>;
  joinRoom(roomId: string, handle: string): Promise<{ participant: RosterRow; already_participant: boolean }>;
  getRoomState(roomId: string, handle: string): Promise<RoomStateResponse>;
  renameRoom(roomId: string, handle: string, title: string): Promise<{ room: RoomDetail }>;
  pinRoom(roomId: string, handle: string, pinned: boolean): Promise<{ room: RoomDetail }>;
  promote(roomId: string, handle: string, target: string, to_tier: Tier): Promise<{ participant: RosterRow }>;
  demote(roomId: string, handle: string, target: string, to_tier: Tier): Promise<{ participant: RosterRow }>;
  nominateSuccessor(roomId: string, handle: string, target: string): Promise<{ participant: RosterRow }>;
  mute(roomId: string, handle: string, target: string, muted: boolean): Promise<{ participant: RosterRow }>;
  forceRelease(roomId: string, handle: string): Promise<{ released: boolean }>;
  deleteRoom(roomId: string, handle: string, confirm_title: string): Promise<{ deleted: boolean }>;

  // Turn submission
  submitCommand(roomId: string, handle: string, text: string): Promise<{ turnId: string }>;

  // Saves
  listSaves(roomId: string, handle: string): Promise<{ saves: SaveSummary[] }>;
  createSave(roomId: string, handle: string, name: string): Promise<{ save: SaveSummary }>;
  restore(roomId: string, handle: string, save_id: string): Promise<{ atSaveId: string }>;

  // DMs
  sendDm(roomId: string, handle: string, text: string): Promise<{ id: string; ts: number }>;
}

export function createHttpClient(baseUrl: string = ''): HttpClient {
  const join = (path: string) => `${baseUrl}${path}`;

  const post = <T>(path: string, body: unknown): Promise<T> =>
    request<T>(join(path), { method: 'POST', body: JSON.stringify(body) });
  const get = <T>(path: string): Promise<T> =>
    request<T>(join(path), { method: 'GET' });

  return {
    claimIdentity: (handle) => post('/api/identities', { handle }),
    eraseIdentity: (handle) => post('/api/identities/erase', { handle }),

    listLobby: (opts) => get(opts?.code ? `/api/rooms?code=${encodeURIComponent(opts.code)}` : '/api/rooms'),
    resolveJoinCode: (code) => get(`/api/code/${encodeURIComponent(code)}`),
    listStories: () => get('/api/stories'),

    createRoom: (input) => post('/api/rooms', input),
    joinRoom: (roomId, handle) => post(`/api/rooms/${roomId}/join`, { handle }),
    getRoomState: (roomId, handle) => get(`/api/rooms/${roomId}/state?handle=${encodeURIComponent(handle)}`),
    renameRoom: (roomId, handle, title) => post(`/api/rooms/${roomId}/rename`, { handle, title }),
    pinRoom: (roomId, handle, pinned) => post(`/api/rooms/${roomId}/pin`, { handle, pinned }),
    promote: (roomId, handle, target, to_tier) => post(`/api/rooms/${roomId}/promote`, { handle, target, to_tier }),
    demote: (roomId, handle, target, to_tier) => post(`/api/rooms/${roomId}/demote`, { handle, target, to_tier }),
    nominateSuccessor: (roomId, handle, target) => post(`/api/rooms/${roomId}/nominate-successor`, { handle, target }),
    mute: (roomId, handle, target, muted) => post(`/api/rooms/${roomId}/mute`, { handle, target, muted }),
    forceRelease: (roomId, handle) => post(`/api/rooms/${roomId}/force-release`, { handle }),
    deleteRoom: (roomId, handle, confirm_title) => post(`/api/rooms/${roomId}/delete`, { handle, confirm_title }),

    submitCommand: (roomId, handle, text) => post(`/api/rooms/${roomId}/command`, { handle, text }),

    listSaves: (roomId, handle) => get(`/api/rooms/${roomId}/saves?handle=${encodeURIComponent(handle)}`),
    createSave: (roomId, handle, name) => post(`/api/rooms/${roomId}/saves`, { handle, name }),
    restore: (roomId, handle, save_id) => post(`/api/rooms/${roomId}/restore`, { handle, save_id }),

    sendDm: (roomId, handle, text) => post(`/api/rooms/${roomId}/dm`, { handle, text })
  };
}
