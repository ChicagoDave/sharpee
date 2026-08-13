/**
 * Test helpers for WS integration tests. Spin up a real Fastify
 * server on an ephemeral port, connect ws clients, and provide
 * await-able recv / send. NOT a stub of an owned dependency: the
 * Fastify+ws stack is the production code path; only the test driver
 * lives here.
 */

import WebSocket from 'ws';
import { AddressInfo } from 'node:net';
import { buildServer, type BuildServerOptions, type ZifmiaServer } from '../src/server.js';
import type { ServerFrame, ClientFrame } from '../src/ws/types.js';

export interface BoundServer {
  server: ZifmiaServer;
  port: number;
  wsBase: string;
  close(): Promise<void>;
}

export async function startBoundServer(options: BuildServerOptions = {}): Promise<BoundServer> {
  const server = await buildServer(options);
  await server.app.listen({ port: 0, host: '127.0.0.1' });
  const addr = server.app.server.address();
  if (!addr || typeof addr === 'string') {
    throw new Error('expected AddressInfo from listen()');
  }
  const port = (addr as AddressInfo).port;
  return {
    server,
    port,
    wsBase: `ws://127.0.0.1:${port}`,
    async close() {
      await server.close();
    }
  };
}

/** Convenience: claim an identity via HTTP and return its id. */
export async function claim(server: ZifmiaServer, handle: string): Promise<string> {
  const res = await server.app.inject({
    method: 'POST',
    url: '/api/identities',
    payload: { handle }
  });
  if (res.statusCode !== 201) {
    throw new Error(`claim ${handle} failed: ${res.statusCode} ${res.body}`);
  }
  return (res.json() as { id: string }).id;
}

/** Convenience: create a room and return its id + join_code. */
export async function createRoom(
  server: ZifmiaServer,
  handle: string,
  story_slug: string,
  title: string
): Promise<{ id: string; join_code: string }> {
  const res = await server.app.inject({
    method: 'POST',
    url: '/api/rooms',
    payload: { handle, story_slug, title }
  });
  if (res.statusCode !== 201) {
    throw new Error(`createRoom failed: ${res.statusCode} ${res.body}`);
  }
  return (res.json() as { room: { id: string; join_code: string } }).room;
}

/** Convenience: join a room as participant. */
export async function joinRoom(server: ZifmiaServer, handle: string, roomId: string): Promise<string> {
  const res = await server.app.inject({
    method: 'POST',
    url: `/api/rooms/${roomId}/join`,
    payload: { handle }
  });
  if (res.statusCode !== 200) {
    throw new Error(`joinRoom failed: ${res.statusCode} ${res.body}`);
  }
  return (res.json() as { participant: { id: string } }).participant.id;
}

/** Awaitable WS client wrapper. */
export interface TestSocket {
  ws: WebSocket;
  /** Resolves to the next inbound frame parsed as JSON. */
  recv(): Promise<ServerFrame>;
  /** Resolves to the next inbound frame matching the predicate (drains other frames into the queue tail). */
  recvWhere(predicate: (f: ServerFrame) => boolean, timeoutMs?: number): Promise<ServerFrame>;
  /** Resolves to the next close event { code, reason }. */
  awaitClose(): Promise<{ code: number; reason: string }>;
  send(frame: ClientFrame | object): void;
  /** Snapshot the queue without consuming. */
  drained(): ServerFrame[];
  close(code?: number): void;
}

export function openSocket(wsBase: string, roomId: string): Promise<TestSocket> {
  const ws = new WebSocket(`${wsBase}/ws/rooms/${roomId}`);
  const queue: ServerFrame[] = [];
  // recv() waiters: take the next frame regardless of shape.
  const fifoWaiters: Array<(f: ServerFrame) => void> = [];
  // recvWhere() waiters: take the next frame matching a predicate.
  // Single global message listener owns the dispatch — no per-call
  // listeners (avoids duplicate-queue bugs from concurrent listeners).
  const predicateWaiters: Array<{ predicate: (f: ServerFrame) => boolean; resolve: (f: ServerFrame) => void; }> = [];
  let closed: { code: number; reason: string } | null = null;
  const closeWaiters: Array<(c: { code: number; reason: string }) => void> = [];

  ws.on('message', (data) => {
    let parsed: ServerFrame;
    try {
      parsed = JSON.parse(data.toString('utf8')) as ServerFrame;
    } catch {
      return;
    }
    // Predicate waiters get first crack (they're more specific).
    for (let i = 0; i < predicateWaiters.length; i += 1) {
      if (predicateWaiters[i].predicate(parsed)) {
        const [w] = predicateWaiters.splice(i, 1);
        w.resolve(parsed);
        return;
      }
    }
    // FIFO waiters next.
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

  const ready = new Promise<TestSocket>((resolve, reject) => {
    ws.once('open', () => resolve(socket));
    ws.once('error', reject);
  });

  const socket: TestSocket = {
    ws,
    recv() {
      return new Promise((resolve, reject) => {
        if (queue.length > 0) return resolve(queue.shift()!);
        const t = setTimeout(() => {
          const idx = fifoWaiters.indexOf(handler);
          if (idx >= 0) fifoWaiters.splice(idx, 1);
          reject(new Error('recv timed out'));
        }, 2000);
        const handler = (f: ServerFrame) => {
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
          const idx = predicateWaiters.findIndex((w) => w.resolve === wrappedResolve);
          if (idx >= 0) predicateWaiters.splice(idx, 1);
          reject(new Error('recvWhere timed out'));
        }, timeoutMs);
        const wrappedResolve = (f: ServerFrame) => {
          clearTimeout(t);
          resolve(f);
        };
        predicateWaiters.push({ predicate, resolve: wrappedResolve });
      });
    },
    awaitClose() {
      return new Promise((resolve) => {
        if (closed) return resolve(closed);
        closeWaiters.push(resolve);
      });
    },
    send(frame) {
      ws.send(JSON.stringify(frame));
    },
    drained() {
      return queue.slice();
    },
    close(code) {
      ws.close(code);
    }
  };

  return ready;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
