/**
 * Participants repository — the only writer to the `participants` table.
 *
 * Public interface: {@link ParticipantsRepository}, {@link createParticipantsRepository}.
 * Owner: zifmia server, single-process.
 *
 * Contract per ADR-177:
 *   - Composite `(room_id, identity_id)` is unique — one identity has
 *     at most one row per room.
 *   - `tier` is bounded by the schema CHECK constraint:
 *     `primary_host | co_host | command_entrant | participant`.
 *   - Tier transitions to/from `primary_host` only happen via
 *     succession (Phase 4); the routes that *can* call into here in
 *     Phase 2 are: room creation (initial PH insert), join (insert as
 *     `participant`), promote (caller is PH), demote (PH/Co-Host).
 *   - `is_successor` is exclusive within a room (set on nominate).
 */

import { randomUUID } from 'node:crypto';
import type { ZifmiaDatabase } from '../db/connect.js';
import type { Participant, Tier } from './types.js';

export interface ParticipantsRepositoryOptions {
  now?: () => number;
  idFactory?: () => string;
}

export interface InsertParticipantInput {
  roomId: string;
  identityId: string;
  tier: Tier;
}

export type JoinRoomResult =
  | { ok: true; participant: Participant; alreadyParticipant: boolean }
  | { ok: false; error: 'already_participant_other_error' };

export type SetTierResult =
  | { ok: true; participant: Participant }
  | { ok: false; error: 'target_not_in_room' };

export type NominateSuccessorResult =
  | { ok: true; participant: Participant }
  | { ok: false; error: 'target_not_in_room' };

export type SetMutedResult =
  | { ok: true; participant: Participant }
  | { ok: false; error: 'target_not_in_room' };

export interface ParticipantsRepository {
  /** Insert the PH row at room-creation time. Throws on collision. */
  insertInitial(input: InsertParticipantInput): Participant;
  /** Join as `participant`. Idempotent on existing membership. */
  joinAsParticipant(roomId: string, identityId: string): {
    participant: Participant;
    alreadyParticipant: boolean;
  };
  getById(id: string): Participant | undefined;
  getByRoomAndIdentity(roomId: string, identityId: string): Participant | undefined;
  listByRoom(roomId: string): Participant[];
  setTier(participantId: string, tier: Tier): SetTierResult;
  nominateSuccessor(roomId: string, targetParticipantId: string): NominateSuccessorResult;
  /** Clear `is_successor` for every participant in the room. */
  clearAllSuccessors(roomId: string): void;
  /** Toggle a participant's `muted` flag. */
  setMuted(participantId: string, muted: boolean): SetMutedResult;
}

interface ParticipantRow {
  id: string;
  room_id: string;
  identity_id: string;
  tier: string;
  muted: number;
  connected: number;
  is_successor: number;
  joined_at: number;
}

function rowToParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    room_id: row.room_id,
    identity_id: row.identity_id,
    tier: row.tier as Tier,
    muted: row.muted === 1,
    connected: row.connected === 1,
    is_successor: row.is_successor === 1,
    joined_at: row.joined_at
  };
}

