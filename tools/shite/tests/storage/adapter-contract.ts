/**
 * @module tests/storage/adapter-contract
 * @purpose Behavior-test suite for every `StorageAdapter` implementation.
 *   Parameterized so the same tests run against `SqliteAdapter` in Phase 1
 *   and `PostgresAdapter` in Phase 7. Adding a new adapter means adding a
 *   `.test.ts` file that calls `runAdapterContract(factory)` — no test
 *   duplication.
 * @owner Zifmia server (tools/zifmia/tests/storage).
 *
 * Each `describe` block names an interface method group. Each `it` line
 * traces back to a DOES or REJECTS line on the `StorageAdapter` contract.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { StorageAdapter } from '../../src/storage/adapter';

export interface AdapterFactory {
  /** Make a fresh adapter; tests call `migrate()` themselves. */
  make(): Promise<StorageAdapter>;
}

const PASSCODE = 'hash:abcd1234';

export function runAdapterContract(
  label: string,
  factory: AdapterFactory
): void {
  describe(`StorageAdapter contract — ${label}`, () => {
    let adapter: StorageAdapter;

    beforeEach(async () => {
      adapter = await factory.make();
      await adapter.migrate();
    });

    afterEach(async () => {
      await adapter.close();
    });

    // ── Identity ────────────────────────────────────────────────

    describe('identity', () => {
      it('persists a new identity and returns the row by handle and id', async () => {
        const created = await adapter.createIdentity({
          handle: 'alice',
          passcodeHash: PASSCODE
        });
        expect(created.handle).toBe('alice');
        expect(created.id).toMatch(/.+/);
        expect(created.createdAt).toBeGreaterThan(0);

        const byHandle = await adapter.getIdentityByHandle('alice');
        expect(byHandle).toEqual(created);

        const byId = await adapter.getIdentityById(created.id);
        expect(byId).toEqual(created);
      });

      it('returns null for unknown handle and unknown id', async () => {
        expect(await adapter.getIdentityByHandle('ghost')).toBeNull();
        expect(await adapter.getIdentityById('not-a-real-id')).toBeNull();
      });

      it('rejects a duplicate handle (unique constraint)', async () => {
        await adapter.createIdentity({ handle: 'bob', passcodeHash: PASSCODE });
        await expect(
          adapter.createIdentity({ handle: 'bob', passcodeHash: PASSCODE })
        ).rejects.toThrow();
      });

      it('updates the passcode hash in place', async () => {
        const id = (
          await adapter.createIdentity({ handle: 'carol', passcodeHash: 'old' })
        ).id;
        await adapter.updateIdentityPasscode(id, 'new');
        const after = await adapter.getIdentityById(id);
        expect(after?.passcodeHash).toBe('new');
      });

      it('createIdentity returns isAdmin=false by default', async () => {
        const created = await adapter.createIdentity({
          handle: 'newcomer',
          passcodeHash: PASSCODE
        });
        expect(created.isAdmin).toBe(false);

        const byHandle = await adapter.getIdentityByHandle('newcomer');
        expect(byHandle?.isAdmin).toBe(false);
        const byId = await adapter.getIdentityById(created.id);
        expect(byId?.isAdmin).toBe(false);
      });

      it('setIdentityAdmin flips the bit, both directions are durable', async () => {
        const id = (
          await adapter.createIdentity({
            handle: 'will-be-admin',
            passcodeHash: PASSCODE
          })
        ).id;

        await adapter.setIdentityAdmin(id, true);
        const granted = await adapter.getIdentityById(id);
        expect(granted?.isAdmin).toBe(true);
        const grantedByHandle = await adapter.getIdentityByHandle('will-be-admin');
        expect(grantedByHandle?.isAdmin).toBe(true);

        await adapter.setIdentityAdmin(id, false);
        const revoked = await adapter.getIdentityById(id);
        expect(revoked?.isAdmin).toBe(false);
      });

      it('setIdentityAdmin is silent (no throw) for unknown id', async () => {
        await expect(
          adapter.setIdentityAdmin('not-a-real-id', true)
        ).resolves.toBeUndefined();
      });

      it('setIdentityAdmin only affects the targeted identity', async () => {
        const a = await adapter.createIdentity({
          handle: 'admin-iso-a',
          passcodeHash: PASSCODE
        });
        const b = await adapter.createIdentity({
          handle: 'admin-iso-b',
          passcodeHash: PASSCODE
        });
        await adapter.setIdentityAdmin(a.id, true);
        const aAfter = await adapter.getIdentityById(a.id);
        const bAfter = await adapter.getIdentityById(b.id);
        expect(aAfter?.isAdmin).toBe(true);
        expect(bAfter?.isAdmin).toBe(false);
      });
    });

    // ── Session ─────────────────────────────────────────────────

    describe('session', () => {
      it('persists a session and reads it back by token', async () => {
        const id = (
          await adapter.createIdentity({ handle: 'sess-a', passcodeHash: PASSCODE })
        ).id;
        const session = await adapter.createSession({
          token: 'tok-abc',
          identityId: id,
          expiresAt: Date.now() + 1_000_000
        });
        expect(session.token).toBe('tok-abc');
        expect(session.identityId).toBe(id);
        expect(session.createdAt).toBeGreaterThan(0);

        const fetched = await adapter.getSessionByToken('tok-abc');
        expect(fetched).toEqual(session);
      });

      it('returns null for unknown token', async () => {
        expect(await adapter.getSessionByToken('not-a-token')).toBeNull();
      });

      it('rejects createSession when identityId does not exist (FK)', async () => {
        await expect(
          adapter.createSession({
            token: 'tok-orphan',
            identityId: 'ghost',
            expiresAt: Date.now() + 1_000_000
          })
        ).rejects.toThrow();
      });

      it('deleteSession removes the row; idempotent', async () => {
        const id = (
          await adapter.createIdentity({ handle: 'sess-b', passcodeHash: PASSCODE })
        ).id;
        await adapter.createSession({
          token: 'tok-del',
          identityId: id,
          expiresAt: Date.now() + 1_000_000
        });
        await adapter.deleteSession('tok-del');
        expect(await adapter.getSessionByToken('tok-del')).toBeNull();
        // Second call is a no-op.
        await expect(adapter.deleteSession('tok-del')).resolves.toBeUndefined();
      });

      it('deleteExpiredSessions removes only rows past their expiry', async () => {
        const id = (
          await adapter.createIdentity({ handle: 'sess-c', passcodeHash: PASSCODE })
        ).id;
        const past = await adapter.createSession({
          token: 'tok-past',
          identityId: id,
          expiresAt: 1000
        });
        const future = await adapter.createSession({
          token: 'tok-future',
          identityId: id,
          expiresAt: Date.now() + 1_000_000
        });
        await adapter.deleteExpiredSessions(2000);
        expect(await adapter.getSessionByToken(past.token)).toBeNull();
        expect(await adapter.getSessionByToken(future.token)).not.toBeNull();
      });

      it('deleteSessionsForIdentity removes all rows for one identity, leaves others alone', async () => {
        const target = (
          await adapter.createIdentity({
            handle: 'sess-target',
            passcodeHash: PASSCODE
          })
        ).id;
        const other = (
          await adapter.createIdentity({
            handle: 'sess-other',
            passcodeHash: PASSCODE
          })
        ).id;
        await adapter.createSession({
          token: 'tok-t1',
          identityId: target,
          expiresAt: Date.now() + 1_000_000
        });
        await adapter.createSession({
          token: 'tok-t2',
          identityId: target,
          expiresAt: Date.now() + 1_000_000
        });
        await adapter.createSession({
          token: 'tok-o1',
          identityId: other,
          expiresAt: Date.now() + 1_000_000
        });

        await adapter.deleteSessionsForIdentity(target);

        expect(await adapter.getSessionByToken('tok-t1')).toBeNull();
        expect(await adapter.getSessionByToken('tok-t2')).toBeNull();
        expect(await adapter.getSessionByToken('tok-o1')).not.toBeNull();
      });

      it('deleteSessionsForIdentity is idempotent on an identity with no sessions', async () => {
        const id = (
          await adapter.createIdentity({
            handle: 'sess-empty',
            passcodeHash: PASSCODE
          })
        ).id;
        await expect(
          adapter.deleteSessionsForIdentity(id)
        ).resolves.toBeUndefined();
      });
    });

    // ── Room ────────────────────────────────────────────────────

    describe('room', () => {
      it('persists a room and excludes closed rooms from listRooms', async () => {
        const creator = await adapter.createIdentity({
          handle: 'dave',
          passcodeHash: PASSCODE
        });
        const room = await adapter.createRoom({
          storyId: 'story-1',
          bundleVersion: '1.0.0',
          title: 'Test Room',
          public: true,
          createdBy: creator.id
        });
        expect(room.public).toBe(true);
        expect((await adapter.listRooms()).map((r) => r.id)).toContain(room.id);

        await adapter.closeRoom(room.id);
        const after = await adapter.getRoom(room.id);
        expect(after?.closedAt).toBeGreaterThan(0);
        expect((await adapter.listRooms()).map((r) => r.id)).not.toContain(
          room.id
        );
      });

      it('publicOnly=true filters out private rooms', async () => {
        const creator = await adapter.createIdentity({
          handle: 'eve',
          passcodeHash: PASSCODE
        });
        const pub = await adapter.createRoom({
          storyId: 'story-1',
          bundleVersion: '1.0.0',
          title: 'Public',
          public: true,
          createdBy: creator.id
        });
        const priv = await adapter.createRoom({
          storyId: 'story-1',
          bundleVersion: '1.0.0',
          title: 'Private',
          public: false,
          createdBy: creator.id
        });
        const visible = (await adapter.listRooms({ publicOnly: true })).map(
          (r) => r.id
        );
        expect(visible).toContain(pub.id);
        expect(visible).not.toContain(priv.id);
      });
    });

    // ── Save blobs ──────────────────────────────────────────────

    describe('save_blobs', () => {
      it('appends a blob and reads it back identical', async () => {
        const room = await makeRoom(adapter);
        const payload = new Uint8Array([1, 2, 3, 4, 5]);

        await adapter.appendSaveBlob({
          roomId: room.id,
          turn: 1,
          formatVersion: 3,
          bundleVersion: '1.0.0',
          payload
        });

        const read = await adapter.getSaveBlobAt(room.id, 1);
        expect(read?.payload).toEqual(payload);
        expect(read?.formatVersion).toBe(3);
        expect(read?.bundleVersion).toBe('1.0.0');
      });

      it('rejects duplicate (roomId, turn)', async () => {
        const room = await makeRoom(adapter);
        await adapter.appendSaveBlob({
          roomId: room.id,
          turn: 1,
          formatVersion: 3,
          bundleVersion: '1.0.0',
          payload: new Uint8Array([0])
        });
        await expect(
          adapter.appendSaveBlob({
            roomId: room.id,
            turn: 1,
            formatVersion: 3,
            bundleVersion: '1.0.0',
            payload: new Uint8Array([1])
          })
        ).rejects.toThrow();
      });

      it('getLatestSaveBlob returns the highest turn for the room', async () => {
        const room = await makeRoom(adapter);
        for (const t of [1, 2, 5, 3]) {
          await adapter.appendSaveBlob({
            roomId: room.id,
            turn: t,
            formatVersion: 3,
            bundleVersion: '1.0.0',
            payload: new Uint8Array([t])
          });
        }
        const latest = await adapter.getLatestSaveBlob(room.id);
        expect(latest?.turn).toBe(5);
      });

      it('listSaveBlobTurns returns turns in ascending order', async () => {
        const room = await makeRoom(adapter);
        for (const t of [3, 1, 2]) {
          await adapter.appendSaveBlob({
            roomId: room.id,
            turn: t,
            formatVersion: 3,
            bundleVersion: '1.0.0',
            payload: new Uint8Array([t])
          });
        }
        expect(await adapter.listSaveBlobTurns(room.id)).toEqual([1, 2, 3]);
      });

      it('deleteSaveBlob removes a row by (roomId, turn)', async () => {
        const room = await makeRoom(adapter);
        await adapter.appendSaveBlob({
          roomId: room.id,
          turn: 1,
          formatVersion: 3,
          bundleVersion: '1.0.0',
          payload: new Uint8Array([0])
        });
        await adapter.deleteSaveBlob(room.id, 1);
        expect(await adapter.getSaveBlobAt(room.id, 1)).toBeNull();
      });
    });

    // ── Named saves ─────────────────────────────────────────────

    describe('named_saves', () => {
      it('creates a named save pointing at an existing turn', async () => {
        const room = await makeRoom(adapter);
        await adapter.appendSaveBlob({
          roomId: room.id,
          turn: 5,
          formatVersion: 3,
          bundleVersion: '1.0.0',
          payload: new Uint8Array([0])
        });
        const owner = await adapter.createIdentity({
          handle: 'frank',
          passcodeHash: PASSCODE
        });

        const save = await adapter.createNamedSave({
          roomId: room.id,
          atTurn: 5,
          label: 'before the cave',
          createdBy: owner.id
        });

        expect(save.atTurn).toBe(5);
        expect(save.label).toBe('before the cave');
        expect((await adapter.listNamedSaves(room.id)).map((s) => s.saveId))
          .toContain(save.saveId);
        expect(await adapter.getNamedSave(save.saveId)).toEqual(save);
      });

      it('rejects creating a named save with no underlying save_blob (FK)', async () => {
        const room = await makeRoom(adapter);
        const owner = await adapter.createIdentity({
          handle: 'george',
          passcodeHash: PASSCODE
        });
        await expect(
          adapter.createNamedSave({
            roomId: room.id,
            atTurn: 999,
            label: 'phantom',
            createdBy: owner.id
          })
        ).rejects.toThrow();
      });

      it('deletes a named save without affecting the underlying save_blob', async () => {
        const room = await makeRoom(adapter);
        const owner = await adapter.createIdentity({
          handle: 'helen',
          passcodeHash: PASSCODE
        });
        await adapter.appendSaveBlob({
          roomId: room.id,
          turn: 1,
          formatVersion: 3,
          bundleVersion: '1.0.0',
          payload: new Uint8Array([0])
        });
        const save = await adapter.createNamedSave({
          roomId: room.id,
          atTurn: 1,
          label: 'x',
          createdBy: owner.id
        });

        await adapter.deleteNamedSave(save.saveId);
        expect(await adapter.getNamedSave(save.saveId)).toBeNull();
        // Underlying blob untouched.
        expect(await adapter.getSaveBlobAt(room.id, 1)).not.toBeNull();
      });
    });

    // ── Destructive truncation (restore rollback) ───────────────

    describe('truncateRoomHistory', () => {
      it('removes save_blobs and named_saves past keepThroughTurn', async () => {
        const room = await makeRoom(adapter);
        const owner = await adapter.createIdentity({
          handle: 'isaac',
          passcodeHash: PASSCODE
        });
        for (let turn = 1; turn <= 5; turn++) {
          await adapter.appendSaveBlob({
            roomId: room.id,
            turn,
            formatVersion: 3,
            bundleVersion: '1.0.0',
            payload: new Uint8Array([turn])
          });
        }
        const early = await adapter.createNamedSave({
          roomId: room.id,
          atTurn: 1,
          label: 'early',
          createdBy: owner.id
        });
        const target = await adapter.createNamedSave({
          roomId: room.id,
          atTurn: 3,
          label: 'target',
          createdBy: owner.id
        });
        const future = await adapter.createNamedSave({
          roomId: room.id,
          atTurn: 5,
          label: 'future',
          createdBy: owner.id
        });

        await adapter.truncateRoomHistory({
          roomId: room.id,
          keepThroughTurn: 3
        });

        expect(await adapter.listSaveBlobTurns(room.id)).toEqual([1, 2, 3]);
        const remainingNamed = await adapter.listNamedSaves(room.id);
        const ids = remainingNamed.map((s) => s.saveId).sort();
        expect(ids).toEqual([early.saveId, target.saveId].sort());
        expect(await adapter.getNamedSave(future.saveId)).toBeNull();
      });

      it('is idempotent when no rows are past the cutoff', async () => {
        const room = await makeRoom(adapter);
        await adapter.appendSaveBlob({
          roomId: room.id,
          turn: 1,
          formatVersion: 3,
          bundleVersion: '1.0.0',
          payload: new Uint8Array([0])
        });
        await adapter.truncateRoomHistory({
          roomId: room.id,
          keepThroughTurn: 10
        });
        expect(await adapter.listSaveBlobTurns(room.id)).toEqual([1]);
      });

      it('does not touch other rooms', async () => {
        const a = await makeRoom(adapter, 'truncate-a');
        const b = await makeRoom(adapter, 'truncate-b');
        for (let turn = 1; turn <= 3; turn++) {
          await adapter.appendSaveBlob({
            roomId: a.id,
            turn,
            formatVersion: 3,
            bundleVersion: '1.0.0',
            payload: new Uint8Array([turn])
          });
          await adapter.appendSaveBlob({
            roomId: b.id,
            turn,
            formatVersion: 3,
            bundleVersion: '1.0.0',
            payload: new Uint8Array([turn])
          });
        }
        await adapter.truncateRoomHistory({
          roomId: a.id,
          keepThroughTurn: 1
        });
        expect(await adapter.listSaveBlobTurns(a.id)).toEqual([1]);
        expect(await adapter.listSaveBlobTurns(b.id)).toEqual([1, 2, 3]);
      });
    });

    // ── Compaction GC (Phase 4d) ────────────────────────────────

    describe('compactRoomSaveBlobs', () => {
      it('deletes save_blobs that are neither latest nor named-save targets', async () => {
        const room = await makeRoom(adapter, 'compact-a');
        const owner = await adapter.createIdentity({
          handle: 'compact-owner',
          passcodeHash: PASSCODE
        });
        for (let turn = 1; turn <= 5; turn++) {
          await adapter.appendSaveBlob({
            roomId: room.id,
            turn,
            formatVersion: 3,
            bundleVersion: '1.0.0',
            payload: new Uint8Array([turn])
          });
        }
        await adapter.createNamedSave({
          roomId: room.id,
          atTurn: 2,
          label: 'midpoint',
          createdBy: owner.id
        });

        const result = await adapter.compactRoomSaveBlobs(room.id);
        // Turns 1, 3, 4 deleted; turn 2 preserved (named save); turn 5 preserved (latest).
        expect(result.deleted).toBe(3);
        expect(await adapter.listSaveBlobTurns(room.id)).toEqual([2, 5]);
      });

      it('preserves the only save_blob when no others exist', async () => {
        const room = await makeRoom(adapter, 'compact-b');
        await adapter.appendSaveBlob({
          roomId: room.id,
          turn: 1,
          formatVersion: 3,
          bundleVersion: '1.0.0',
          payload: new Uint8Array([1])
        });
        const result = await adapter.compactRoomSaveBlobs(room.id);
        expect(result.deleted).toBe(0);
        expect(await adapter.listSaveBlobTurns(room.id)).toEqual([1]);
      });

      it('is idempotent — second call deletes nothing', async () => {
        const room = await makeRoom(adapter, 'compact-c');
        for (let turn = 1; turn <= 4; turn++) {
          await adapter.appendSaveBlob({
            roomId: room.id,
            turn,
            formatVersion: 3,
            bundleVersion: '1.0.0',
            payload: new Uint8Array([turn])
          });
        }
        const first = await adapter.compactRoomSaveBlobs(room.id);
        expect(first.deleted).toBe(3); // turns 1,2,3
        const second = await adapter.compactRoomSaveBlobs(room.id);
        expect(second.deleted).toBe(0);
        expect(await adapter.listSaveBlobTurns(room.id)).toEqual([4]);
      });

      it('returns {deleted: 0} for a room with no save_blobs', async () => {
        const room = await makeRoom(adapter, 'compact-d');
        const result = await adapter.compactRoomSaveBlobs(room.id);
        expect(result.deleted).toBe(0);
      });

      it('does not touch other rooms', async () => {
        const a = await makeRoom(adapter, 'compact-iso-a');
        const b = await makeRoom(adapter, 'compact-iso-b');
        for (let turn = 1; turn <= 3; turn++) {
          await adapter.appendSaveBlob({
            roomId: a.id,
            turn,
            formatVersion: 3,
            bundleVersion: '1.0.0',
            payload: new Uint8Array([turn])
          });
          await adapter.appendSaveBlob({
            roomId: b.id,
            turn,
            formatVersion: 3,
            bundleVersion: '1.0.0',
            payload: new Uint8Array([turn])
          });
        }
        await adapter.compactRoomSaveBlobs(a.id);
        expect(await adapter.listSaveBlobTurns(a.id)).toEqual([3]);
        expect(await adapter.listSaveBlobTurns(b.id)).toEqual([1, 2, 3]);
      });
    });

    // ── Chat ────────────────────────────────────────────────────

    describe('chat', () => {
      it('appends and lists chat messages ascending by ts', async () => {
        const room = await makeRoom(adapter);
        const a = await adapter.createIdentity({
          handle: 'ian',
          passcodeHash: PASSCODE
        });

        await adapter.appendChatMessage({
          roomId: room.id,
          fromId: a.id,
          fromHandle: 'ian',
          text: 'hi',
          ts: 100
        });
        await adapter.appendChatMessage({
          roomId: room.id,
          fromId: a.id,
          fromHandle: 'ian',
          text: 'again',
          ts: 200
        });

        const all = await adapter.listChatMessages(room.id);
        expect(all.map((m) => m.text)).toEqual(['hi', 'again']);

        const filtered = await adapter.listChatMessages(room.id, {
          sinceTs: 150
        });
        expect(filtered.map((m) => m.text)).toEqual(['again']);
      });
    });

    // ── Audit ───────────────────────────────────────────────────

    describe('audit', () => {
      it('appends and lists audit entries descending by ts', async () => {
        await adapter.appendAuditEntry({
          actorId: null,
          action: 'system.start',
          targetKind: 'system',
          targetId: 'srv',
          detail: '{}'
        });
        await adapter.appendAuditEntry({
          actorId: null,
          action: 'story.install',
          targetKind: 'story',
          targetId: 'story-1',
          detail: '{"version":"1.0.0"}'
        });

        const entries = await adapter.listAuditEntries();
        expect(entries.length).toBeGreaterThanOrEqual(2);
        // Descending by ts — most recent first.
        const tss = entries.map((e) => e.ts);
        for (let i = 1; i < tss.length; i++) {
          expect(tss[i - 1]).toBeGreaterThanOrEqual(tss[i]!);
        }
      });
    });

    // ── Story library ───────────────────────────────────────────

    describe('story library', () => {
      it('installs a bundle and round-trips bytes identically', async () => {
        const installer = await adapter.createIdentity({
          handle: 'jane',
          passcodeHash: PASSCODE
        });
        const bytes = new Uint8Array([0x70, 0x6b, 0x03, 0x04, 0x42]);

        const entry = await adapter.installStoryBundle({
          storyId: 'story-1',
          version: '1.0.0',
          ifid: 'IFID-ABC',
          title: 'Test Story',
          installedBy: installer.id,
          bundle: bytes
        });

        expect(entry.active).toBe(true);
        const read = await adapter.getStoryBundle('story-1', '1.0.0');
        expect(read).toEqual(bytes);

        expect(
          (await adapter.listStories({ activeOnly: true })).map((s) => s.storyId)
        ).toContain('story-1');
      });

      it('removeStory marks every version inactive', async () => {
        const installer = await adapter.createIdentity({
          handle: 'kate',
          passcodeHash: PASSCODE
        });
        await adapter.installStoryBundle({
          storyId: 'story-X',
          version: '1.0.0',
          ifid: 'I',
          title: 'X',
          installedBy: installer.id,
          bundle: new Uint8Array([0])
        });
        await adapter.installStoryBundle({
          storyId: 'story-X',
          version: '1.1.0',
          ifid: 'I',
          title: 'X',
          installedBy: installer.id,
          bundle: new Uint8Array([0])
        });

        await adapter.removeStory('story-X');

        const active = (
          await adapter.listStories({ activeOnly: true })
        ).filter((s) => s.storyId === 'story-X');
        expect(active).toEqual([]);

        const all = (await adapter.listStories()).filter(
          (s) => s.storyId === 'story-X'
        );
        expect(all.map((s) => s.active)).toEqual([false, false]);
      });
    });

    // ── Lease ───────────────────────────────────────────────────

    describe('room lease', () => {
      it('serializes overlapping acquisitions for the same room', async () => {
        const room = await makeRoom(adapter);
        const order: string[] = [];

        const first = await adapter.acquireRoomLease(room.id);
        const secondPending = adapter.acquireRoomLease(room.id).then((l) => {
          order.push('B-acquired');
          return l;
        });

        // Give the second acquire a tick to attempt + queue.
        await new Promise((r) => setImmediate(r));
        order.push('A-still-holds');

        await first.release();
        const second = await secondPending;
        await second.release();

        // 'A-still-holds' must precede 'B-acquired'.
        expect(order).toEqual(['A-still-holds', 'B-acquired']);
      });

      it('releases are idempotent', async () => {
        const room = await makeRoom(adapter);
        const lease = await adapter.acquireRoomLease(room.id);
        await lease.release();
        await expect(lease.release()).resolves.toBeUndefined();
      });

      it('allows immediate acquisition for distinct rooms (no cross-room blocking)', async () => {
        const r1 = await makeRoom(adapter, 'r1');
        const r2 = await makeRoom(adapter, 'r2');
        const a = await adapter.acquireRoomLease(r1.id);

        // r2 acquire must not block on r1's lease — race a quick timer
        // against the second acquire and assert acquire won.
        const bPromise = adapter.acquireRoomLease(r2.id);
        const timer = new Promise<'timeout'>((resolve) =>
          setTimeout(() => resolve('timeout'), 50)
        );
        const winner = await Promise.race([bPromise.then(() => 'b' as const), timer]);
        expect(winner).toBe('b');

        const b = await bPromise;
        await a.release();
        await b.release();
      });
    });

    // ── Lifecycle ───────────────────────────────────────────────

    describe('describe()', () => {
      it('returns the adapter kind', async () => {
        const d = adapter.describe();
        expect(['sqlite', 'postgres']).toContain(d.kind);
        expect(d.driverVersion).toMatch(/.+/);
      });
    });
  });
}

// Helper — create a room (+ creator identity) for tests that don't
// care about identity setup.
async function makeRoom(
  adapter: StorageAdapter,
  handlePrefix: string = 'creator'
): Promise<{ id: string }> {
  const creator = await adapter.createIdentity({
    handle: `${handlePrefix}-${Math.random().toString(36).slice(2, 8)}`,
    passcodeHash: PASSCODE
  });
  return adapter.createRoom({
    storyId: 'story-fixture',
    bundleVersion: '1.0.0',
    title: 'Fixture Room',
    public: true,
    createdBy: creator.id
  });
}
