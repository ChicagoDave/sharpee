/**
 * WebSocket server factory.
 *
 * Public interface: {@link createWsServer}, {@link WsDeps}, {@link WsServerHandle}.
 * Bounded context: real-time presence, chat, story-output push (ADR-153
 * Interface Contracts; Decision 15).
 *
 * URL scheme: `/ws/:room_id`. The client opens the socket to that path and
 * immediately sends `{ kind: 'hello', token }`. The server validates the
 * token and either completes the handshake with a `welcome` or closes the
 * socket with a 4xxx application close code.
 *
 * A `hello` must arrive within {@link HELLO_TIMEOUT_MS} of connect; otherwise
 * the socket is closed with `4003 / hello_timeout`.
 */

import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import type { Database } from 'better-sqlite3';
import type { Config } from '../config.js';
import type { RoomsRepository } from '../repositories/rooms.js';
import type { ParticipantsRepository } from '../repositories/participants.js';
import type { SavesRepository } from '../repositories/saves.js';
import type { SessionEventsRepository } from '../repositories/session-events.js';
import type { ClientMsg, ServerMsg } from '../wire/browser-server.js';
import { createConnectionManager, type ConnectionManager } from './connection-manager.js';
import { handleHello } from './handlers/hello.js';
import { handleDisconnect } from './handlers/presence.js';
import { handleSubmitCommand } from './handlers/submit-command.js';
import type { RoomManager } from '../rooms/room-manager.js';

/** How long a freshly-connected socket has to deliver the hello frame. */
export const HELLO_TIMEOUT_MS = 5_000;

export interface WsDeps {
  config: Config;
  db: Database;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  saves: SavesRepository;
  sessionEvents: SessionEventsRepository;
  /**
   * Externally-constructed ConnectionManager — lets RoomManager share the
   * exact same instance without a circular dependency at construction time.
   * If omitted, a fresh one is created.
   */
  connections?: ConnectionManager;
  /** Optional for Phase 3-only wiring; required once submit_command is routed. */
  roomManager?: RoomManager;
}

export interface WsServerHandle {
  readonly wss: WebSocketServer;
  readonly connections: ConnectionManager;
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
 */
export function createWsServer(deps: WsDeps): WsServerHandle {
  const wss = new WebSocketServer({ noServer: true });
  const connections = deps.connections ?? createConnectionManager();
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
        handleHello(
          {
            db: deps.db,
            rooms: deps.rooms,
            participants: deps.participants,
            saves: deps.saves,
            sessionEvents: deps.sessionEvents,
            connections,
          },
          ws,
          pendingInfo.url_room_id,
          frame
        );
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
        detail: `frame kind ${(frame as { kind: string }).kind} not handled in phase 4`,
      });
    });

    ws.on('close', () => {
      const pendingInfo = pending.get(ws);
      if (pendingInfo) clearTimeout(pendingInfo.timer);
      pending.delete(ws);

      const meta = connections.unregisterSocket(ws);
      if (meta) {
        handleDisconnect(
          {
            db: deps.db,
            participants: deps.participants,
            sessionEvents: deps.sessionEvents,
            connections,
          },
          meta.participant_id,
          meta.room_id
        );
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
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    },
  };
}
