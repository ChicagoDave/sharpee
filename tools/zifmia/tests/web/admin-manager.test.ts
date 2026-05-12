// @vitest-environment happy-dom
/**
 * @module tests/web/admin-manager.test
 * @purpose Behavior tests for `AdminManager` — the orchestrator that
 *   gates `#admin` on `getMe.isAdmin === true` and mounts the active
 *   tab. Asserts:
 *   - non-admin getMe → onAccessDenied + NO admin view in DOM
 *   - getMe network failure → onAccessDenied + no DOM
 *   - admin getMe → AdminView mounted with menu-bar tabs + default tab
 *   - tab click switches the active manager
 *   - unmount tears down view + active tab
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminManager } from '../../web/src/managers/admin-manager';
import type { ApiResult, IdentityMe } from '../../web/src/api/types';

function okMe(isAdmin: boolean): ApiResult<IdentityMe> {
  return { ok: true, value: { id: 'me', handle: 'me', isAdmin } };
}

interface Harness {
  root: HTMLElement;
  getMe: ReturnType<typeof vi.fn>;
  onAccessDenied: ReturnType<typeof vi.fn>;
  onLeave: ReturnType<typeof vi.fn>;
  manager: AdminManager;
}

function makeHarness(): Harness {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const getMe = vi.fn();
  const onAccessDenied = vi.fn();
  const onLeave = vi.fn();
  const manager = new AdminManager({
    root,
    httpOptions: { sessionToken: 't' },
    onAccessDenied,
    onLeave,
    deps: { getMe }
  });
  return { root, getMe, onAccessDenied, onLeave, manager };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('AdminManager — admin gate', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('redirects non-admin and does NOT mount the admin view', async () => {
    const h = makeHarness();
    h.getMe.mockResolvedValueOnce(okMe(false));
    await h.manager.enter();
    expect(h.onAccessDenied).toHaveBeenCalledTimes(1);
    expect(h.root.querySelector('[data-role="admin-view"]')).toBeNull();
  });

  it('redirects on getMe 401 / non-2xx', async () => {
    const h = makeHarness();
    h.getMe.mockResolvedValueOnce({ ok: false, status: 401, error: 'invalid_token' });
    await h.manager.enter();
    expect(h.onAccessDenied).toHaveBeenCalledTimes(1);
    expect(h.root.querySelector('[data-role="admin-view"]')).toBeNull();
  });

  it('redirects on getMe network throw', async () => {
    const h = makeHarness();
    h.getMe.mockRejectedValueOnce(new Error('offline'));
    await h.manager.enter();
    expect(h.onAccessDenied).toHaveBeenCalledTimes(1);
  });

  it('admin getMe → mounts AdminView with the menu bar', async () => {
    const h = makeHarness();
    h.getMe.mockResolvedValueOnce(okMe(true));
    await h.manager.enter();
    await flush();
    expect(h.root.querySelector('[data-role="admin-view"]')).not.toBeNull();
    expect(h.root.querySelector('.sharpee-menu-bar')).not.toBeNull();
    // All four tabs are rendered as menu-bar items.
    const tabs = h.root.querySelectorAll<HTMLElement>('[data-tab]');
    const tabIds = Array.from(tabs).map((t) => t.getAttribute('data-tab'));
    expect(tabIds).toEqual(['stories', 'rooms', 'identities', 'audit']);
    // The default active tab is the first one (stories).
    expect(
      h.root.querySelector('[data-tab="stories"]')?.classList.contains(
        'sharpee-menu-bar-item--open'
      )
    ).toBe(true);
  });
});

describe('AdminManager — tab switching', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('clicking a tab swaps the active sub-manager (DOM check)', async () => {
    const h = makeHarness();
    h.getMe.mockResolvedValue(okMe(true));
    // Stub global fetch so the sub-managers' API calls don't bomb the
    // jsdom URL resolver. Each returns an empty list.
    const stubFetch = vi.fn(async () =>
      new Response(JSON.stringify({ stories: [], entries: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = stubFetch as unknown as typeof fetch;
    try {
      await h.manager.enter();
      await flush();
      // Stories tab is default.
      expect(h.root.querySelector('[data-role="admin-stories"]')).not.toBeNull();
      // Click Audit tab.
      (h.root.querySelector('[data-tab="audit"]') as HTMLButtonElement).click();
      await flush();
      expect(h.root.querySelector('[data-role="admin-stories"]')).toBeNull();
      expect(h.root.querySelector('[data-role="admin-audit"]')).not.toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('AdminManager.unmount', () => {
  it('removes the admin view from the DOM', async () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.getMe.mockResolvedValue(okMe(true));
    const stubFetch = vi.fn(async () =>
      new Response(JSON.stringify({ stories: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = stubFetch as unknown as typeof fetch;
    try {
      await h.manager.enter();
      await flush();
      expect(h.root.querySelector('[data-role="admin-view"]')).not.toBeNull();
      h.manager.unmount();
      expect(h.root.querySelector('[data-role="admin-view"]')).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
