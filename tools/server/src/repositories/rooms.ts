/**
 * Rooms repository — persistence for room records.
 *
 * Public interface: {@link RoomsRepository}, {@link createRoomsRepository}.
 * Bounded context: persistence layer (ADR-153 Decision 3, Decision 12).
 *
 * Atomicity: `delete()` runs the cascade in a single `BEGIN IMMEDIATE`
 * transaction so room + participants + session_events + saves are removed
 * together — see ADR-153 Atomicity Requirement #1.
 */

import { randomUUID } from 'node:crypto';
import type { Database, Statement } from 'better-sqlite3';
import type { Room } from './types.js';

export interface RoomsRepository {
  create(input: { title: string; story_slug: string; primary_host_id: string }): Room;
  findById(room_id: string): Room | null;
  findByJoinCode(code: string): Room | null;
  updateLastActivity(room_id: string, ts: string): void;
  setPinned(room_id: string, pinned: boolean): void;
  /**
   * Update the aggregate's Primary Host pointer. Called by the succession
   * state machine after promoting a Co-Host. The caller is responsible for
   * updating the promoted participant's tier in the same transaction.
   */
  updatePrimaryHost(room_id: string, primary_host_id: string): void;
  /** Cascade-deletes participants, session_events, saves in one transaction. */
  delete(room_id: string): void;
  listRecycleCandidates(now: string, idle_days: number): Room[];
}

/** Character set + length for auto-generated join codes. */
const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L ambiguity
const JOIN_CODE_LENGTH = 6;
const JOIN_CODE_MAX_ATTEMPTS = 16;

function generateJoinCode(): string {
  let out = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    out += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)];
  }
  return out;
}

interface RoomRow {
  room_id: string;
  join_code: string;
  title: string;
  story_slug: string;
  pinned: number;
  last_activity_at: string;
  created_at: string;
  primary_host_id: string | null;
}

function rowToRoom(row: RoomRow): Room {
  return {
    room_id: row.room_id,
    join_code: row.join_code,
    title: row.title,
    story_slug: row.story_slug,
    pinned: row.pinned === 1,
    last_activity_at: row.last_activity_at,
    created_at: row.created_at,
    primary_host_id: row.primary_host_id ?? '',
  };
}

export function createRoomsRepository(db: Database): RoomsRepository {
  const insert: Statement = db.prepare(`
    INSERT INTO rooms (room_id, join_code, title, story_slug, pinned,
                       last_activity_at, created_at, primary_host_id)
    VALUES (@room_id, @join_code, @title, @story_slug, 0, @now, @now, @primary_host_id)
  `);

  const selectById: Statement = db.prepare(`SELECT * FROM rooms WHERE room_id = ?`);
  const selectByCode: Statement = db.prepare(`SELECT * FROM rooms WHERE join_code = ?`);

  const updateActivity: Statement = db.prepare(
    `UPDATE rooms SET last_activity_at = ? WHERE room_id = ?`
  );

  const updatePinned: Statement = db.prepare(
    `UPDATE rooms SET pinned = ? WHERE room_id = ?`
  );

  const updatePrimaryHostStmt: Statement = db.prepare(
    `UPDATE rooms SET primary_host_id = ? WHERE room_id = ?`
  );

  const deleteRoom: Statement = db.prepare(`DELETE FROM rooms WHERE room_id = ?`);

  const recycleCandidates: Statement = db.prepare(`
    SELECT * FROM rooms
    WHERE pinned = 0 AND last_activity_at < datetime(?, '-' || ? || ' days')
  `);

  const codeExists: Statement = db.prepare(
    `SELECT 1 FROM rooms WHERE join_code = ? LIMIT 1`
  );

  /**
   * Cascade transaction: ON DELETE CASCADE FKs fan out the child deletes.
   * Wrapped in BEGIN IMMEDIATE for a single atomic unit (ADR-153 Atomicity #1).
   */
  const cascadeDelete = db.transaction((room_id: string) => {
    deleteRoom.run(room_id);
  });

  return {
    create(input) {
      const room_id = randomUUID();
      const now = new Date().toISOString();

      let join_code = '';
      for (let attempt = 0; attempt < JOIN_CODE_MAX_ATTEMPTS; attempt++) {
        const candidate = generateJoinCode();
        if (!codeExists.get(candidate)) {
          join_code = candidate;
          break;
        }
      }
      if (!join_code) {
        throw new Error('RoomsRepository: failed to generate a unique join code after retries');
      }

      insert.run({
        room_id,
        join_code,
        title: input.title,
        story_slug: input.story_slug,
        now,
        primary_host_id: input.primary_host_id,
      });

      return {
        room_id,
        join_code,
        title: input.title,
        story_slug: input.story_slug,
        pinned: false,
        last_activity_at: now,
        created_at: now,
        primary_host_id: input.primary_host_id,
      };
    },

    findById(room_id) {
      const row = selectById.get(room_id) as RoomRow | undefined;
      return row ? rowToRoom(row) : null;
    },

    findByJoinCode(code) {
      const row = selectByCode.get(code) as RoomRow | undefined;
      return row ? rowToRoom(row) : null;
    },

    updateLastActivity(room_id, ts) {
      updateActivity.run(ts, room_id);
    },

    setPinned(room_id, pinned) {
      updatePinned.run(pinned ? 1 : 0, room_id);
    },

    updatePrimaryHost(room_id, primary_host_id) {
      updatePrimaryHostStmt.run(primary_host_id, room_id);
    },

    delete(room_id) {
      cascadeDelete(room_id);
    },

    listRecycleCandidates(now, idle_days) {
      const rows = recycleCandidates.all(now, idle_days) as RoomRow[];
      return rows.map(rowToRoom);
    },
  };
}
