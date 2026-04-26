/**
 * Erase-disconnect end-to-end test (ADR-161 Phase C).
 *
 * Behavior Statement — POST /api/identities/erase + ConnectionManager
 *   DOES: when an identity with a live WS connection is erased, the
 *         server closes that socket with code 4007 reason
 *         `identity_erased` before deleting the row. The client observes
 *         a clean close with the close code and reason.
 *   WHEN: the user (or another tab) erases their identity while a session
 *         is open.
 *   BECAUSE: an erased identity must not be able to keep acting in any
 *            room. Closing the socket terminates the per-connection
 *            authority deterministically; the client's onclose handler
 *            uses the 4007 code to drive UX (panel returns to first-visit
 *            state).
 *   REJECTS WHEN: covered by tests/http/erase-identity.test.ts.
 *
 * Integration Reality: this test uses a real `ws.WebSocket` against the
 * production hello → register → close path. No mock socket; no stub
 * ConnectionManager. The test that validates the route's call into
 * `closeIdentitySockets` is the HTTP-only test; this test validates that
 * the closing actually reaches the client.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildTestServer,
  createRoomViaHttp,
  type TestServerHandle,
} from '../helpers/test-server.js';
import { openWsClient } from '../helpers/ws-client.js';
import type { ServerMsg } from '../../src/wire/browser-server.js';

describe('Erase identity — live WS sessions terminate with 4007', () => {
  let server: TestServerHandle;

  beforeEach(async () => {
    server = await buildTestServer({ stories: ['zork'] });
  });
  afterEach(async () => {
    await server.close();
  });

  it('connected client receives close(4007 identity_erased) when its identity is erased', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork' });

    const client = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      client.send({ kind: 'hello', handle: host.handle, passcode: host.passcode });
      // Wait for welcome so we know the socket is registered with the
      // ConnectionManager (register() is called before welcome is sent).
      await client.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );

      const eraseRes = await fetch(`${server.httpUrl}/api/identities/erase`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handle: host.handle, passcode: host.passcode }),
      });
      expect(eraseRes.status).toBe(200);

      const closeInfo = await client.waitForClose(2000);
      expect(closeInfo.code).toBe(4007);
      expect(closeInfo.reason).toBe('identity_erased');
    } finally {
      client.close();
    }

    // Identity row gone; Handle is reclaimable.
    expect(server.identities.findByHandle(host.handle)).toBeNull();
  });

  it('erase only closes sockets bound to the erased identity, not others in the same room', async () => {
    const host = await createRoomViaHttp(server, { story_slug: 'zork' });
    const guestIdentity = (await fetch(`${server.httpUrl}/api/identities`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'Guest' }),
    }).then((r) => r.json())) as { id: string; handle: string; passcode: string };

    // Guest joins via HTTP, then connects WS.
    const join = await fetch(`${server.httpUrl}/api/rooms/${host.room_id}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        handle: guestIdentity.handle,
        passcode: guestIdentity.passcode,
        captcha_token: 'stub',
      }),
    });
    expect(join.status).toBe(200);

    const hostClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    const guestClient = await openWsClient(`${server.wsUrl}/ws/${host.room_id}`);
    try {
      hostClient.send({ kind: 'hello', handle: host.handle, passcode: host.passcode });
      await hostClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );
      guestClient.send({
        kind: 'hello',
        handle: guestIdentity.handle,
        passcode: guestIdentity.passcode,
      });
      await guestClient.waitFor(
        (m): m is Extract<ServerMsg, { kind: 'welcome' }> => m.kind === 'welcome',
      );

      // Erase the host's identity. Only the host's socket should close.
      const eraseRes = await fetch(`${server.httpUrl}/api/identities/erase`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handle: host.handle, passcode: host.passcode }),
      });
      expect(eraseRes.status).toBe(200);

      const hostClose = await hostClient.waitForClose(2000);
      expect(hostClose.code).toBe(4007);
      expect(hostClose.reason).toBe('identity_erased');

      // Guest socket is still open: assert non-close by giving the loop a
      // moment to deliver any stray frames, then check the readyState.
      await new Promise((resolve) => setTimeout(resolve, 100));
      // ws constants: OPEN === 1
      expect(guestClient.ws.readyState).toBe(1);
    } finally {
      hostClient.close();
      guestClient.close();
    }
  });
});
