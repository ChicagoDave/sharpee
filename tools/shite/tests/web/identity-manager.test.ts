// @vitest-environment happy-dom
/**
 * @module tests/web/identity-manager.test
 * @purpose Behavior tests for `IdentityManager`. Asserts DOM contract
 *   (ADR-176 `.sharpee-identity-form` mounted into the root); mode
 *   toggle; submit round trip with stubbed register/login; persistence
 *   to SessionStore on success; error rendering on failure; no
 *   persistence/callback on failure or empty fields.
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiResult } from '../../web/src/api/types';
import type { SessionResponse } from '../../web/src/api/types';
import { IdentityManager } from '../../web/src/managers/identity-manager';
import {
  SessionStore,
  type PersistedSession,
  type StorageBackend
} from '../../web/src/session-store';

class MemoryBackend implements StorageBackend {
  private readonly map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

interface Harness {
  root: HTMLElement;
  store: SessionStore;
  onAuthenticated: ReturnType<typeof vi.fn<[PersistedSession], void>>;
  register: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
  manager: IdentityManager;
}

function ok(value: SessionResponse): ApiResult<SessionResponse> {
  return { ok: true, value };
}

function err(
  status: number,
  error: string,
  detail?: string
): ApiResult<SessionResponse> {
  return { ok: false, status, error, detail };
}

function makeHarness(): Harness {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const store = new SessionStore(new MemoryBackend());
  const onAuthenticated = vi.fn<[PersistedSession], void>();
  const register = vi.fn();
  const login = vi.fn();
  const manager = new IdentityManager({
    root,
    sessionStore: store,
    onAuthenticated,
    api: { register, login }
  });
  return { root, store, onAuthenticated, register, login, manager };
}

function submitForm(form: HTMLFormElement): void {
  // happy-dom's HTMLFormElement.requestSubmit() dispatches a submit
  // event; jsdom equivalents do the same. We dispatch directly so we
  // don't depend on the runtime's submit semantics.
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

function fillAndSubmit(
  root: HTMLElement,
  handle: string,
  passcode: string
): void {
  const form = root.querySelector('form.sharpee-identity-form');
  if (!form) throw new Error('form not mounted');
  (form.querySelector('[name=handle]') as HTMLInputElement).value = handle;
  (form.querySelector('[name=passcode]') as HTMLInputElement).value = passcode;
  submitForm(form as HTMLFormElement);
}

async function flush(): Promise<void> {
  // Allow microtasks (await chain inside handleSubmit) to settle.
  await Promise.resolve();
  await Promise.resolve();
}

describe('IdentityManager.mount', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
  });

  it('appends a .sharpee-identity-form to the root with handle, passcode, submit, toggle', () => {
    h.manager.mount();
    const form = h.root.querySelector('form.sharpee-identity-form');
    expect(form).not.toBeNull();
    expect(form!.querySelector('[name=handle]')).not.toBeNull();
    expect(form!.querySelector('[name=passcode]')).not.toBeNull();
    expect(form!.querySelector('[data-role=submit]')).not.toBeNull();
    expect(form!.querySelector('[data-role=mode-toggle]')).not.toBeNull();
  });

  it('starts in login mode (submit text: Sign in)', () => {
    h.manager.mount();
    expect(
      (h.root.querySelector('[data-role=submit]') as HTMLButtonElement)
        .textContent
    ).toBe('Sign in');
  });

  it('toggle button flips mode to register and updates labels', () => {
    h.manager.mount();
    const toggle = h.root.querySelector(
      '[data-role=mode-toggle]'
    ) as HTMLButtonElement;
    toggle.click();
    expect(
      (h.root.querySelector('[data-role=submit]') as HTMLButtonElement)
        .textContent
    ).toBe('Register');
  });

  it('mount is idempotent (re-calling does not duplicate the form)', () => {
    h.manager.mount();
    h.manager.mount();
    expect(h.root.querySelectorAll('form.sharpee-identity-form')).toHaveLength(
      1
    );
  });
});

describe('IdentityManager submit — login mode', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.manager.mount();
  });

  it('calls api.login with the form values', async () => {
    h.login.mockResolvedValue(
      ok({ id: 'id-1', handle: 'alice', sessionToken: 'token-1' })
    );
    fillAndSubmit(h.root, 'alice', 'long-enough-passcode');
    await flush();
    expect(h.login).toHaveBeenCalledWith(
      { handle: 'alice', passcode: 'long-enough-passcode' },
      undefined
    );
  });

  it('persists session and fires onAuthenticated on success', async () => {
    h.login.mockResolvedValue(
      ok({ id: 'id-1', handle: 'alice', sessionToken: 'token-1' })
    );
    fillAndSubmit(h.root, 'alice', 'long-enough-passcode');
    await flush();
    expect(h.store.load()).toEqual({
      id: 'id-1',
      handle: 'alice',
      sessionToken: 'token-1'
    });
    expect(h.onAuthenticated).toHaveBeenCalledWith({
      id: 'id-1',
      handle: 'alice',
      sessionToken: 'token-1'
    });
  });

  it('renders error on 401 invalid_credentials; does NOT persist or callback', async () => {
    h.login.mockResolvedValue(err(401, 'invalid_credentials'));
    fillAndSubmit(h.root, 'alice', 'wrong-passcode-here');
    await flush();
    const error = h.root.querySelector(
      '[data-role=error]'
    ) as HTMLElement;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe('Invalid handle or passcode.');
    expect(h.store.load()).toBeNull();
    expect(h.onAuthenticated).not.toHaveBeenCalled();
  });

  it('blocks empty submission without a network call', async () => {
    fillAndSubmit(h.root, '', '');
    await flush();
    expect(h.login).not.toHaveBeenCalled();
    const error = h.root.querySelector(
      '[data-role=error]'
    ) as HTMLElement;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe('Enter a handle and a passcode.');
  });
});

describe('IdentityManager submit — register mode', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.manager.mount();
    // Flip to register.
    const toggle = h.root.querySelector(
      '[data-role=mode-toggle]'
    ) as HTMLButtonElement;
    toggle.click();
  });

  it('calls api.register on submit (not api.login)', async () => {
    h.register.mockResolvedValue(
      ok({ id: 'id-2', handle: 'bob', sessionToken: 'token-2' })
    );
    fillAndSubmit(h.root, 'bob', 'long-enough-passcode');
    await flush();
    expect(h.register).toHaveBeenCalledWith(
      { handle: 'bob', passcode: 'long-enough-passcode' },
      undefined
    );
    expect(h.login).not.toHaveBeenCalled();
  });

  it('renders handle_taken on 409; does NOT persist', async () => {
    h.register.mockResolvedValue(err(409, 'handle_taken'));
    fillAndSubmit(h.root, 'bob', 'long-enough-passcode');
    await flush();
    const error = h.root.querySelector(
      '[data-role=error]'
    ) as HTMLElement;
    expect(error.textContent).toBe('That handle is taken.');
    expect(h.store.load()).toBeNull();
    expect(h.onAuthenticated).not.toHaveBeenCalled();
  });

  it('renders invalid_body detail when validation fails', async () => {
    h.register.mockResolvedValue(err(400, 'invalid_body'));
    fillAndSubmit(h.root, 'bob', 'long-enough-passcode');
    await flush();
    const error = h.root.querySelector(
      '[data-role=error]'
    ) as HTMLElement;
    expect(error.textContent).toBe('Handle or passcode is invalid.');
  });
});

describe('IdentityManager.unmount', () => {
  it('removes the form from the DOM', () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.manager.mount();
    expect(h.root.querySelector('form.sharpee-identity-form')).not.toBeNull();
    h.manager.unmount();
    expect(h.root.querySelector('form.sharpee-identity-form')).toBeNull();
  });

  it('unmount before mount is a no-op', () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    expect(() => h.manager.unmount()).not.toThrow();
  });
});

describe('ADR-176 contract — every rendered class is in the vocabulary', () => {
  // The 36 classes from ADR-170 + ADR-176. The test asserts the
  // IdentityManager DOM uses only contract classes (plus form-internal
  // decoration slots prefixed with sharpee-identity-form-).
  const VOCAB = new Set([
    // ADR-170 (22)
    'sharpee-window',
    'sharpee-window-title',
    'sharpee-window-title-bar',
    'sharpee-window-title-bar-controls',
    'sharpee-menu-bar',
    'sharpee-menu-bar-item',
    'sharpee-menu-bar-trigger',
    'sharpee-menu-dropdown',
    'sharpee-menu-option',
    'sharpee-menu-separator',
    'sharpee-menu-submenu-indicator',
    'sharpee-status-bar',
    'sharpee-prose-pane',
    'sharpee-prose-overlay',
    'sharpee-input-bar',
    'sharpee-input-prompt',
    'sharpee-input-field',
    'sharpee-dialog',
    'sharpee-dialog-title',
    'sharpee-dialog-body',
    'sharpee-dialog-buttons',
    'sharpee-dialog-button',
    // ADR-176 (14)
    'sharpee-presence-panel',
    'sharpee-presence-list',
    'sharpee-presence-item',
    'sharpee-presence-avatar',
    'sharpee-chat-panel',
    'sharpee-chat-history',
    'sharpee-chat-message',
    'sharpee-chat-message-author',
    'sharpee-chat-message-text',
    'sharpee-chat-input',
    'sharpee-lock-banner',
    'sharpee-lobby',
    'sharpee-lobby-list',
    'sharpee-lobby-item',
    'sharpee-saves-panel',
    'sharpee-saves-list',
    'sharpee-saves-item',
    'sharpee-identity-form'
  ]);

  it('IdentityManager only uses contract classes', () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.manager.mount();
    const all = h.root.querySelectorAll<HTMLElement>('[class]');
    const offenders: string[] = [];
    for (const el of all) {
      for (const cls of el.classList) {
        if (!cls.startsWith('sharpee-')) continue;
        // Internal decoration slots prefixed with sharpee-identity-form-
        // (e.g., -title, -field, -error) are not contract classes but
        // are within the IdentityManager's owned namespace. They're
        // exempt — themes target the parent.
        if (cls.startsWith('sharpee-identity-form-')) continue;
        if (cls.endsWith('--hidden') || cls.endsWith('--locked')) continue;
        if (!VOCAB.has(cls)) {
          offenders.push(cls);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
