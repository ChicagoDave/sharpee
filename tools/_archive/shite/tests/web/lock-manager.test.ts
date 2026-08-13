// @vitest-environment happy-dom
/**
 * @module tests/web/lock-manager.test
 * @purpose Behavior tests for `LockManager` (Phase 6e, AC-10). Asserts:
 *   - holder === me → input-bar gains `--locked-by-me`; banner stays
 *     `--hidden`
 *   - holder !== me && holder !== null → input-bar gains `--locked`;
 *     banner unhides and reads `{handle} is typing…`
 *   - holder === null → both modifiers cleared; banner re-hidden
 *   - lock state arriving before the input bar mounts is a no-op
 *     (banner still toggles correctly)
 *   - acquire() / release() emit WS frames
 *   - unmount detaches handler + resets banner
 *   - cross-room frame (different roomId) is ignored
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LockManager } from '../../web/src/managers/lock-manager';
import type {
  LockStateFrame,
  OutboundFrame,
  WsClient
} from '../../web/src/ws-client';

interface FakeWs {
  sent: OutboundFrame[];
  on: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  fire(frame: LockStateFrame): void;
}

function makeFakeWs(): FakeWs {
  const sent: OutboundFrame[] = [];
  const handlers = new Map<string, Array<(frame: unknown) => void>>();
  return {
    sent,
    send: vi.fn((frame: OutboundFrame) => {
      sent.push(frame);
    }),
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
  banner: HTMLElement;
  inputBar: HTMLElement;
  ws: FakeWs;
  manager: LockManager;
}

function makeHarness(opts: { withInputBar?: boolean } = {}): Harness {
  const root = document.createElement('section');
  root.className = 'sharpee-window';
  document.body.appendChild(root);

  const banner = document.createElement('div');
  banner.className = 'sharpee-lock-banner sharpee-lock-banner--hidden';
  root.appendChild(banner);

  let inputBar = document.createElement('div');
  if (opts.withInputBar !== false) {
    inputBar.className = 'sharpee-input-bar';
    root.appendChild(inputBar);
  }

  const ws = makeFakeWs();
  const manager = new LockManager({
    root,
    lockBanner: banner,
    ws: ws as unknown as WsClient,
    roomId: 'r-1',
    selfIdentityId: 'self-id'
  });
  return { root, banner, inputBar, ws, manager };
}

function lockFrame(
  holder: { identityId: string; handle: string } | null,
  roomId = 'r-1'
): LockStateFrame {
  return { type: 'lock:state', roomId, holder };
}

describe('LockManager.mount', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('subscribes to lock:state on the WS', () => {
    const h = makeHarness();
    h.manager.mount();
    expect(h.ws.on).toHaveBeenCalledWith('lock:state', expect.any(Function));
  });

  it('mount is idempotent', () => {
    const h = makeHarness();
    h.manager.mount();
    h.manager.mount();
    expect(h.ws.on).toHaveBeenCalledTimes(1);
  });
});

describe('LockManager — onLockState', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.manager.mount();
  });

  it('holder === me → input-bar gets --locked-by-me; banner stays hidden', () => {
    h.ws.fire(lockFrame({ identityId: 'self-id', handle: 'me' }));
    expect(h.inputBar.classList.contains('sharpee-input-bar--locked-by-me')).toBe(true);
    expect(h.inputBar.classList.contains('sharpee-input-bar--locked')).toBe(false);
    expect(h.banner.classList.contains('sharpee-lock-banner--hidden')).toBe(true);
    expect(h.banner.textContent).toBe('');
  });

  it('holder = other → input-bar gets --locked; banner unhides with handle', () => {
    h.ws.fire(lockFrame({ identityId: 'bob', handle: 'bob' }));
    expect(h.inputBar.classList.contains('sharpee-input-bar--locked')).toBe(true);
    expect(h.inputBar.classList.contains('sharpee-input-bar--locked-by-me')).toBe(false);
    expect(h.banner.classList.contains('sharpee-lock-banner--hidden')).toBe(false);
    expect(h.banner.textContent).toContain('bob');
    expect(h.banner.textContent).toContain('typing');
  });

  it('holder = null → both modifiers cleared; banner re-hidden', () => {
    h.ws.fire(lockFrame({ identityId: 'bob', handle: 'bob' }));
    // Confirm pre-state: locked + banner visible.
    expect(h.inputBar.classList.contains('sharpee-input-bar--locked')).toBe(true);
    expect(h.banner.classList.contains('sharpee-lock-banner--hidden')).toBe(false);
    h.ws.fire(lockFrame(null));
    expect(h.inputBar.classList.contains('sharpee-input-bar--locked')).toBe(false);
    expect(h.inputBar.classList.contains('sharpee-input-bar--locked-by-me')).toBe(false);
    expect(h.banner.classList.contains('sharpee-lock-banner--hidden')).toBe(true);
    expect(h.banner.textContent).toBe('');
  });

  it('me → other → null transitions cleanly', () => {
    h.ws.fire(lockFrame({ identityId: 'self-id', handle: 'me' }));
    expect(h.inputBar.classList.contains('sharpee-input-bar--locked-by-me')).toBe(true);
    h.ws.fire(lockFrame({ identityId: 'bob', handle: 'bob' }));
    expect(h.inputBar.classList.contains('sharpee-input-bar--locked-by-me')).toBe(false);
    expect(h.inputBar.classList.contains('sharpee-input-bar--locked')).toBe(true);
    h.ws.fire(lockFrame(null));
    expect(h.inputBar.classList.contains('sharpee-input-bar--locked')).toBe(false);
  });

  it('ignores frames for a different roomId', () => {
    h.ws.fire(lockFrame({ identityId: 'bob', handle: 'bob' }, 'other-room'));
    expect(h.inputBar.classList.contains('sharpee-input-bar--locked')).toBe(false);
    expect(h.banner.classList.contains('sharpee-lock-banner--hidden')).toBe(true);
  });

  it('input-bar absent → no throw; banner still toggles', () => {
    document.body.innerHTML = '';
    const h2 = makeHarness({ withInputBar: false });
    h2.manager.mount();
    expect(() =>
      h2.ws.fire(lockFrame({ identityId: 'bob', handle: 'bob' }))
    ).not.toThrow();
    expect(h2.banner.classList.contains('sharpee-lock-banner--hidden')).toBe(false);
    expect(h2.banner.textContent).toContain('bob');
  });
});

describe('LockManager — acquire / release', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.manager.mount();
  });

  it('acquire() emits lock:acquire (verified on the WS sent queue)', () => {
    h.manager.acquire();
    expect(h.ws.send).toHaveBeenCalledWith({
      type: 'lock:acquire',
      roomId: 'r-1'
    });
    // Mutation-layer assertion — the accumulated frame array is the
    // wire-state mutation, not just the call count on the mock.
    expect(h.ws.sent).toContainEqual({
      type: 'lock:acquire',
      roomId: 'r-1'
    });
  });

  it('release() emits lock:release (verified on the WS sent queue)', () => {
    h.manager.release();
    expect(h.ws.send).toHaveBeenCalledWith({
      type: 'lock:release',
      roomId: 'r-1'
    });
    expect(h.ws.sent).toContainEqual({
      type: 'lock:release',
      roomId: 'r-1'
    });
  });
});

describe('LockManager.unmount', () => {
  it('detaches WS handler; further frames are no-ops; banner resets', () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.manager.mount();
    h.ws.fire(lockFrame({ identityId: 'bob', handle: 'bob' }));
    expect(h.banner.classList.contains('sharpee-lock-banner--hidden')).toBe(false);
    h.manager.unmount();
    expect(h.banner.classList.contains('sharpee-lock-banner--hidden')).toBe(true);
    expect(h.banner.textContent).toBe('');
    // Post-unmount frame must not mutate DOM.
    h.ws.fire(lockFrame({ identityId: 'eve', handle: 'eve' }));
    expect(h.banner.classList.contains('sharpee-lock-banner--hidden')).toBe(true);
  });
});
