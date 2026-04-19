/**
 * Test helper: a small promise-oriented wrapper around `ws` for integration tests.
 *
 * Public interface: {@link openWsClient}, {@link TestWsClient}.
 */

import { WebSocket } from 'ws';
import type { ClientMsg, ServerMsg } from '../../src/wire/browser-server.js';

export interface TestWsClient {
  readonly ws: WebSocket;
  /** All messages received since the client opened. */
  readonly received: ServerMsg[];
  send(msg: ClientMsg): void;
  /** Resolve with the first message matching `predicate`, or reject after `timeoutMs`. */
  waitFor<T extends ServerMsg>(
    predicate: (m: ServerMsg) => m is T,
    timeoutMs?: number
  ): Promise<T>;
  /** Resolve once the socket enters CLOSED state. */
  waitForClose(timeoutMs?: number): Promise<{ code: number; reason: string }>;
  close(): void;
}

/** Open a WebSocket client to `url`; resolves once the socket is OPEN. */
export function openWsClient(url: string): Promise<TestWsClient> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const received: ServerMsg[] = [];
    let closeInfo: { code: number; reason: string } | null = null;
    const listeners: Array<(m: ServerMsg) => void> = [];
    const closeListeners: Array<(c: { code: number; reason: string }) => void> = [];

    ws.on('message', (data) => {
      let parsed: ServerMsg;
      try {
        parsed = JSON.parse(String(data)) as ServerMsg;
      } catch {
        return;
      }
      received.push(parsed);
      for (const l of listeners) l(parsed);
    });

    ws.on('close', (code: number, reasonBuf: Buffer) => {
      closeInfo = { code, reason: reasonBuf.toString() };
      for (const l of closeListeners) l(closeInfo);
    });

    ws.on('error', (err) => {
      if (ws.readyState !== WebSocket.OPEN) reject(err);
    });

    ws.on('open', () => {
      resolve({
        ws,
        received,
        send(msg) {
          ws.send(JSON.stringify(msg));
        },
        waitFor<T extends ServerMsg>(
          predicate: (m: ServerMsg) => m is T,
          timeoutMs = 2000
        ): Promise<T> {
          const already = received.find(predicate);
          if (already) return Promise.resolve(already);
          return new Promise<T>((res, rej) => {
            const t = setTimeout(() => {
              const idx = listeners.indexOf(listener);
              if (idx >= 0) listeners.splice(idx, 1);
              rej(new Error(`waitFor timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            const listener = (m: ServerMsg) => {
              if (predicate(m)) {
                clearTimeout(t);
                const idx = listeners.indexOf(listener);
                if (idx >= 0) listeners.splice(idx, 1);
                res(m);
              }
            };
            listeners.push(listener);
          });
        },
        waitForClose(timeoutMs = 2000) {
          if (closeInfo) return Promise.resolve(closeInfo);
          return new Promise((res, rej) => {
            const t = setTimeout(
              () => rej(new Error(`waitForClose timed out after ${timeoutMs}ms`)),
              timeoutMs
            );
            closeListeners.push((c) => {
              clearTimeout(t);
              res(c);
            });
          });
        },
        close() {
          try {
            ws.close();
          } catch {
            /* ignore */
          }
        },
      });
    });
  });
}
