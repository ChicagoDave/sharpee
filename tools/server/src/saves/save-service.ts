/**
 * Save service — mediates SAVE / RESTORE between the WebSocket handlers and
 * the Deno story sandbox, owns the atomic DB transaction that couples a
 * `saves` row with its `session_events` log entry.
 *
 * Public interface: {@link SaveService}, {@link createSaveService},
 * {@link SaveServiceError}, {@link SaveServiceErrorCode}.
 *
 * Bounded context: server-side save/restore coordination (ADR-153 Decisions
 * 2, 10, 11). The sandbox produces the opaque blob; the server persists it
 * unaltered and replays it back on restore.
 *
 * Invariants:
 *   - A `saves` row and its companion `session_events` row are created in
 *     one SQLite transaction. The log can never reference a save_id that
 *     does not exist in `saves`.
 *   - Correlation between SAVE and SAVED (and RESTORE/RESTORED) is strict:
 *     the returned save_id must match the one we sent, or we throw
 *     `save_id_mismatch` rather than trusting the sandbox.
 *   - This module performs no authority checks and emits no broadcasts —
 *     those are the handler's responsibility.
 */

import type { Database } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { RoomsRepository } from '../repositories/rooms.js';
import type { SavesRepository } from '../repositories/saves.js';
import type { SessionEventsRepository } from '../repositories/session-events.js';
import type { StoryScanner } from '../stories/scanner.js';
import type { SandboxRegistry, SandboxEntry } from '../sandbox/sandbox-registry.js';
import { getCompiledBundle } from '../sandbox/story-cache.js';
import type { TextBlock } from '../repositories/types.js';
import type { SandboxToServerMessage } from '../wire/server-sandbox.js';

export type SaveServiceErrorCode =
  | 'unknown_room'
  | 'unknown_story'
  | 'sandbox_error'
  | 'sandbox_timeout'
  | 'save_id_mismatch'
  | 'save_not_found'
  | 'save_room_mismatch'
  /** SQLite refused the write (disk full, read-only, etc.) during the atomic block. */
  | 'persistence_failure';

/**
 * Typed error thrown by SaveService. Handlers translate `.code` to wire
 * error codes; the detail is surfaced in the wire `error.detail` field.
 */
export class SaveServiceError extends Error {
  constructor(
    public readonly code: SaveServiceErrorCode,
    detail: string
  ) {
    super(detail);
    this.name = 'SaveServiceError';
  }
}

export interface SaveServiceDeps {
  db: Database;
  rooms: RoomsRepository;
  saves: SavesRepository;
  sessionEvents: SessionEventsRepository;
  stories: StoryScanner;
  sandboxes: SandboxRegistry;
  /** How long to wait for SAVED / RESTORED before timing out (ms). Default 30s. */
  sandboxTimeoutMs?: number;
  /** Override the clock for auto-name timestamps (tests). */
  now?: () => Date;
}

export interface SaveService {
  /**
   * Run a SAVE round-trip and persist the returned blob.
   *
   * @throws {SaveServiceError} on any of: unknown_room, unknown_story,
   *   sandbox_error, sandbox_timeout, save_id_mismatch.
   */
  save(input: { room_id: string; actor_id: string }): Promise<{
    save_id: string;
    name: string;
    created_at: string;
  }>;

  /**
   * Run a RESTORE round-trip and append a restore event to the log.
   *
   * @throws {SaveServiceError} on any of: unknown_room, unknown_story,
   *   save_not_found, save_room_mismatch, sandbox_error, sandbox_timeout,
   *   save_id_mismatch.
   */
  restore(input: { room_id: string; actor_id: string; save_id: string }): Promise<{
    save_id: string;
    text_blocks: TextBlock[];
    /**
     * Post-restore world snapshot (ADR-162). Forwarded directly from the
     * sandbox's RESTORED frame so the client and server can rehydrate
     * their mirrors in lockstep with the engine's restored state.
     */
    world: string;
  }>;
}

