/**
 * Shape types for the server's JSON HTTP responses.
 *
 * Public interface: {@link StorySummary}, {@link RoomSummary},
 * {@link ListStoriesResponse}, {@link ListRoomsResponse},
 * {@link CreateRoomResponse}, {@link JoinRoomResponse},
 * {@link ErrorEnvelope}.
 *
 * Bounded context: HTTP boundary between client and server. These types are
 * hand-mirrored from `tools/server/src/http/routes/*.ts`. When either side
 * changes the shape, tests on both sides catch the drift — we accept this
 * cost to keep the client self-contained and avoid a tsconfig path that
 * pulls server source into the client bundle.
 */

export interface StorySummary {
  slug: string;
  title: string;
  path: string;
}

export interface ListStoriesResponse {
  stories: StorySummary[];
}

export interface RoomSummary {
  room_id: string;
  title: string;
  story_slug: string;
  participant_count: number;
  last_activity_at: string;
}

export interface ListRoomsResponse {
  rooms: RoomSummary[];
}

/** Uniform error envelope — mirrors the server's `ErrorEnvelope`. */
export interface ErrorEnvelope {
  code: string;
  detail: string;
}

export interface CreateRoomRequest {
  story_slug: string;
  title: string;
  display_name: string;
  captcha_token?: string;
}

export interface CreateRoomResponse {
  room_id: string;
  join_code: string;
  join_url: string;
  token: string;
  tier: 'primary_host';
  participant_id: string;
}

export interface JoinRoomRequest {
  display_name: string;
  captcha_token?: string;
}

export interface JoinRoomResponse {
  participant_id: string;
  token: string;
  tier: 'participant' | 'command_entrant' | 'co_host' | 'primary_host';
}
