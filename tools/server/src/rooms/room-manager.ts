/**
 * Room manager — coordinates sandbox lifecycle and output broadcast for a room.
 *
 * Public interface: {@link RoomManager}, {@link createRoomManager}.
 * Bounded context: server-side runtime coordination (ADR-153 Decision 1).
 *
 * The manager spawns the sandbox lazily on first COMMAND, correlates each
 * COMMAND with its OUTPUT via `turn_id`, and emits the broadcast
 * (`story_output`) plus the two session-event-log rows (`command`, `output`).
 *
 * Crash handling satisfies AC7: a sandbox exit without EXITED triggers a
 * broadcast of a runtime_crash error envelope; the server process stays up.
 */

import type { Database } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { RoomsRepository } from '../repositories/rooms.js';
import type { SessionEventsRepository } from '../repositories/session-events.js';
import type { StoryScanner } from '../stories/scanner.js';
import type { ConnectionManager } from '../ws/connection-manager.js';
import type { SandboxRegistry, SandboxEntry } from '../sandbox/sandbox-registry.js';
import type { Output, SandboxToServerMessage } from '../wire/server-sandbox.js';
import type { ServerMsg } from '../wire/browser-server.js';

export interface RoomManagerDeps {
  db: Database;
  rooms: RoomsRepository;
  sessionEvents: SessionEventsRepository;
  stories: StoryScanner;
  sandboxes: SandboxRegistry;
  connections: ConnectionManager;
  /** How long to wait for an OUTPUT before timing out (ms). */
  turnTimeoutMs?: number;
  /** Override the sandbox binary/args (tests use a Node stub). */
  sandboxOverride?: { binary?: string; args?: string[] };
}

export interface RoomManager {
  /**
   * Run one command on behalf of `actor_id` (already validated as allowed
   * to submit by the caller — lock enforcement is Phase 5). Resolves when
   * the OUTPUT has been broadcast and logged.
   */
  submitCommand(input: { room_id: string; actor_id: string; text: string }): Promise<void>;
  /** Tear down the sandbox for a room, if any. */
  closeRoom(room_id: string): void;
}

export function createRoomManager(deps: RoomManagerDeps): RoomManager {
  const turnTimeoutMs = deps.turnTimeoutMs ?? 30_000;

  // In-flight turn id per room. Populated when `submitCommand` dispatches a
  // COMMAND, cleared on OUTPUT, error, or crash. The sandbox crash handler
  // reads this to distinguish "crashed during your command" (include turn_id)
  // from "crashed while idle" (room-wide notice only) — ADR-153 N-1.
  const inflightTurnId = new Map<string, string>();

  // Rooms whose sandbox already has a crash listener attached. A new
  // getOrSpawn for the same room returns the same entry; attaching `once`
  // per submitCommand would register N listeners that all fire on one
  // crash. This set guards against that.
  const crashAttached = new Set<string>();

  function spawnFor(room_id: string): SandboxEntry {
    const room = deps.rooms.findById(room_id);
    if (!room) throw new Error(`room-manager: unknown room ${room_id}`);
    const story = deps.stories.findBySlug(room.story_slug);
    if (!story) throw new Error(`room-manager: story ${room.story_slug} not available`);

    const entry = deps.sandboxes.getOrSpawn({
      room_id,
      story_file: story.path,
      binary: deps.sandboxOverride?.binary,
      args: deps.sandboxOverride?.args,
    });

    if (!crashAttached.has(room_id)) {
      crashAttached.add(room_id);
      entry.process.once('crash', (info) => {
        const turn_id = inflightTurnId.get(room_id);
        const detail = turn_id
          ? 'The story runtime crashed during your command. The last turn may be incomplete. Restore from the last save to continue.'
          : info.stderr?.slice(0, 400) ||
            'The story runtime crashed. Restore from the last save to continue.';

        const frame: ServerMsg = turn_id
          ? { kind: 'error', code: 'runtime_crash', detail, turn_id }
          : { kind: 'error', code: 'runtime_crash', detail };
        deps.connections.broadcast(room_id, frame);

        inflightTurnId.delete(room_id);
        // Allow a future respawn (e.g. post-RESTORE) to re-wire crash handling.
        crashAttached.delete(room_id);
      });
    }

    return entry;
  }

  async function runTurn(
    room_id: string,
    actor_id: string,
    text: string
  ): Promise<Output> {
    const entry = spawnFor(room_id);
    await entry.ready;

    const turn_id = randomUUID();
    inflightTurnId.set(room_id, turn_id);

    try {
      const output = await new Promise<Output>((resolve, reject) => {
        const timer = setTimeout(() => {
          entry.process.off('message', onMessage);
          reject(new Error('turn timeout'));
        }, turnTimeoutMs);

        const onMessage = (msg: SandboxToServerMessage) => {
          if (msg.kind === 'OUTPUT' && msg.turn_id === turn_id) {
            clearTimeout(timer);
            entry.process.off('message', onMessage);
            resolve(msg);
          } else if (msg.kind === 'ERROR' && msg.turn_id === turn_id) {
            clearTimeout(timer);
            entry.process.off('message', onMessage);
            reject(new Error(msg.detail));
          }
        };
        entry.process.on('message', onMessage);

        entry.process.send({ kind: 'COMMAND', turn_id, input: text, actor: actor_id });
      });
      return output;
    } finally {
      // Always clear the in-flight marker — resolution path AND rejection
      // path — so the next crash (if any) is classified correctly.
      if (inflightTurnId.get(room_id) === turn_id) {
        inflightTurnId.delete(room_id);
      }
    }
  }

  return {
    async submitCommand({ room_id, actor_id, text }) {
      let output: Output;
      try {
        output = await runTurn(room_id, actor_id, text);
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'turn failed';
        deps.connections.broadcast(room_id, {
          kind: 'error',
          code: 'turn_failed',
          detail,
        });
        return;
      }

      // Log + update activity + broadcast — atomicity on the two event
      // appends + activity bump.
      const tx = deps.db.transaction(() => {
        deps.sessionEvents.append({
          room_id,
          participant_id: actor_id,
          kind: 'command',
          payload: { kind: 'command', input: text, turn_id: output.turn_id },
        });
        deps.sessionEvents.append({
          room_id,
          participant_id: null,
          kind: 'output',
          payload: {
            kind: 'output',
            turn_id: output.turn_id,
            text_blocks: output.text_blocks,
            events: output.events,
          },
        });
        deps.rooms.updateLastActivity(room_id, new Date().toISOString());
      });
      tx();

      deps.connections.broadcast(room_id, {
        kind: 'story_output',
        turn_id: output.turn_id,
        text_blocks: output.text_blocks,
        events: output.events,
      });
    },

    closeRoom(room_id) {
      deps.sandboxes.tearDown(room_id);
    },
  };
}
