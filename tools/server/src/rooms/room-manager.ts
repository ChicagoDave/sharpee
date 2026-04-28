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
import { WorldModel } from '@sharpee/world-model';
import type { RoomsRepository } from '../repositories/rooms.js';
import type { SessionEventsRepository } from '../repositories/session-events.js';
import type { StoryScanner } from '../stories/scanner.js';
import type { ConnectionManager } from '../ws/connection-manager.js';
import type { SandboxRegistry, SandboxEntry } from '../sandbox/sandbox-registry.js';
import type { Output, SandboxToServerMessage } from '../wire/server-sandbox.js';
import type { ServerMsg } from '../wire/browser-server.js';
import type { ReadOnlyWorldModel } from '../wire/world-mirror.js';
import { getCompiledBundle } from '../sandbox/story-cache.js';

export interface RoomManagerDeps {
  db: Database;
  rooms: RoomsRepository;
  sessionEvents: SessionEventsRepository;
  stories: StoryScanner;
  sandboxes: SandboxRegistry;
  connections: ConnectionManager;
  /** How long to wait for an OUTPUT before timing out (ms). */
  turnTimeoutMs?: number;
  /** How long to wait for a STATUS reply on cold-start welcome (ms). */
  statusTimeoutMs?: number;
}

export interface RoomManager {
  /**
   * Run one command on behalf of `actor_id` (already validated as allowed
   * to submit by the caller — lock enforcement is Phase 5). Resolves when
   * the OUTPUT has been broadcast and logged.
   */
  submitCommand(input: { room_id: string; actor_id: string; text: string }): Promise<void>;
  /**
   * Fire the opening-scene `look` for a room if it has never run one before.
   * Idempotent: in-memory guard + a one-shot DB check for any prior `output`
   * event. Called on first WS `hello` so users see the opening text without
   * having to type anything (parity with platform-browser + Zifmia startup).
   */
  ensureInitialLook(room_id: string): Promise<void>;
  /** Tear down the sandbox for a room, if any. */
  closeRoom(room_id: string): void;
  /**
   * Read accessor for the room's world mirror (ADR-162 AC-4).
   * Returns the mirror narrowed to its read-only surface, or null if
   * no mirror is held (cold start, or the room's sandbox hasn't emitted
   * its first OUTPUT yet — call {@link requestStatusSnapshot} to force
   * one).
   */
  getWorldMirror(room_id: string): ReadOnlyWorldModel | null;
  /**
   * Re-serialize the held mirror to its JSON wire form, or return null
   * if no mirror is held. Convenience for the welcome path so callers
   * don't have to widen `ReadOnlyWorldModel` back to a `WorldModel` to
   * access `toJSON`.
   */
  getWorldSnapshot(room_id: string): string | null;
  /**
   * Request a fresh world snapshot from the room's sandbox via
   * STATUS_REQUEST/STATUS round-trip (ADR-162 Decision 6). Spawns the
   * sandbox if necessary, hydrates the mirror with the reply, and
   * returns the JSON string for direct use on the wire (e.g. the
   * welcome RoomSnapshot). Rejects on timeout or sandbox error.
   */
  requestStatusSnapshot(room_id: string): Promise<string>;
}

