/**
 * SavesRepository behavior tests.
 *
 * Behavior Statement — SavesRepository
 *   DOES: persists opaque save blobs against a room; reads them back
 *         verbatim; lists summaries (without blob bytes); participates
 *         in the room-delete cascade.
 *   WHEN: invoked by the save/restore handler (Phase 6).
 *   BECAUSE: the server is the authoritative saves store per room
 *            (ADR-153 Decision 10).
 *   REJECTS WHEN: findById for an unknown save_id returns null.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import { openTestDb } from '../helpers/test-db.js';
import { createRoomsRepository } from '../../src/repositories/rooms.js';
import { createSavesRepository } from '../../src/repositories/saves.js';

function setupRoom(db: Database): string {
  const rooms = createRoomsRepository(db);
  return rooms.create({ title: 'R', story_slug: 's', primary_host_id: 'p1' }).room_id;
}

describe('SavesRepository', () => {
  let db: Database;

  beforeEach(() => {
    db = openTestDb();
  });
  afterEach(() => {
    db.close();
  });

  it('create persists the blob and findById returns the same bytes', () => {
    const room_id = setupRoom(db);
    const saves = createSavesRepository(db);

    const blob = Buffer.from([0, 1, 2, 3, 4, 5, 255]);
    const save_id = randomUUID();
    const created = saves.create({ save_id, room_id, actor_id: 'p1', name: 's — T1', blob });
    expect(created.save_id).toBe(save_id);

    const found = saves.findById(created.save_id);
    expect(found).not.toBeNull();
    expect(found!.blob.equals(blob)).toBe(true);
    expect(found!.name).toBe('s — T1');
  });

  it('listForRoom returns summaries without blob bytes', () => {
    const room_id = setupRoom(db);
    const saves = createSavesRepository(db);

    saves.create({
      save_id: randomUUID(),
      room_id,
      actor_id: 'p1',
      name: 'a',
      blob: Buffer.from('big'),
    });
    const summaries = saves.listForRoom(room_id);

    expect(summaries.length).toBe(1);
    expect('blob' in summaries[0]!).toBe(false);
  });

  it('listForRoom returns [] for an unknown room', () => {
    const saves = createSavesRepository(db);
    expect(saves.listForRoom('no-such-room')).toEqual([]);
  });

  it('findById returns null for an unknown save_id', () => {
    const saves = createSavesRepository(db);
    expect(saves.findById('nope')).toBeNull();
  });

  it('saves cascade-delete when the parent room is deleted', () => {
    const rooms = createRoomsRepository(db);
    const saves = createSavesRepository(db);

    const r = rooms.create({ title: 'R', story_slug: 's', primary_host_id: 'p1' });
    saves.create({
      save_id: randomUUID(),
      room_id: r.room_id,
      actor_id: 'p1',
      name: 's',
      blob: Buffer.from('x'),
    });
    expect(saves.listForRoom(r.room_id).length).toBe(1);

    rooms.delete(r.room_id);
    expect(saves.listForRoom(r.room_id).length).toBe(0);
  });
});
