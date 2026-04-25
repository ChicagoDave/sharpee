/**
 * WebSocket server factory.
 *
 * Public interface: {@link createWsServer}, {@link WsDeps}, {@link WsServerHandle}.
 * Bounded context: real-time presence, chat, story-output push (ADR-153
 * Interface Contracts; Decisions 7, 15).
 *
 * URL scheme: `/ws/:room_id`. The client opens the socket to that path and
 * immediately sends `{ kind: 'hello', token }`. The server validates the
 * token and either completes the handshake with a `welcome` or closes the
 * socket with a 4xxx application close code.
 *
 * A `hello` must arrive within {@link HELLO_TIMEOUT_MS} of connect; otherwise
 * the socket is closed with `4003 / hello_timeout`.
 *
 * Phase 5 adds four dispatch targets beyond `submit_command`:
 *   - `draft_delta`  → live-typing broadcast + lock acquisition
 *   - `release_lock` → voluntary release
 *   - `force_release`→ authority release
 * plus a server-owned {@link AfkTimer} that sweeps idle holders every
 * {@link AfkTimerOptions.intervalMs} ms.
 */

import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import type { Database } from 'better-sqlite3';
import type { Config } from '../config.js';
import type { RoomsRepository } from '../repositories/rooms.js';
import type { ParticipantsRepository } from '../repositories/participants.js';
import type { IdentitiesRepository } from '../repositories/identities.js';
import type { SavesRepository } from '../repositories/saves.js';
import type { SessionEventsRepository } from '../repositories/session-events.js';
import type { HashService } from '../auth/hash-service.js';
import type { ClientMsg, ServerMsg } from '../wire/browser-server.js';
import { createConnectionManager, type ConnectionManager } from './connection-manager.js';
import { handleHello } from './handlers/hello.js';
import { handleDisconnect } from './handlers/presence.js';
import { handleSubmitCommand } from './handlers/submit-command.js';
import { handleDraftDelta } from './handlers/draft-delta.js';
import { handleReleaseLock } from './handlers/release-lock.js';
import { handleForceRelease } from './handlers/force-release.js';
import { handleSave } from './handlers/save.js';
import { handleRestore } from './handlers/restore.js';
import { handlePromote } from './handlers/promote.js';
import { handleDemote } from './handlers/demote.js';
import { handleNominateSuccessor } from './handlers/nominate-successor.js';
import { handleChat } from './handlers/chat.js';
import { handleDm } from './handlers/dm.js';
import { handleMute } from './handlers/mute.js';
import { handleUnmute } from './handlers/unmute.js';
import { handlePin } from './handlers/pin.js';
import { handleDeleteRoom } from './handlers/delete-room.js';
import {
  createRecycleSweeper,
  type RecycleSweeper,
  type RecycleSweeperOptions,
} from '../rooms/recycle-sweeper.js';
import type { SandboxRegistry } from '../sandbox/sandbox-registry.js';
import { createLockManager, type LockManager } from './lock-manager.js';
import { createAfkTimer, type AfkTimer, type AfkTimerOptions } from './afk-timer.js';
import {
  createPhGraceTimer,
  DEFAULT_PH_GRACE_TIMEOUT_MS,
  type PhGraceTimer,
  type PhGraceTimerOptions,
  type Clock,
} from '../rooms/ph-grace-timer.js';
import { performSuccession } from '../rooms/succession.js';
import type { RoomManager } from '../rooms/room-manager.js';
import type { SaveService } from '../saves/save-service.js';

/** How long a freshly-connected socket has to deliver the hello frame. */
export const HELLO_TIMEOUT_MS = 5_000;

export interface WsDeps {
  config: Config;
  db: Database;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  identities: IdentitiesRepository;
  hashService: HashService;
  saves: SavesRepository;
  sessionEvents: SessionEventsRepository;
  /**
   * Externally-constructed ConnectionManager — lets RoomManager share the
   * exact same instance without a circular dependency at construction time.
   * If omitted, a fresh one is created.
   */
  connections?: ConnectionManager;
  /**
   * Externally-constructed LockManager. If omitted, a fresh one is created.
   * Tests may inject a lock manager backed by a mock clock.
   */
  locks?: LockManager;
  /** Optional AFK sweep options; lets tests shrink the interval / threshold. */
  afkTimerOptions?: AfkTimerOptions;
  /** Optional for Phase 3-only wiring; required once submit_command is routed. */
  roomManager?: RoomManager;
  /** Required once the `save` / `restore` frames are routed (Phase 6). */
  saveService?: SaveService;
  /** PH grace timer options — lets tests use a 1-second window for speed. */
  phGraceTimerOptions?: PhGraceTimerOptions;
  /** Inject a MockClock in tests so the grace timer advances deterministically. */
  phGraceTimerClock?: Clock;
  /**
   * Sandbox registry — required once `delete_room` is routed and the idle
   * recycle sweeper needs to tear sandboxes down before the DB cascade.
   */
  sandboxes?: SandboxRegistry;
  /**
   * Recycle sweeper overrides. When omitted, the sweeper is auto-created if
   * {@link sandboxes} is provided, using `config.rooms.idleRecycleDays` and
   * the default 60-second interval.
   */
  recycleSweeperOptions?: Partial<RecycleSweeperOptions>;
  /** Inject a MockClock so tests can advance recycle-sweeper time deterministically. */
  recycleSweeperClock?: Clock;
}

