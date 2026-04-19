/**
 * Participants repository — presence, roles, mute state, successor nomination.
 *
 * Public interface: {@link ParticipantsRepository}, {@link createParticipantsRepository}.
 * Bounded context: persistence layer (ADR-153 Decision 4, Decision 5, Decision 9).
 */

import { randomUUID } from 'node:crypto';
import type { Database, Statement } from 'better-sqlite3';
import type { Participant, Tier } from './types.js';

export interface ParticipantsRepository {
  /** Insert a new participant, or mark an existing one reconnected if the token matches. */
  createOrReconnect(input: { room_id: string; token: string; display_name: string }): Participant;
  /**
   * Insert a new participant with a caller-supplied participant_id and tier.
   * Used by room creation so the Primary Host id can be set on the room row
   * in the same transaction that creates the participant.
   */
  createWithId(input: {
    participant_id: string;
    room_id: string;
    token: string;
    display_name: string;
    tier: Tier;
  }): Participant;
  findById(participant_id: string): Participant | null;
  findByToken(token: string): Participant | null;
  setTier(participant_id: string, tier: Tier, actor_id: string): void;
  setMuted(participant_id: string, muted: boolean, actor_id: string): void;
  setConnected(participant_id: string, connected: boolean): void;
  listForRoom(room_id: string): Participant[];
  /** Earliest-joined still-connected participant in a room. Used by the succession chain. */
  earliestConnectedParticipant(room_id: string): Participant | null;
}

interface ParticipantRow {
  participant_id: string;
  room_id: string;
  token: string;
  display_name: string;
  tier: string;
  muted: number;
  connected: number;
  is_successor: number;
  joined_at: string;
}

function rowToParticipant(row: ParticipantRow): Participant {
  return {
    participant_id: row.participant_id,
    room_id: row.room_id,
    token: row.token,
    display_name: row.display_name,
    tier: row.tier as Tier,
    muted: row.muted === 1,
    connected: row.connected === 1,
    is_successor: row.is_successor === 1,
    joined_at: row.joined_at,
  };
}

/**
 * `actor_id` is intentionally not written to the participants table; it is
 * carried to the session event log by the caller (ADR-153 Decision 11).
 * The repository accepts the parameter so that mutation sites surface it,
 * making it harder to forget to append the corresponding role event.
 */
export function createParticipantsRepository(db: Database): ParticipantsRepository {
  const insert: Statement = db.prepare(`
    INSERT INTO participants (
      participant_id, room_id, token, display_name, tier,
      muted, connected, is_successor, joined_at
    ) VALUES (@participant_id, @room_id, @token, @display_name, 'participant',
              0, 1, 0, @now)
  `);

  const insertWithTier: Statement = db.prepare(`
    INSERT INTO participants (
      participant_id, room_id, token, display_name, tier,
      muted, connected, is_successor, joined_at
    ) VALUES (@participant_id, @room_id, @token, @display_name, @tier,
              0, 1, 0, @now)
  `);

  const selectById: Statement = db.prepare(`SELECT * FROM participants WHERE participant_id = ?`);
  const selectByToken: Statement = db.prepare(`SELECT * FROM participants WHERE token = ?`);
  const selectByRoom: Statement = db.prepare(
    `SELECT * FROM participants WHERE room_id = ? ORDER BY joined_at ASC`
  );
  const selectEarliestConnected: Statement = db.prepare(`
    SELECT * FROM participants
    WHERE room_id = ? AND connected = 1
    ORDER BY joined_at ASC
    LIMIT 1
  `);

  const updateTier: Statement = db.prepare(`UPDATE participants SET tier = ? WHERE participant_id = ?`);
  const updateMuted: Statement = db.prepare(`UPDATE participants SET muted = ? WHERE participant_id = ?`);
  const updateConnected: Statement = db.prepare(
    `UPDATE participants SET connected = ? WHERE participant_id = ?`
  );
  const setConnectedByToken: Statement = db.prepare(
    `UPDATE participants SET connected = 1, display_name = ? WHERE token = ?`
  );

  return {
    createOrReconnect(input) {
      const existing = selectByToken.get(input.token) as ParticipantRow | undefined;
      if (existing) {
        setConnectedByToken.run(input.display_name, input.token);
        const refreshed = selectByToken.get(input.token) as ParticipantRow;
        return rowToParticipant(refreshed);
      }

      const participant_id = randomUUID();
      const now = new Date().toISOString();
      insert.run({
        participant_id,
        room_id: input.room_id,
        token: input.token,
        display_name: input.display_name,
        now,
      });

      return {
        participant_id,
        room_id: input.room_id,
        token: input.token,
        display_name: input.display_name,
        tier: 'participant',
        muted: false,
        connected: true,
        is_successor: false,
        joined_at: now,
      };
    },

    createWithId(input) {
      const now = new Date().toISOString();
      insertWithTier.run({
        participant_id: input.participant_id,
        room_id: input.room_id,
        token: input.token,
        display_name: input.display_name,
        tier: input.tier,
        now,
      });
      return {
        participant_id: input.participant_id,
        room_id: input.room_id,
        token: input.token,
        display_name: input.display_name,
        tier: input.tier,
        muted: false,
        connected: true,
        is_successor: false,
        joined_at: now,
      };
    },

    findById(participant_id) {
      const row = selectById.get(participant_id) as ParticipantRow | undefined;
      return row ? rowToParticipant(row) : null;
    },

    findByToken(token) {
      const row = selectByToken.get(token) as ParticipantRow | undefined;
      return row ? rowToParticipant(row) : null;
    },

    setTier(participant_id, tier, _actor_id) {
      updateTier.run(tier, participant_id);
    },

    setMuted(participant_id, muted, _actor_id) {
      updateMuted.run(muted ? 1 : 0, participant_id);
    },

    setConnected(participant_id, connected) {
      updateConnected.run(connected ? 1 : 0, participant_id);
    },

    listForRoom(room_id) {
      const rows = selectByRoom.all(room_id) as ParticipantRow[];
      return rows.map(rowToParticipant);
    },

    earliestConnectedParticipant(room_id) {
      const row = selectEarliestConnected.get(room_id) as ParticipantRow | undefined;
      return row ? rowToParticipant(row) : null;
    },
  };
}