export function createParticipantsRepository(
  db: ZifmiaDatabase,
  options: ParticipantsRepositoryOptions = {}
): ParticipantsRepository {
  const now = options.now ?? Date.now;
  const idFactory = options.idFactory ?? randomUUID;

  const insertStmt = db.prepare<
    [string, string, string, string, number]
  >(
    `INSERT INTO participants (id, room_id, identity_id, tier, joined_at)
     VALUES (?, ?, ?, ?, ?)`
  );

  const selectByIdStmt = db.prepare<[string], ParticipantRow>(
    `SELECT * FROM participants WHERE id = ?`
  );

  const selectByRoomIdentityStmt = db.prepare<[string, string], ParticipantRow>(
    `SELECT * FROM participants WHERE room_id = ? AND identity_id = ?`
  );

  const selectByRoomStmt = db.prepare<[string], ParticipantRow>(
    `SELECT * FROM participants WHERE room_id = ? ORDER BY joined_at ASC`
  );

  const updateTierStmt = db.prepare<[string, string]>(
    `UPDATE participants SET tier = ? WHERE id = ?`
  );

  const clearSuccessorStmt = db.prepare<[string]>(
    `UPDATE participants SET is_successor = 0 WHERE room_id = ?`
  );

  const setSuccessorStmt = db.prepare<[string, string]>(
    `UPDATE participants SET is_successor = 1 WHERE id = ? AND room_id = ?`
  );

  const updateMutedStmt = db.prepare<[number, string]>(
    `UPDATE participants SET muted = ? WHERE id = ?`
  );

  return {
    insertInitial(input) {
      const id = idFactory();
      const joinedAt = now();
      insertStmt.run(id, input.roomId, input.identityId, input.tier, joinedAt);
      const row = selectByIdStmt.get(id);
      if (!row) throw new Error('insertInitial: row missing after insert');
      return rowToParticipant(row);
    },

    joinAsParticipant(roomId, identityId) {
      const existing = selectByRoomIdentityStmt.get(roomId, identityId);
      if (existing) {
        return { participant: rowToParticipant(existing), alreadyParticipant: true };
      }
      const id = idFactory();
      const joinedAt = now();
      try {
        insertStmt.run(id, roomId, identityId, 'participant', joinedAt);
      } catch (err) {
        if (err instanceof Error && /UNIQUE/i.test(err.message)) {
          // Lost the race; re-read the row and return idempotent
          // "already participant" — preserves invariant of one row
          // per (room, identity).
          const row = selectByRoomIdentityStmt.get(roomId, identityId);
          if (row) return { participant: rowToParticipant(row), alreadyParticipant: true };
        }
        throw err;
      }
      const row = selectByIdStmt.get(id);
      if (!row) throw new Error('joinAsParticipant: row missing after insert');
      return { participant: rowToParticipant(row), alreadyParticipant: false };
    },

    getById(id) {
      const row = selectByIdStmt.get(id);
      return row ? rowToParticipant(row) : undefined;
    },

    getByRoomAndIdentity(roomId, identityId) {
      const row = selectByRoomIdentityStmt.get(roomId, identityId);
      return row ? rowToParticipant(row) : undefined;
    },

    listByRoom(roomId) {
      return selectByRoomStmt.all(roomId).map(rowToParticipant);
    },

    setTier(participantId, tier) {
      const result = updateTierStmt.run(tier, participantId);
      if (result.changes === 0) return { ok: false, error: 'target_not_in_room' };
      const row = selectByIdStmt.get(participantId);
      if (!row) return { ok: false, error: 'target_not_in_room' };
      return { ok: true, participant: rowToParticipant(row) };
    },

    nominateSuccessor(roomId, targetParticipantId) {
      const tx = db.transaction(() => {
        clearSuccessorStmt.run(roomId);
        const r = setSuccessorStmt.run(targetParticipantId, roomId);
        return r.changes;
      });
      const changes = tx();
      if (changes === 0) return { ok: false, error: 'target_not_in_room' };
      const row = selectByIdStmt.get(targetParticipantId);
      if (!row) return { ok: false, error: 'target_not_in_room' };
      return { ok: true, participant: rowToParticipant(row) };
    },

    clearAllSuccessors(roomId) {
      clearSuccessorStmt.run(roomId);
    },

    setMuted(participantId, muted) {
      const result = updateMutedStmt.run(muted ? 1 : 0, participantId);
      if (result.changes === 0) return { ok: false, error: 'target_not_in_room' };
      const row = selectByIdStmt.get(participantId);
      if (!row) return { ok: false, error: 'target_not_in_room' };
      return { ok: true, participant: rowToParticipant(row) };
    }
  };
}