export interface WsServerHandle {
  readonly wss: WebSocketServer;
  readonly connections: ConnectionManager;
  readonly locks: LockManager;
  readonly afkTimer: AfkTimer;
  readonly phGraceTimer: PhGraceTimer;
  /** Null when no SandboxRegistry was provided at construction time. */
  readonly recycleSweeper: RecycleSweeper | null;
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void;
  close(): Promise<void>;
}

interface PendingSocket {
  timer: NodeJS.Timeout;
  url_room_id: string;
}

function rejectUpgrade(socket: Duplex, status: number, body = ''): void {
  try {
    socket.write(
      `HTTP/1.1 ${status} ${body || 'Rejected'}\r\n` +
        'Content-Type: text/plain\r\n' +
        `Content-Length: ${body.length}\r\n` +
        'Connection: close\r\n' +
        '\r\n' +
        body
    );
  } catch {
    /* best-effort */
  } finally {
    socket.destroy();
  }
}

/** Extract `:room_id` from a `/ws/:room_id[?q]` path. Returns null if no match. */
function parseRoomIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const m = /^\/ws\/([^/?#]+)/.exec(url);
  return m ? decodeURIComponent(m[1]!) : null;
}

function sendMsg(ws: WebSocket, msg: ServerMsg): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* noop */
  }
}

/**
 * Construct the WebSocket server in `noServer` mode.
 *
 * The caller is responsible for wiring the host HTTP server's `upgrade`
 * event to this handle's `handleUpgrade`.
 *
 * Side effect: the returned handle has already started its AFK sweep timer.
 * Call `handle.close()` to stop it during shutdown or test teardown.
 */
