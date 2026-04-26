/**
 * ConnectionManager unit tests.
 *
 * Behavior Statement — createConnectionManager
 *   DOES:
 *     - register(room_id, participant_id, identity_id, ws) records all
 *       three indexes (byRoom, byParticipant, byIdentity) so the registry
 *       can answer "which sockets in room X", "which socket for participant
 *       Y", and "which sockets for identity Z".
 *     - re-registering a participant evicts the prior socket from every
 *       index — including the prior identity_id binding when it differs.
 *     - unregisterParticipant / unregisterSocket clean up all three
 *       indexes; an identity entry with no remaining participants is
 *       removed entirely.
 *     - closeIdentitySockets(identity_id, code, reason) calls ws.close on
 *       every live socket bound to that identity and returns the count.
 *     - closeIdentitySockets returns 0 when the identity has no live
 *       sockets — not an error.
 *   WHEN: register fires from hello.ts after a verified hello;
 *         closeIdentitySockets fires from the erase route after the
 *         identity row is hard-deleted.
 *   BECAUSE: the erase route (ADR-161) must terminate every WS session
 *            owned by the just-deleted identity with code 4007 so clients
 *            see a deterministic close cause.
 *   REJECTS WHEN: closeIdentitySockets on an unknown identity_id is a
 *                 no-op (returns 0).
 */

import { describe, expect, it } from 'vitest';
import { createConnectionManager } from '../../src/ws/connection-manager.js';

interface CloseCall {
  code: number;
  reason: string;
}

class FakeSocket {
  closed: CloseCall | null = null;
  sent: string[] = [];
  send(data: string): void {
    this.sent.push(data);
  }
  close(code: number, reason: string): void {
    this.closed = { code, reason };
  }
}

function makeSocket(): FakeSocket {
  return new FakeSocket();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asWs = (s: FakeSocket) => s as any;

describe('ConnectionManager — identity index', () => {
  it('register binds the participant to the identity', () => {
    const cm = createConnectionManager();
    const ws = makeSocket();
    cm.register('room-1', 'p-1', 'id-1', asWs(ws));

    // identity-keyed close finds the socket.
    expect(cm.closeIdentitySockets('id-1', 4007, 'identity_erased')).toBe(1);
    expect(ws.closed).toEqual({ code: 4007, reason: 'identity_erased' });
  });

  it('closeIdentitySockets closes every socket owned by the identity across rooms', () => {
    const cm = createConnectionManager();
    const wsA = makeSocket();
    const wsB = makeSocket();
    cm.register('room-A', 'p-A', 'id-shared', asWs(wsA));
    cm.register('room-B', 'p-B', 'id-shared', asWs(wsB));

    expect(cm.closeIdentitySockets('id-shared', 4007, 'identity_erased')).toBe(2);
    expect(wsA.closed).toEqual({ code: 4007, reason: 'identity_erased' });
    expect(wsB.closed).toEqual({ code: 4007, reason: 'identity_erased' });
  });

  it('closeIdentitySockets does not close sockets owned by a different identity', () => {
    const cm = createConnectionManager();
    const wsTarget = makeSocket();
    const wsBystander = makeSocket();
    cm.register('room-1', 'p-target', 'id-target', asWs(wsTarget));
    cm.register('room-1', 'p-bystander', 'id-bystander', asWs(wsBystander));

    expect(cm.closeIdentitySockets('id-target', 4007, 'identity_erased')).toBe(1);
    expect(wsTarget.closed).toEqual({ code: 4007, reason: 'identity_erased' });
    expect(wsBystander.closed).toBeNull();
  });

  it('closeIdentitySockets returns 0 for an identity with no live sockets', () => {
    const cm = createConnectionManager();
    expect(cm.closeIdentitySockets('id-unknown', 4007, 'identity_erased')).toBe(0);
  });

  it('unregisterParticipant detaches the participant from the identity index', () => {
    const cm = createConnectionManager();
    const ws = makeSocket();
    cm.register('room-1', 'p-1', 'id-1', asWs(ws));
    cm.unregisterParticipant('p-1');

    // identity entry was the participant's only binding — should be empty now.
    expect(cm.closeIdentitySockets('id-1', 4007, 'identity_erased')).toBe(0);
    expect(ws.closed).toBeNull();
  });

  it('unregisterSocket detaches the participant from the identity index', () => {
    const cm = createConnectionManager();
    const ws = makeSocket();
    cm.register('room-1', 'p-1', 'id-1', asWs(ws));
    cm.unregisterSocket(asWs(ws));

    expect(cm.closeIdentitySockets('id-1', 4007, 'identity_erased')).toBe(0);
  });

  it('unregister keeps other participants of the same identity reachable', () => {
    const cm = createConnectionManager();
    const wsA = makeSocket();
    const wsB = makeSocket();
    cm.register('room-A', 'p-A', 'id-shared', asWs(wsA));
    cm.register('room-B', 'p-B', 'id-shared', asWs(wsB));
    cm.unregisterParticipant('p-A');

    // Only B remains; closing should hit B exactly once.
    expect(cm.closeIdentitySockets('id-shared', 4007, 'identity_erased')).toBe(1);
    expect(wsA.closed).toBeNull();
    expect(wsB.closed).toEqual({ code: 4007, reason: 'identity_erased' });
  });

  it('re-registering a participant evicts the prior identity binding', () => {
    // Pathological: same participant_id re-registered with a different
    // identity_id. Should not happen in practice (participant_id is tied
    // to identity), but the registry must be self-consistent regardless.
    const cm = createConnectionManager();
    const wsOld = makeSocket();
    const wsNew = makeSocket();
    cm.register('room-1', 'p-1', 'id-old', asWs(wsOld));
    cm.register('room-1', 'p-1', 'id-new', asWs(wsNew));

    expect(cm.closeIdentitySockets('id-old', 4007, 'identity_erased')).toBe(0);
    expect(cm.closeIdentitySockets('id-new', 4007, 'identity_erased')).toBe(1);
    expect(wsNew.closed).toEqual({ code: 4007, reason: 'identity_erased' });
  });
});
