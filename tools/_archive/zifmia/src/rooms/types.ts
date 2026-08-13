/**
 * Rooms + participants types — public shape returned by repositories
 * and HTTP routes.
 *
 * Public interface: {@link Tier}, {@link Room}, {@link Participant},
 * {@link RoomSummary}, {@link RoomError}.
 * Owner: zifmia server, rooms domain.
 */

export const TIERS = ['primary_host', 'co_host', 'command_entrant', 'participant'] as const;
export type Tier = typeof TIERS[number];

export function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value);
}

/**
 * Tier rank for comparison: PH > Co-Host > Command Entrant > Participant.
 * Used by tier-gate to express "PH-only", "PH/Co-Host", etc.
 */
const TIER_RANK: Record<Tier, number> = {
  primary_host: 3,
  co_host: 2,
  command_entrant: 1,
  participant: 0
};

export function tierRank(t: Tier): number {
  return TIER_RANK[t];
}

export interface Room {
  readonly id: string;
  readonly join_code: string;
  readonly title: string;
  readonly story_slug: string;
  readonly pinned: boolean;
  readonly last_activity_at: number;
  readonly created_at: number;
  readonly primary_host_id: string;
  readonly deleted_at: number | null;
}

export interface Participant {
  readonly id: string;
  readonly room_id: string;
  readonly identity_id: string;
  readonly tier: Tier;
  readonly muted: boolean;
  readonly connected: boolean;
  readonly is_successor: boolean;
  readonly joined_at: number;
}

/**
 * Lobby projection — what `GET /api/rooms` returns. Includes the
 * roster handles per `Carries forward — participant handles in each row`.
 */
export interface RoomSummary {
  readonly id: string;
  readonly join_code: string;
  readonly title: string;
  readonly story_slug: string;
  readonly pinned: boolean;
  readonly last_activity_at: number;
  readonly participants: Array<{
    readonly identity_id: string;
    readonly handle: string;
    readonly tier: Tier;
  }>;
}

export type RoomError =
  | 'invalid_title'
  | 'unknown_handle'
  | 'unknown_story'
  | 'room_not_found'
  | 'already_participant'
  | 'forbidden'
  | 'invalid_tier_transition'
  | 'target_not_in_room'
  | 'join_code_unavailable';
