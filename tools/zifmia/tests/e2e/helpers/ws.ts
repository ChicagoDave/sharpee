/**
 * WebSocket client wrapper for E2E specs.
 *
 * Owner: zifmia e2e harness.
 *
 * Wraps the production `/ws/rooms/:id` endpoint with await-able recv /
 * predicate-recv / close-event capture. Not a stub — the `ws`
 * library is the same client the browser bundle uses underneath.
 *
 * Lifecycle:
 *   `connect()` opens the socket and waits for `open`.
 *   `hello()` sends a hello frame and waits for `hello:ack`.
 *   Frames received before any waiter is registered are queued.
 *   `close()` cleanly closes the socket; `awaitClose()` resolves with
 *   `{ code, reason }` whenever the socket closes (server- or
 *   client-initiated).
 */

import WebSocket from 'ws';

export interface ServerFrameLike {
  type: string;
  [key: string]: unknown;
}

export interface CloseInfo {
  code: number;
  reason: string;
}

export interface E2eSocket {
  ws: WebSocket;
  /** Resolves when the next frame arrives (any type). */
  recv(timeoutMs?: number): Promise<ServerFrameLike>;
  /** Resolves when a frame matching `predicate` arrives. Non-matching frames stay queued. */
  recvWhere(predicate: (f: ServerFrameLike) => boolean, timeoutMs?: number): Promise<ServerFrameLike>;
  /** Send a JSON frame. */
  send(frame: object): void;
  /** Resolves on the next close event. Already-closed sockets resolve immediately. */
  awaitClose(timeoutMs?: number): Promise<CloseInfo>;
  /** Drained frames the harness has seen but no waiter consumed. */
  drained(): ServerFrameLike[];
  /** Initiate a normal close. */
  close(code?: number): void;
}

export async function openSocket(baseURL: string, roomId: string): Promise<E2eSocket> {
  const wsBase = baseURL.replace(/^http/, 'ws');
  const ws = new WebSocket(`${wsBase}/ws/rooms/${roomId}`);
  const queue: ServerFrameLike[] = [];
  const fifoWaiters: Array<(f: ServerFrameLike) => void> = [];
  const predicateWaiters: Array<{
    predicate: (f: ServerFrameLike) => boolean;
    resolve: (f: ServerFrameLike) => void;
  }> = [];
  let closed: CloseInfo | null = null;
  const closeWaiters: Array<(c: CloseInfo) => void> = [];

  ws.on('message', (data: Buffer) => {
    let parsed: ServerFrameLike;
    try {
      parsed = JSON.parse(data.toString('utf8')) as ServerFrameLike;
    } catch {
      return;
    }
    for (let i = 0; i < predicateWaiters.length; i += 1) {
      if (predicateWaiters[i].predicate(parsed)) {
        const [w] = predicateWaiters.splice(i, 1);
        w.resolve(parsed);
        return;
      }
    }
    const next = fifoWaiters.shift();
    if (next) {
      next(parsed);
      return;
    }
    queue.push(parsed);
  });

  ws.on('close', (code, reasonBuf) => {
    closed = { code, reason: reasonBuf.toString('utf8') };
    for (const cb of closeWaiters.splice(0)) cb(closed);
  });

  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });

  const sock: E2eSocket = {
    ws,
    recv(timeoutMs = 2000) {
      return new Promise((resolve, reject) => {
        if (queue.length > 0) return resolve(queue.shift()!);
        const t = setTimeout(() => {
          const idx = fifoWaiters.indexOf(handler);
          if (idx >= 0) fifoWaiters.splice(idx, 1);
          reject(new Error('recv timed out'));
        }, timeoutMs);
        const handler = (f: ServerFrameLike) => {
          clearTimeout(t);
          resolve(f);
        };
        fifoWaiters.push(handler);
      });
    },
    recvWhere(predicate, timeoutMs = 2000) {
      return new Promise((resolve, reject) => {
        for (let i = 0; i < queue.length; i += 1) {
          if (predicate(queue[i])) {
            const [match] = queue.splice(i, 1);
            return resolve(match);
          }
        }
        const t = setTimeout(() => {
          const idx = predicateWaiters.findIndex((w) => w.predicate === predicate);
          if (idx >= 0) predicateWaiters.splice(idx, 1);
          reject(new Error('recvWhere timed out'));
        }, timeoutMs);
        predicateWaiters.push({
          predicate,
          resolve: (f) => {
            clearTimeout(t);
            resolve(f);
          }
        });
      });
    },
    send(frame) {
      ws.send(JSON.stringify(frame));
    },
    awaitClose(timeoutMs = 3000) {
      return new Promise((resolve, reject) => {
        if (closed) return resolve(closed);
        const t = setTimeout(() => {
          const idx = closeWaiters.indexOf(handler);
          if (idx >= 0) closeWaiters.splice(idx, 1);
          reject(new Error('awaitClose timed out'));
        }, timeoutMs);
        const handler = (c: CloseInfo) => {
          clearTimeout(t);
          resolve(c);
        };
        closeWaiters.push(handler);
      });
    },
    drained() {
      return queue.slice();
    },
    close(code = 1000) {
      ws.close(code);
    }
  };
  return sock;
}

export interface HelloAckLike {
  type: 'hello:ack';
  participantId: string;
  tier: string;
  lockHolder: string | null;
}

/**
 * Open a socket and complete the hello handshake. Returns the socket
 * and the hello:ack frame.
 */
export async function openAndHello(
  baseURL: string,
  roomId: string,
  handle: string
): Promise<{ sock: E2eSocket; ack: HelloAckLike }> {
  const sock = await openSocket(baseURL, roomId);
  sock.send({ type: 'hello', roomId, handle });
  const first = await sock.recv();
  if (first.type !== 'hello:ack') {
    throw new Error(`expected hello:ack, got ${first.type}`);
  }
  return { sock, ack: first as HelloAckLike };
}
