/**
 * Participants repository — presence, roles, mute state, successor nomination.
 *
 * Public interface: {@link ParticipantsRepository}, {@link createParticipantsRepository}.
 * Bounded context: persistence layer (ADR-153 Decision 4, Decision 5, Decision 9;
 * ADR-161 — the per-room display-name model is collapsed into a single
 * global Handle).
 *
 * Handle resolution: the `participants` table carries no per-row name
 * field. Callers that need to render a participant look up the joined
 * identity's `handle` at read time. This is reflected on the wire as
 * `ParticipantSummary.handle` (ADR-161 Phase F renamed from the legacy
 * `display_name`).
 */

import { randomUUID } from 'node:crypto';
import type { Database, Statement } from 'better-sqlite3';
import type { Participant, Tier } from './types.js';

export interface ParticipantsRepository {
  /**
   * Insert a new participant, or mark an existing one reconnected if the
   * token matches. `identity_id` is required for the create path (every
   * participant is bound to a persistent identity per ADR-161); on the
   * reconnect path the identity_id is taken from the existing row (token
   * routes the reconnect).
   */
  createOrReconnect(input: {
    room_id: string;
    identity_id: string;
    token: string;
  }): Participant;
  /**
   * Insert a new participant with a caller-supplied participant_id and
   * tier. Used by room creation so the Primary Host id can be set on the
   * room row in the same transaction that creates the participant.
   */
  createWithId(input: {
    participant_id: string;
    room_id: string;
    identity_id: string;
    token: string;
    tier: Tier;
  }): Participant;
  findById(participant_id: string): Participant | null;
  findByToken(token: string): Participant | null;
  /**
   * Resolve the participant row for a given (identity, room) pair. Used
   * by the WS hello handler (ADR-161) to decide between a fresh
   * participant insert and a reconnect on the existing seat. Returns
   * null when the identity has never joined this room.
   */
  findByIdentityAndRoom(identity_id: string, room_id: string): Participant | null;
  setTier(participant_id: string, tier: Tier, actor_id: string): void;
  setMuted(participant_id: string, muted: boolean, actor_id: string): void;
  setConnected(participant_id: string, connected: boolean): void;
  /**
   * Mark a participant as the designated successor (`is_successor = 1`)
   * or clear the flag. Callers are responsible for ensuring at most one
   * participant per room carries the flag — the repo does not enforce it
   * so the succession transaction can clear + set in two statements.
   */
  setIsSuccessor(participant_id: string, is_successor: boolean): void;
  listForRoom(room_id: string): Participant[];
  /**
   * Earliest-joined still-connected participant in a room. Used by the
   * succession chain. Pass `exclude_participant_id` to skip the newly
   * promoted PH so the same row is not returned as the next Co-Host.
   */
  earliestConnectedParticipant(
    room_id: string,
    exclude_participant_id?: string,
  ): Participant | null;
}

interface ParticipantRow {
  participant_id: string;
  room_id: string;
  identity_id: string;
  token: string;
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
    identity_id: row.identity_id,
    token: row.token,
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
      participant_id, room_id, identity_id, token, tier,
      muted, connected, is_successor, joined_at
    ) VALUES (@participant_id, @room_id, @identity_id, @token, 'participant',
              0, 1, 0, @now)
  `);

  const insertWithTier: Statement = db.prepare(`
    INSERT INTO participants (
      participant_id, room_id, identity_id, token, tier,
      muted, connected, is_successor, joined_at
    ) VALUES (@participant_id, @room_id, @identity_id, @token, @tier,
              0, 1, 0, @now)
  `);

  const selectById: Statement = db.prepare(`SELECT * FROM participants WHERE participant_id = ?`);
  const selectByToken: Statement = db.prepare(`SELECT * FROM participants WHERE token = ?`);
  const selectByIdentityAndRoom: Statement = db.prepare(
    `SELECT * FROM participants WHERE identity_id = ? AND room_id = ?`,
  );
  const selectByRoom: Statement = db.prepare(
    `SELECT * FROM participants WHERE room_id = ? ORDER BY joined_at ASC`,
  );
  const selectEarliestConnected: Statement = db.prepare(`
    SELECT * FROM participants
    WHERE room_id = ? AND connected = 1
    ORDER BY joined_at ASC
    LIMIT 1
  `);
  const selectEarliestConnectedExcluding: Statement = db.prepare(`
    SELECT * FROM participants
    WHERE room_id = ? AND connected = 1 AND participant_id != ?
    ORDER BY joined_at ASC
    LIMIT 1
  `);

  const updateTier: Statement = db.prepare(`UPDATE participants SET tier = ? WHERE participant_id = ?`);
  const updateMuted: Statement = db.prepare(`UPDATE participants SET muted = ? WHERE participant_id = ?`);
  const updateIsSuccessor: Statement = db.prepare(
    `UPDATE participants SET is_successor = ? WHERE participant_id = ?`,
  );
  const updateConnected: Statement = db.prepare(
    `UPDATE participants SET connected = ? WHERE participant_id = ?`,
  );
  const setConnectedByToken: Statement = db.prepare(
    `UPDATE participants SET connected = 1 WHERE token = ?`,
  );

  return {
    createOrReconnect(input) {
      const existing = selectByToken.get(input.token) as ParticipantRow | undefined;
      if (existing) {
        setConnectedByToken.run(input.token);
        const refreshed = selectByToken.get(input.token) as ParticipantRow;
        return rowToParticipant(refreshed);
      }

      const participant_id = randomUUID();
      const now = new Date().toISOString();
      insert.run({
        participant_id,
        room_id: input.room_id,
        identity_id: input.identity_id,
        token: input.token,
        now,
      });

      return {
        participant_id,
        room_id: input.room_id,
        identity_id: input.identity_id,
        token: input.token,
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
        identity_id: input.identity_id,
        token: input.token,
        tier: input.tier,
        now,
      });
      return {
        participant_id: input.participant_id,
        room_id: input.room_id,
        identity_id: input.identity_id,
        token: input.token,
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

    findByIdentityAndRoom(identity_id, room_id) {
      const row = selectByIdentityAndRoom.get(identity_id, room_id) as ParticipantRow | undefined;
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

    setIsSuccessor(participant_id, is_successor) {
      updateIsSuccessor.run(is_successor ? 1 : 0, participant_id);
    },

    listForRoom(room_id) {
      const rows = selectByRoom.all(room_id) as ParticipantRow[];
      return rows.map(rowToParticipant);
    },

    earliestConnectedParticipant(room_id, exclude_participant_id) {
      const row = exclude_participant_id
        ? (selectEarliestConnectedExcluding.get(room_id, exclude_participant_id) as
            | ParticipantRow
            | undefined)
        : (selectEarliestConnected.get(room_id) as ParticipantRow | undefined);
      return row ? rowToParticipant(row) : null;
    },
  };
}
