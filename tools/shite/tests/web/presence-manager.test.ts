// @vitest-environment happy-dom
/**
 * @module tests/web/presence-manager.test
 * @purpose Behavior tests for `PresenceManager`. Asserts:
 *   - DOM contract: `.sharpee-presence-list` mounted; one
 *     `.sharpee-presence-item` per identity
 *   - `--self` applied only to the row matching `selfIdentityId`
 *   - `--admin` applied only to rows flagged `isAdmin: true`
 *   - `applyRoster` replaces the list
 *   - `onJoin` appends; idempotent on duplicate identityId
 *   - `onLeave` removes; idempotent on unknown id
 *   - WS subscriptions detach on `unmount`
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PresenceManager } from '../../web/src/managers/presence-manager';
import type {
  PresenceJoinedFrame,
  PresenceLeftFrame,
  PresenceRosterFrame,
  WsClient
} from '../../web/src/ws-client';

interface FakeWs {
  on: ReturnType<typeof vi.fn>;
  fire(frame: PresenceJoinedFrame | PresenceLeftFrame | PresenceRosterFrame): void;
  handlers: Map<string, Array<(frame: unknown) => void>>;
}

function makeFakeWs(): FakeWs {
  const handlers = new Map<string, Array<(frame: unknown) => void>>();
  return {
    handlers,
    on: vi.fn((kind: string, handler: (frame: unknown) => void) => {
      const list = handlers.get(kind) ?? [];
      list.push(handler);
      handlers.set(kind, list);
      return () => {
        const i = list.indexOf(handler);
        if (i >= 0) list.splice(i, 1);
      };
    }),
    fire(frame): void {
      for (const h of handlers.get(frame.type) ?? []) h(frame);
    }
  };
}

interface Harness {
  root: HTMLElement;
  ws: FakeWs;
  manager: PresenceManager;
}

function makeHarness(selfId = 'self-id'): Harness {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const ws = makeFakeWs();
  const manager = new PresenceManager({
    root,
    ws: ws as unknown as WsClient,
    selfIdentityId: selfId
  });
  return { root, ws, manager };
}

function rosterFrame(
  participants: Array<{ identityId: string; handle: string; isAdmin: boolean }>
): PresenceRosterFrame {
  return { type: 'presence:roster', roomId: 'r-1', participants };
}

function joinFrame(
  identityId: string,
  handle: string,
  isAdmin = false
): PresenceJoinedFrame {
  return {
    type: 'presence:joined',
    roomId: 'r-1',
    identityId,
    handle,
    isAdmin
  };
}

function leaveFrame(identityId: string, handle = 'x'): PresenceLeftFrame {
  return { type: 'presence:left', roomId: 'r-1', identityId, handle };
}

describe('PresenceManager.mount', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts a .sharpee-presence-list inside the root', () => {
    const h = makeHarness();
    h.manager.mount();
    expect(h.root.querySelector('ul.sharpee-presence-list')).not.toBeNull();
  });

  it('mount is idempotent', () => {
    const h = makeHarness();
    h.manager.mount();
    h.manager.mount();
    expect(h.root.querySelectorAll('ul.sharpee-presence-list')).toHaveLength(1);
  });

  it('subscribes to presence:roster / joined / left on the WS', () => {
    const h = makeHarness();
    h.manager.mount();
    const kinds = h.ws.on.mock.calls.map((c) => c[0]);
    expect(kinds).toContain('presence:roster');
    expect(kinds).toContain('presence:joined');
    expect(kinds).toContain('presence:left');
  });
});

describe('PresenceManager — roster rendering', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness('self-id');
    h.manager.mount();
  });

  it('renders one .sharpee-presence-item per participant in roster', () => {
    h.ws.fire(
      rosterFrame([
        { identityId: 'self-id', handle: 'me', isAdmin: false },
        { identityId: 'b', handle: 'bob', isAdmin: false }
      ])
    );
    const items = h.root.querySelectorAll('.sharpee-presence-item');
    expect(items).toHaveLength(2);
  });

  it('applies --self only to the row matching selfIdentityId', () => {
    h.ws.fire(
      rosterFrame([
        { identityId: 'self-id', handle: 'me', isAdmin: false },
        { identityId: 'b', handle: 'bob', isAdmin: false }
      ])
    );
    const items = Array.from(
      h.root.querySelectorAll<HTMLElement>('.sharpee-presence-item')
    );
    expect(items[0].classList.contains('sharpee-presence-item--self')).toBe(true);
    expect(items[1].classList.contains('sharpee-presence-item--self')).toBe(false);
  });

  it('applies --admin only to rows with isAdmin=true', () => {
    h.ws.fire(
      rosterFrame([
        { identityId: 'a', handle: 'alice', isAdmin: false },
        { identityId: 'b', handle: 'bob', isAdmin: true }
      ])
    );
    const items = Array.from(
      h.root.querySelectorAll<HTMLElement>('.sharpee-presence-item')
    );
    expect(items[0].classList.contains('sharpee-presence-item--admin')).toBe(false);
    expect(items[1].classList.contains('sharpee-presence-item--admin')).toBe(true);
  });

  it('a subsequent roster replaces the list (no dupes, stable ids)', () => {
    h.ws.fire(rosterFrame([{ identityId: 'a', handle: 'alice', isAdmin: false }]));
    h.ws.fire(
      rosterFrame([
        { identityId: 'a', handle: 'alice', isAdmin: false },
        { identityId: 'b', handle: 'bob', isAdmin: false }
      ])
    );
    const items = h.root.querySelectorAll('.sharpee-presence-item');
    expect(items).toHaveLength(2);
  });

  it('renders the handle text in the row', () => {
    h.ws.fire(rosterFrame([{ identityId: 'a', handle: 'alice', isAdmin: false }]));
    const item = h.root.querySelector('.sharpee-presence-item') as HTMLElement;
    expect(item.textContent).toContain('alice');
  });

  it('exposes the .sharpee-presence-avatar decoration slot', () => {
    h.ws.fire(rosterFrame([{ identityId: 'a', handle: 'alice', isAdmin: false }]));
    expect(h.root.querySelector('.sharpee-presence-avatar')).not.toBeNull();
  });
});

describe('PresenceManager — join / leave', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.manager.mount();
  });

  it('onJoin appends a new row', () => {
    h.ws.fire(joinFrame('a', 'alice'));
    const items = h.root.querySelectorAll('.sharpee-presence-item');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('alice');
  });

  it('onJoin is idempotent — second join for same identityId is a no-op', () => {
    h.ws.fire(joinFrame('a', 'alice'));
    h.ws.fire(joinFrame('a', 'alice'));
    expect(h.root.querySelectorAll('.sharpee-presence-item')).toHaveLength(1);
  });

  it('onLeave removes the matching row', () => {
    h.ws.fire(joinFrame('a', 'alice'));
    h.ws.fire(joinFrame('b', 'bob'));
    expect(h.root.querySelectorAll('.sharpee-presence-item')).toHaveLength(2);
    h.ws.fire(leaveFrame('a', 'alice'));
    const items = Array.from(
      h.root.querySelectorAll<HTMLElement>('.sharpee-presence-item')
    );
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('bob');
  });

  it('onLeave is idempotent — unknown identityId is a no-op', () => {
    h.ws.fire(joinFrame('a', 'alice'));
    h.ws.fire(leaveFrame('unknown'));
    expect(h.root.querySelectorAll('.sharpee-presence-item')).toHaveLength(1);
  });

  it('onJoin carries isAdmin → row gets --admin', () => {
    h.ws.fire(joinFrame('x', 'xena', true));
    const item = h.root.querySelector('.sharpee-presence-item') as HTMLElement;
    expect(item.classList.contains('sharpee-presence-item--admin')).toBe(true);
  });
});

describe('PresenceManager.unmount', () => {
  it('removes the list + detaches WS handlers', () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.manager.mount();
    h.ws.fire(joinFrame('a', 'alice'));
    expect(h.root.querySelector('.sharpee-presence-list')).not.toBeNull();
    h.manager.unmount();
    expect(h.root.querySelector('.sharpee-presence-list')).toBeNull();
    // After unmount, further frames must NOT mutate DOM (no list to
    // append to). Firing should be a no-op.
    h.ws.fire(joinFrame('b', 'bob'));
    expect(h.root.querySelector('.sharpee-presence-list')).toBeNull();
  });
});