export function createRoomManager(deps: RoomManagerDeps): RoomManager {
  const turnTimeoutMs = deps.turnTimeoutMs ?? 30_000;
  const statusTimeoutMs = deps.statusTimeoutMs ?? 2_000;

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

  // Rooms whose opening-scene `look` has already been fired (or confirmed
  // unnecessary because prior OUTPUT exists in session_events). Prevents
  // duplicate initial-look firings when multiple participants hello at once.
  const initialLookDone = new Set<string>();

  // Per-room world mirror (ADR-162 AC-4). Hydrated on every OUTPUT and
  // RESTORED via the persistent listener attached in `spawnFor`. Cleared
  // on `closeRoom`.
  const worldMirrors = new Map<string, WorldModel>();

  // Rooms whose sandbox already has the mirror-hydration listener attached.
  // Same anti-double-attach guard pattern as `crashAttached` — getOrSpawn
  // can return an existing entry and we must not double-listen.
  const mirrorAttached = new Set<string>();

  /**
   * Hydrate (replace) the per-room mirror from a serialized world string.
   * On `loadJSON` failure (ADR-162 AC-9 malformed snapshot), the prior
   * mirror is retained and the failure is logged — the receiver does NOT
   * surface the error to the client; subsequent valid snapshots resume
   * normal hydration.
   */
  function hydrateMirror(room_id: string, world_json: string): void {
    try {
      const next = new WorldModel();
      next.loadJSON(world_json);
      worldMirrors.set(room_id, next);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(
        `[room-manager] mirror hydration failed for room ${room_id}; retaining prior mirror: ${detail}`,
      );
    }
  }

  async function spawnFor(room_id: string): Promise<SandboxEntry> {
    const room = deps.rooms.findById(room_id);
    if (!room) throw new Error(`room-manager: unknown room ${room_id}`);
    const story = deps.stories.findBySlug(room.story_slug);
    if (!story) throw new Error(`room-manager: story ${room.story_slug} not available`);

    // Resolve (or compile) the install-time bundle before spawning. Hot-path
    // cost is ~one stat() on cache hit; first-ever spawn for a story pays
    // the esbuild compile once. See story-cache.ts.
    const bundle_path = await getCompiledBundle(story.path);

    const entry = deps.sandboxes.getOrSpawn({
      room_id,
      story_file: story.path,
      bundle_path,
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
        // Mirror tracking is sandbox-bound; a respawn will re-attach.
        mirrorAttached.delete(room_id);
        worldMirrors.delete(room_id);
      });
    }

    // Persistent mirror-hydration listener — fires on every OUTPUT and
    // RESTORED for this sandbox, regardless of which code path triggered
    // them (`runTurn` for COMMAND, `save-service` for RESTORE). Coexists
    // with the request-correlation listeners both of those install — JS
    // EventEmitters fan out to every listener.
    if (!mirrorAttached.has(room_id)) {
      mirrorAttached.add(room_id);
      entry.process.on('message', (msg: SandboxToServerMessage) => {
        if (msg.kind === 'OUTPUT' || msg.kind === 'RESTORED') {
          hydrateMirror(room_id, msg.world);
        }
      });
    }

    return entry;
  }

  async function runTurn(
    room_id: string,
    actor_id: string,
    text: string
  ): Promise<Output> {
    const entry = await spawnFor(room_id);
    await entry.ready;

    const turn_id = randomUUID();
    inflightTurnId.set(room_id, turn_id);

    // Broadcast the command echo eagerly so all participants see what was
    // typed while the turn is still running. System-initiated commands
    // (opening-scene look) are suppressed — they'd look like spontaneous
    // input from nowhere.
    if (actor_id !== 'system') {
      deps.connections.broadcast(room_id, {
        kind: 'player_command',
        turn_id,
        actor_id,
        text,
        ts: new Date().toISOString(),
      });
    }

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

  async function submitCommand(input: {
    room_id: string;
    actor_id: string;
    text: string;
  }): Promise<void> {
    const { room_id, actor_id, text } = input;
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
      world: output.world,
    });
  }

  async function ensureInitialLook(room_id: string): Promise<void> {
    if (initialLookDone.has(room_id)) return;
    // Claim the slot synchronously so parallel hellos don't double-fire.
    initialLookDone.add(room_id);
    // Persisted guard: if the room already has an OUTPUT event (prior session,
    // server restart), the transcript replay on WS welcome covers the opening
    // text. No need to fire again.
    const prior = deps.sessionEvents.listForRoom(room_id, { kinds: ['output'], limit: 1 });
    if (prior.length > 0) return;
    await submitCommand({ room_id, actor_id: 'system', text: 'look' });
  }

  function getWorldMirror(room_id: string): ReadOnlyWorldModel | null {
    return worldMirrors.get(room_id) ?? null;
  }

  function getWorldSnapshot(room_id: string): string | null {
    const mirror = worldMirrors.get(room_id);
    return mirror ? mirror.toJSON() : null;
  }

  async function requestStatusSnapshot(room_id: string): Promise<string> {
    const entry = await spawnFor(room_id);
    await entry.ready;

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        entry.process.off('message', onMessage);
        reject(new Error('STATUS_REQUEST timed out'));
      }, statusTimeoutMs);

      const onMessage = (msg: SandboxToServerMessage): void => {
        if (msg.kind === 'STATUS') {
          clearTimeout(timer);
          entry.process.off('message', onMessage);
          // The persistent mirror-hydration listener attached in `spawnFor`
          // only watches OUTPUT/RESTORED — STATUS is delivered out-of-band
          // for the welcome path, so we hydrate it explicitly here.
          hydrateMirror(room_id, msg.world);
          resolve(msg.world);
        } else if (msg.kind === 'ERROR' && msg.phase === 'turn') {
          // The sandbox emits ERROR(phase: 'turn') when world.toJSON()
          // throws during STATUS_REQUEST handling (see captureWorldSnapshot
          // in deno-entry). It cannot be correlated by turn_id (STATUS
          // carries none), so we treat any phase:'turn' error during the
          // wait window as the failure of this request.
          clearTimeout(timer);
          entry.process.off('message', onMessage);
          reject(new Error(`sandbox error during STATUS_REQUEST: ${msg.detail}`));
        }
      };
      entry.process.on('message', onMessage);

      entry.process.send({ kind: 'STATUS_REQUEST' });
    });
  }

  return {
    submitCommand,
    ensureInitialLook,
    closeRoom(room_id) {
      deps.sandboxes.tearDown(room_id);
      worldMirrors.delete(room_id);
      mirrorAttached.delete(room_id);
    },
    getWorldMirror,
    getWorldSnapshot,
    requestStatusSnapshot,
  };
}
