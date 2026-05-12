// @vitest-environment happy-dom
/**
 * @module tests/web/admin-identities-manager.test
 * @purpose Behavior tests for `AdminIdentitiesManager`. The
 *   security-critical assertion: the plaintext passcode appears
 *   EXACTLY ONCE — in the dialog after reset, and is removed from
 *   the DOM when the dialog closes (it doesn't linger in
 *   `document.body.innerHTML`).
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminIdentitiesManager } from '../../web/src/managers/admin-identities-manager';
import type {
  AdminIdentitiesResponse,
  AdminIdentitySummary,
  ApiResult,
  PasscodeResetResponse
} from '../../web/src/api/types';

function ok<T>(value: T): ApiResult<T> {
  return { ok: true, value };
}
function err<T>(status: number, error: string): ApiResult<T> {
  return { ok: false, status, error };
}

function ident(overrides: Partial<AdminIdentitySummary> = {}): AdminIdentitySummary {
  return {
    id: 'id-1',
    handle: 'alice',
    isAdmin: false,
    createdAt: 0,
    ...overrides
  };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

interface Harness {
  root: HTMLElement;
  lookupAdminIdentities: ReturnType<typeof vi.fn>;
  resetAdminPasscode: ReturnType<typeof vi.fn>;
  writeClipboard: ReturnType<typeof vi.fn>;
  manager: AdminIdentitiesManager;
}

function makeHarness(): Harness {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const lookupAdminIdentities = vi.fn();
  const resetAdminPasscode = vi.fn();
  const writeClipboard = vi.fn(async () => {});
  const manager = new AdminIdentitiesManager({
    root,
    httpOptions: { sessionToken: 't' },
    api: { lookupAdminIdentities, resetAdminPasscode },
    writeClipboard
  });
  return { root, lookupAdminIdentities, resetAdminPasscode, writeClipboard, manager };
}

function submitForm(form: HTMLFormElement, handle: string): void {
  (form.querySelector('input[name=handle]') as HTMLInputElement).value = handle;
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

describe('AdminIdentitiesManager — lookup', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('found handle renders the identity card with Reset button', async () => {
    const h = makeHarness();
    h.manager.mount();
    h.lookupAdminIdentities.mockResolvedValueOnce(
      ok<AdminIdentitiesResponse>({ identities: [ident()] })
    );
    submitForm(
      h.root.querySelector('form') as HTMLFormElement,
      'alice'
    );
    await flush();
    expect(h.root.querySelector('[data-role="admin-identities-card"]')).not.toBeNull();
    expect(h.root.querySelector('[data-action="reset-passcode"]')).not.toBeNull();
  });

  it('unknown handle renders empty-state', async () => {
    const h = makeHarness();
    h.manager.mount();
    h.lookupAdminIdentities.mockResolvedValueOnce(
      ok<AdminIdentitiesResponse>({ identities: [] })
    );
    submitForm(h.root.querySelector('form') as HTMLFormElement, 'nobody');
    await flush();
    expect(
      h.root.querySelector('[data-role="admin-identities-empty"]')
    ).not.toBeNull();
  });

  it('empty handle no-ops + surfaces inline', async () => {
    const h = makeHarness();
    h.manager.mount();
    submitForm(h.root.querySelector('form') as HTMLFormElement, '   ');
    await flush();
    expect(h.lookupAdminIdentities).not.toHaveBeenCalled();
    const errEl = h.root.querySelector(
      '[data-role="admin-identities-error"]'
    ) as HTMLElement;
    expect(errEl.hidden).toBe(false);
  });
});

describe('AdminIdentitiesManager — passcode reset (plaintext-once)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  async function setupCardAndReset(
    h: Harness,
    passcode: string
  ): Promise<void> {
    h.manager.mount();
    h.lookupAdminIdentities.mockResolvedValueOnce(
      ok<AdminIdentitiesResponse>({ identities: [ident()] })
    );
    submitForm(h.root.querySelector('form') as HTMLFormElement, 'alice');
    await flush();
    h.resetAdminPasscode.mockResolvedValueOnce(
      ok<PasscodeResetResponse>({
        passcode,
        identityId: 'id-1',
        handle: 'alice'
      })
    );
    (
      h.root.querySelector('[data-action="reset-passcode"]') as HTMLButtonElement
    ).click();
    await flush();
  }

  it('renders plaintext exactly once — in the dialog after reset', async () => {
    const h = makeHarness();
    const passcode = 'Plaintext-Once-9X7K';
    await setupCardAndReset(h, passcode);
    const passcodeNode = h.root.querySelector(
      '[data-role="admin-reset-passcode"]'
    ) as HTMLElement;
    expect(passcodeNode.textContent).toBe(passcode);
    // The passcode appears in the document; count its substring
    // occurrences to verify it's not duplicated somewhere unexpected
    // (e.g., an audit log line, a hidden card field, localStorage).
    const html = document.body.innerHTML;
    const matches = html.match(
      new RegExp(passcode.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g')
    );
    expect(matches?.length).toBe(1);
  });

  it('plaintext is WIPED from the DOM when the dialog closes', async () => {
    const h = makeHarness();
    const passcode = 'Wipe-On-Close-3FQP';
    await setupCardAndReset(h, passcode);
    expect(document.body.innerHTML).toContain(passcode);
    (
      h.root.querySelector(
        '[data-role="admin-reset-close"]'
      ) as HTMLButtonElement
    ).click();
    expect(document.body.innerHTML).not.toContain(passcode);
  });

  it('Copy button writes plaintext to the clipboard', async () => {
    const h = makeHarness();
    const passcode = 'Clip-2D5R';
    await setupCardAndReset(h, passcode);
    (
      h.root.querySelector('[data-role="admin-reset-copy"]') as HTMLButtonElement
    ).click();
    await flush();
    expect(h.writeClipboard).toHaveBeenCalledWith(passcode);
  });

  it('reset error surfaces inline; no dialog opens', async () => {
    const h = makeHarness();
    h.manager.mount();
    h.lookupAdminIdentities.mockResolvedValueOnce(
      ok<AdminIdentitiesResponse>({ identities: [ident()] })
    );
    submitForm(h.root.querySelector('form') as HTMLFormElement, 'alice');
    await flush();
    h.resetAdminPasscode.mockResolvedValueOnce(err(404, 'identity_not_found'));
    (
      h.root.querySelector('[data-action="reset-passcode"]') as HTMLButtonElement
    ).click();
    await flush();
    const errEl = h.root.querySelector(
      '[data-role="admin-identities-error"]'
    ) as HTMLElement;
    expect(errEl.hidden).toBe(false);
    // Dialog stays closed (no `open` attribute).
    const dialog = h.root.querySelector(
      '[data-role="admin-identities-dialog"]'
    ) as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('unmount wipes the passcode text even if dialog was open', async () => {
    const h = makeHarness();
    const passcode = 'Unmount-Wipe-5HZQ';
    await setupCardAndReset(h, passcode);
    expect(document.body.innerHTML).toContain(passcode);
    h.manager.unmount();
    // The whole subtree is gone; passcode is no longer reachable.
    expect(document.body.innerHTML).not.toContain(passcode);
  });
});
