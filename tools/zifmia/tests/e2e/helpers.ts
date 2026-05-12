/**
 * @module tests/e2e/helpers
 * @purpose Shared Playwright helpers — register users, create rooms,
 *   open pages with a pre-seeded session, and grab live WebSocket
 *   instances out of the page for the reconnect test.
 * @owner Zifmia E2E tests.
 */

import type { Page } from '@playwright/test';

import { tinyFixtureConfig } from '../fixtures/build-bundle';

export const FIXTURE_STORY_ID = tinyFixtureConfig.id;
export const FIXTURE_VERSION = tinyFixtureConfig.version;

export interface SessionInfo {
  id: string;
  handle: string;
  sessionToken: string;
}

let uniqueCounter = 0;

/**
 * Generate a handle unique to this test run. Tests share the
 * webServer instance, so identity rows accumulate across specs;
 * unique handles prevent the `handle_taken` 409.
 */
export function uniqueHandle(prefix: string): string {
  uniqueCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uniqueCounter}`;
}

export async function registerUser(
  baseUrl: string,
  handle: string
): Promise<SessionInfo> {
  const res = await fetch(`${baseUrl}/identity/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      handle,
      // Min 8 chars; arbitrary fixed value is fine — tests don't
      // re-login as the same identity.
      passcode: 'e2e-passcode-2026'
    })
  });
  if (!res.ok) {
    throw new Error(
      `registerUser ${handle}: ${res.status} ${await res.text()}`
    );
  }
  return (await res.json()) as SessionInfo;
}

export async function createRoom(
  baseUrl: string,
  session: SessionInfo,
  title: string
): Promise<string> {
  const res = await fetch(`${baseUrl}/rooms`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.sessionToken}`
    },
    body: JSON.stringify({
      storyId: FIXTURE_STORY_ID,
      title,
      public: true
    })
  });
  if (!res.ok) {
    throw new Error(`createRoom: ${res.status} ${await res.text()}`);
  }
  const room = (await res.json()) as { id: string };
  return room.id;
}

/**
 * Pre-seed a Playwright page with a session and instrument the
 * runtime so the test can address the live WebSocket. Must be called
 * BEFORE the first navigation: it uses `addInitScript`, which runs
 * before any page script.
 *
 * Instrumentation:
 *   - `localStorage['zifmia:session']` seeded so the bootstrap path
 *     skips the login form and goes straight to the lobby/room
 *   - `window.WebSocket` wrapped so every constructed instance is
 *     pushed onto `window.__zifmiaWsInstances` — the reconnect test
 *     uses this to forcibly close Alice's socket
 */
export async function seedSessionAndInstrument(
  page: Page,
  session: SessionInfo
): Promise<void> {
  await page.addInitScript(
    ({ persisted }: { persisted: string }) => {
      // localStorage is per-origin; addInitScript runs before any
      // script has loaded, so this lands before main.ts reads it.
      window.localStorage.setItem('zifmia:session', persisted);

      // Wrap WebSocket so tests can close it from the outside.
      interface InstrumentedWindow extends Window {
        __zifmiaWsInstances?: WebSocket[];
      }
      const w = window as unknown as InstrumentedWindow;
      w.__zifmiaWsInstances = [];
      const Original = window.WebSocket;
      const Wrapped = function (
        this: unknown,
        url: string | URL,
        protocols?: string | string[]
      ) {
        const instance = new Original(url, protocols);
        w.__zifmiaWsInstances!.push(instance);
        return instance;
      } as unknown as typeof WebSocket;
      Wrapped.prototype = Original.prototype;
      // Mirror the static constants Playwright sometimes reads back.
      (Wrapped as unknown as { CONNECTING: number }).CONNECTING =
        Original.CONNECTING;
      (Wrapped as unknown as { OPEN: number }).OPEN = Original.OPEN;
      (Wrapped as unknown as { CLOSING: number }).CLOSING = Original.CLOSING;
      (Wrapped as unknown as { CLOSED: number }).CLOSED = Original.CLOSED;
      window.WebSocket = Wrapped;
    },
    {
      persisted: JSON.stringify({
        id: session.id,
        handle: session.handle,
        sessionToken: session.sessionToken
      })
    }
  );
}

/**
 * Navigate `page` to the room hash for `roomId`. The session must
 * already be seeded via {@link seedSessionAndInstrument}.
 */
export async function openRoom(
  page: Page,
  baseUrl: string,
  roomId: string
): Promise<void> {
  await page.goto(`${baseUrl}/#room/${roomId}`);
  // Wait for the room layout to mount — the RoomManager appends the
  // section synchronously after the GET /rooms/:id/state resolves.
  await page.locator('section[data-role="room-view"]').waitFor();
}

/**
 * Close the most recently constructed WebSocket on `page`. Returns
 * `true` if a socket was found and closed; `false` if no socket was
 * tracked. Used by the AC-3 reconnect test to simulate a drop.
 */
export async function closeLatestWebSocket(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    interface InstrumentedWindow extends Window {
      __zifmiaWsInstances?: WebSocket[];
    }
    const w = window as unknown as InstrumentedWindow;
    const list = w.__zifmiaWsInstances;
    if (!list || list.length === 0) return false;
    const ws = list[list.length - 1];
    ws.close();
    return true;
  });
}