export function createWsServer(deps: WsDeps): WsServerHandle {
  const wss = new WebSocketServer({ noServer: true });
  const connections = deps.connections ?? createConnectionManager();
  const locks = deps.locks ?? createLockManager();
  const afkTimer = createAfkTimer(
    { locks, connections, sessionEvents: deps.sessionEvents },
    deps.afkTimerOptions ?? {}
  );
  afkTimer.start();

  // PH grace timer — started on PH disconnect, cancelled on PH reconnect,
  // fires the succession chain when the 5-minute window elapses.
  const phGraceTimer = createPhGraceTimer(
    {
      clock: deps.phGraceTimerClock,
      onFire: (room_id) => {
        // Recheck: PH may have reconnected between scheduling and fire.
        const room = deps.rooms.findById(room_id);
        if (!room || !room.primary_host_id) return;
        const currentPh = deps.participants.findById(room.primary_host_id);
        if (!currentPh || currentPh.connected) return; // raced reconnect

        const outcome = performSuccession(
          {
            db: deps.db,
            rooms: deps.rooms,
            participants: deps.participants,
            sessionEvents: deps.sessionEvents,
          },
          room_id
        );
        if (outcome.kind !== 'succeeded') return;

        // Broadcast the three role_change frames + a `successor` push.
        // actor_id is null for every frame — these are system-initiated.
        if (outcome.old_ph_id) {
          connections.broadcast(room_id, {
            kind: 'role_change',
            participant_id: outcome.old_ph_id,
            tier: 'participant',
            actor_id: null,
          });
        }
        connections.broadcast(room_id, {
          kind: 'role_change',
          participant_id: outcome.new_ph_id,
          tier: 'primary_host',
          actor_id: null,
        });
        if (outcome.new_co_host_id) {
          connections.broadcast(room_id, {
            kind: 'role_change',
            participant_id: outcome.new_co_host_id,
            tier: 'co_host',
            actor_id: null,
          });
          connections.broadcast(room_id, {
            kind: 'successor',
            participant_id: outcome.new_co_host_id,
          });
        }
      },
    },
    deps.phGraceTimerOptions ?? {}
  );

  // Recycle sweeper: created only when a SandboxRegistry is available, since
  // teardown of a sandbox is a mandatory step in the recycle transaction.
  const recycleSweeper: RecycleSweeper | null = deps.sandboxes
    ? createRecycleSweeper(
        {
          rooms: deps.rooms,
          sandboxes: deps.sandboxes,
          connections,
          clock: deps.recycleSweeperClock,
        },
        {
          idleRecycleDays:
            deps.recycleSweeperOptions?.idleRecycleDays ?? deps.config.rooms.idleRecycleDays,
          ...(deps.recycleSweeperOptions?.intervalMs !== undefined && {
            intervalMs: deps.recycleSweeperOptions.intervalMs,
          }),
        }
      )
    : null;
  recycleSweeper?.start();

  const pending = new WeakMap<WebSocket, PendingSocket>();
  const socketRoom = new WeakMap<WebSocket, string>();

  function attachHandlers(ws: WebSocket, url_room_id: string): void {
    socketRoom.set(ws, url_room_id);

    const helloTimer = setTimeout(() => {
      sendMsg(ws, { kind: 'error', code: 'hello_timeout', detail: 'no hello within timeout' });
      try {
        ws.close(4003, 'hello_timeout');
      } catch {
        /* ignore */
      }
    }, HELLO_TIMEOUT_MS);
    pending.set(ws, { timer: helloTimer, url_room_id });

    ws.on('message', (data: Buffer | string) => {
      const pendingInfo = pending.get(ws);
      if (pendingInfo) {
        clearTimeout(pendingInfo.timer);
        pending.delete(ws);
        let frame: ClientMsg;
        try {
          frame = JSON.parse(String(data)) as ClientMsg;
        } catch {
          sendMsg(ws, { kind: 'error', code: 'malformed_frame', detail: 'invalid JSON' });
          ws.close(4005, 'malformed_frame');
          return;
        }
        // hello processing is async because secret verification calls argon2.
        // Resolve before the PH-grace cancel so the cancel sees the same
        // participant_id the client now believes they own.
        void (async () => {
          const participant_id = await handleHello(
            {
              db: deps.db,
              rooms: deps.rooms,
              participants: deps.participants,
              identities: deps.identities,
              hashService: deps.hashService,
              saves: deps.saves,
              sessionEvents: deps.sessionEvents,
              connections,
              roomManager: deps.roomManager,
            },
            ws,
            pendingInfo.url_room_id,
            frame
          );

          // If the joining participant is the current PH of this room, their
          // hello is a reconnect within the grace window — cancel the pending
          // succession fire.
          if (participant_id) {
            const room = deps.rooms.findById(pendingInfo.url_room_id);
            if (room && room.primary_host_id === participant_id) {
              phGraceTimer.cancel(pendingInfo.url_room_id);
            }
          }
        })();
        return;
      }

      // Post-hello frame dispatch.
      let frame: ClientMsg;
      try {
        frame = JSON.parse(String(data)) as ClientMsg;
      } catch {
        sendMsg(ws, { kind: 'error', code: 'malformed_frame', detail: 'invalid JSON' });
        return;
      }
      const actor = connections.getSocketMeta(ws);
      if (!actor) {
        // Should never happen: post-hello frames imply we have a registered socket.
        sendMsg(ws, { kind: 'error', code: 'not_registered', detail: 'socket not registered' });
        return;
      }

      if (frame.kind === 'submit_command') {
        if (!deps.roomManager) {
          sendMsg(ws, { kind: 'error', code: 'not_ready', detail: 'room manager not wired' });
          return;
        }
        void handleSubmitCommand(
          {
            participants: deps.participants,
            connections,
            roomManager: deps.roomManager,
            locks,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      if (frame.kind === 'draft_delta') {
        handleDraftDelta(
          {
            participants: deps.participants,
            connections,
            locks,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      if (frame.kind === 'release_lock') {
        handleReleaseLock(
          {
            participants: deps.participants,
            connections,
            locks,
          },
          ws,
          actor
        );
        return;
      }

      if (frame.kind === 'force_release') {
        handleForceRelease(
          {
            participants: deps.participants,
            sessionEvents: deps.sessionEvents,
            connections,
            locks,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      if (frame.kind === 'save') {
        if (!deps.saveService) {
          sendMsg(ws, { kind: 'error', code: 'not_ready', detail: 'save service not wired' });
          return;
        }
        void handleSave(
          {
            participants: deps.participants,
            connections,
            saveService: deps.saveService,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      if (frame.kind === 'restore') {
        if (!deps.saveService) {
          sendMsg(ws, { kind: 'error', code: 'not_ready', detail: 'save service not wired' });
          return;
        }
        void handleRestore(
          {
            participants: deps.participants,
            connections,
            locks,
            saveService: deps.saveService,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      if (frame.kind === 'promote') {
        handlePromote(
          {
            participants: deps.participants,
            sessionEvents: deps.sessionEvents,
            connections,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      if (frame.kind === 'demote') {
        handleDemote(
          {
            participants: deps.participants,
            sessionEvents: deps.sessionEvents,
            connections,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      if (frame.kind === 'nominate_successor') {
        handleNominateSuccessor(
          {
            db: deps.db,
            participants: deps.participants,
            sessionEvents: deps.sessionEvents,
            connections,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      if (frame.kind === 'chat') {
        handleChat(
          {
            participants: deps.participants,
            sessionEvents: deps.sessionEvents,
            rooms: deps.rooms,
            connections,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      if (frame.kind === 'dm') {
        handleDm(
          {
            participants: deps.participants,
            sessionEvents: deps.sessionEvents,
            rooms: deps.rooms,
            connections,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      if (frame.kind === 'mute') {
        handleMute(
          {
            participants: deps.participants,
            sessionEvents: deps.sessionEvents,
            connections,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      if (frame.kind === 'unmute') {
        handleUnmute(
          {
            participants: deps.participants,
            sessionEvents: deps.sessionEvents,
            connections,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      if (frame.kind === 'pin' || frame.kind === 'unpin') {
        handlePin(
          {
            participants: deps.participants,
            rooms: deps.rooms,
            sessionEvents: deps.sessionEvents,
            connections,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      if (frame.kind === 'delete_room') {
        if (!deps.sandboxes) {
          sendMsg(ws, {
            kind: 'error',
            code: 'not_ready',
            detail: 'sandbox registry not wired',
          });
          return;
        }
        handleDeleteRoom(
          {
            participants: deps.participants,
            rooms: deps.rooms,
            connections,
            sandboxes: deps.sandboxes,
          },
          ws,
          actor,
          frame
        );
        return;
      }

      sendMsg(ws, {
        kind: 'error',
        code: 'not_implemented',
        detail: `frame kind ${(frame as { kind: string }).kind} not handled in phase 10`,
      });
    });

    ws.on('close', () => {
      const pendingInfo = pending.get(ws);
      if (pendingInfo) clearTimeout(pendingInfo.timer);
      pending.delete(ws);

      const meta = connections.unregisterSocket(ws);
      if (meta) {
        // If the disconnecting socket held the lock, release it so the next
        // typist in the room can acquire. Broadcast only if a release
        // actually happened.
        const released = locks.release(meta.room_id, meta.participant_id);
        if (released) {
          connections.broadcast(meta.room_id, { kind: 'lock_state', holder_id: null });
        }
        // Compute the grace deadline *before* broadcasting presence so the
        // clients' banner countdown matches the timer exactly. Deadline is
        // null for non-PH disconnects.
        const room = deps.rooms.findById(meta.room_id);
        const isPhDisconnect =
          room !== null && room.primary_host_id === meta.participant_id;
        const graceTimeoutMs =
          deps.phGraceTimerOptions?.timeoutMs ?? DEFAULT_PH_GRACE_TIMEOUT_MS;
        const grace_deadline = isPhDisconnect
          ? new Date(Date.now() + graceTimeoutMs).toISOString()
          : null;

        handleDisconnect(
          {
            db: deps.db,
            participants: deps.participants,
            sessionEvents: deps.sessionEvents,
            connections,
          },
          meta.participant_id,
          meta.room_id,
          'disconnect',
          grace_deadline,
        );

        // If the disconnecting socket belongs to the current PH, start the
        // grace timer. Re-scheduling is idempotent — a second disconnect
        // during the window simply restarts the clock (matches the handler
        // contract in ph-grace-timer.ts).
        if (isPhDisconnect) {
          phGraceTimer.start(meta.room_id);
        }
      }
    });

    ws.on('error', () => {
      /* close handler runs cleanup; nothing to do here */
    });
  }

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url_room_id = parseRoomIdFromUrl(req.url);
    if (!url_room_id) {
      sendMsg(ws, { kind: 'error', code: 'bad_url', detail: 'expected /ws/:room_id' });
      ws.close(4004, 'bad_url');
      return;
    }
    attachHandlers(ws, url_room_id);
  });

  return {
    wss,
    connections,
    locks,
    afkTimer,
    phGraceTimer,
    recycleSweeper,
    handleUpgrade(req, socket, head) {
      const roomId = parseRoomIdFromUrl(req.url);
      if (!roomId) {
        rejectUpgrade(socket, 404, 'Not Found');
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    },
    async close() {
      afkTimer.stop();
      phGraceTimer.cancelAll();
      recycleSweeper?.stop();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    },
  };
}