export function createSaveService(deps: SaveServiceDeps): SaveService {
  const sandboxTimeoutMs = deps.sandboxTimeoutMs ?? 30_000;
  const now = deps.now ?? (() => new Date());

  async function spawnFor(room_id: string): Promise<SandboxEntry> {
    const room = deps.rooms.findById(room_id);
    if (!room) throw new SaveServiceError('unknown_room', `room ${room_id} not found`);
    const story = deps.stories.findBySlug(room.story_slug);
    if (!story) {
      throw new SaveServiceError(
        'unknown_story',
        `story ${room.story_slug} not available`
      );
    }
    const bundle_path = await getCompiledBundle(story.path);
    return deps.sandboxes.getOrSpawn({
      room_id,
      story_file: story.path,
      bundle_path,
    });
  }

  function countCompletedTurns(room_id: string): number {
    const row = deps.db
      .prepare(
        `SELECT COUNT(*) as c FROM session_events WHERE room_id = ? AND kind = 'output'`
      )
      .get(room_id) as { c: number };
    return row.c;
  }

  function formatSaveName(story_slug: string, turn_number: number, at: Date): string {
    return `${story_slug} — T${turn_number} — ${at.toISOString()}`;
  }

  return {
    async save({ room_id, actor_id }) {
      const entry = await spawnFor(room_id);
      await entry.ready;

      const save_id = randomUUID();

      const saved = await new Promise<{ save_id: string; blob_b64: string }>(
        (resolve, reject) => {
          const timer = setTimeout(() => {
            entry.process.off('message', onMessage);
            reject(new SaveServiceError('sandbox_timeout', 'SAVE timed out'));
          }, sandboxTimeoutMs);

          const onMessage = (msg: SandboxToServerMessage) => {
            if (msg.kind === 'SAVED') {
              clearTimeout(timer);
              entry.process.off('message', onMessage);
              if (msg.save_id !== save_id) {
                reject(
                  new SaveServiceError(
                    'save_id_mismatch',
                    `sandbox returned SAVED for ${msg.save_id}, expected ${save_id}`
                  )
                );
                return;
              }
              resolve({ save_id: msg.save_id, blob_b64: msg.blob_b64 });
            } else if (msg.kind === 'ERROR' && msg.phase === 'save') {
              clearTimeout(timer);
              entry.process.off('message', onMessage);
              reject(new SaveServiceError('sandbox_error', msg.detail));
            }
          };
          entry.process.on('message', onMessage);

          entry.process.send({ kind: 'SAVE', save_id });
        }
      );

      const blob = Buffer.from(saved.blob_b64, 'base64');

      const room = deps.rooms.findById(room_id);
      if (!room) throw new SaveServiceError('unknown_room', `room ${room_id} not found`);

      const turnNumber = countCompletedTurns(room_id);
      const createdAt = now();
      const save_name = formatSaveName(room.story_slug, turnNumber, createdAt);

      const tx = deps.db.transaction(() => {
        deps.saves.create({
          save_id: saved.save_id,
          room_id,
          actor_id,
          name: save_name,
          blob,
        });
        deps.sessionEvents.append({
          room_id,
          participant_id: actor_id,
          kind: 'save',
          payload: { kind: 'save', save_id: saved.save_id, save_name },
        });
        deps.rooms.updateLastActivity(room_id, createdAt.toISOString());
      });
      // If any statement in the transaction throws (disk full, locked db,
      // constraint violation), better-sqlite3 rolls every write back. Wrap
      // and reclassify as `persistence_failure` so handlers can broadcast
      // the canonical error envelope (ADR-153 N-2).
      try {
        tx();
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'database write failed';
        console.error('[save-service] save persistence failure:', detail);
        throw new SaveServiceError('persistence_failure', detail);
      }

      return {
        save_id: saved.save_id,
        name: save_name,
        created_at: createdAt.toISOString(),
      };
    },

    async restore({ room_id, actor_id, save_id }) {
      const existing = deps.saves.findById(save_id);
      if (!existing) {
        throw new SaveServiceError('save_not_found', `save ${save_id} not found`);
      }
      if (existing.room_id !== room_id) {
        throw new SaveServiceError(
          'save_room_mismatch',
          `save ${save_id} belongs to another room`
        );
      }

      const entry = await spawnFor(room_id);
      await entry.ready;

      const restored = await new Promise<{ save_id: string; text_blocks: TextBlock[]; world: string }>(
        (resolve, reject) => {
          const timer = setTimeout(() => {
            entry.process.off('message', onMessage);
            reject(new SaveServiceError('sandbox_timeout', 'RESTORE timed out'));
          }, sandboxTimeoutMs);

          const onMessage = (msg: SandboxToServerMessage) => {
            if (msg.kind === 'RESTORED') {
              clearTimeout(timer);
              entry.process.off('message', onMessage);
              if (msg.save_id !== save_id) {
                reject(
                  new SaveServiceError(
                    'save_id_mismatch',
                    `sandbox returned RESTORED for ${msg.save_id}, expected ${save_id}`
                  )
                );
                return;
              }
              resolve({ save_id: msg.save_id, text_blocks: msg.text_blocks, world: msg.world });
            } else if (msg.kind === 'ERROR' && msg.phase === 'restore') {
              clearTimeout(timer);
              entry.process.off('message', onMessage);
              reject(new SaveServiceError('sandbox_error', msg.detail));
            }
          };
          entry.process.on('message', onMessage);

          entry.process.send({
            kind: 'RESTORE',
            save_id,
            blob_b64: existing.blob.toString('base64'),
          });
        }
      );

      const tx = deps.db.transaction(() => {
        deps.sessionEvents.append({
          room_id,
          participant_id: actor_id,
          kind: 'restore',
          payload: { kind: 'restore', save_id: restored.save_id },
        });
        deps.rooms.updateLastActivity(room_id, now().toISOString());
      });
      // Same atomic guarantee as the save path: an append failure rolls the
      // last-activity bump back and surfaces as `persistence_failure` so the
      // caller sees a canonical error envelope rather than a raw DB error.
      try {
        tx();
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'database write failed';
        console.error('[save-service] restore persistence failure:', detail);
        throw new SaveServiceError('persistence_failure', detail);
      }

      return {
        save_id: restored.save_id,
        text_blocks: restored.text_blocks,
        world: restored.world,
      };
    },
  };
}
