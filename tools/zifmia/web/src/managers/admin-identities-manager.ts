/**
 * @module zifmia/web/managers/admin-identities-manager
 * @purpose Admin Identities tab: handle lookup + passcode reset.
 *   The admin types a handle, server returns the matching identity
 *   (or none), and a Reset button POSTs to the reset endpoint. The
 *   plaintext passcode appears EXACTLY ONCE in a `<dialog>` with a
 *   copy button. When the dialog closes, the plaintext is overwritten
 *   in the DOM so a later `document.body.innerHTML` dump does not
 *   reveal it.
 * @owner Zifmia web client.
 *
 * Security note: the plaintext lives in:
 *   1. The HTTP response body (one-shot — released after read)
 *   2. The dialog text content (cleared on close)
 *   3. The clipboard if the admin clicks Copy (out of our control)
 * It never lands in localStorage, sessionStorage, or any other
 * persistent surface.
 */

import { lookupAdminIdentities, resetAdminPasscode } from '../api/admin';
import type { HttpClientOptions } from '../api/http';
import type { AdminIdentitySummary } from '../api/types';

export interface AdminIdentitiesManagerOptions {
  root: HTMLElement;
  httpOptions: HttpClientOptions;
  api?: {
    lookupAdminIdentities: typeof lookupAdminIdentities;
    resetAdminPasscode: typeof resetAdminPasscode;
  };
  /** Optional override for tests (clipboard write isn't observable in
   * happy-dom). Production uses `navigator.clipboard.writeText`. */
  writeClipboard?: (text: string) => Promise<void>;
}

export class AdminIdentitiesManager {
  private readonly options: AdminIdentitiesManagerOptions;
  private readonly api: NonNullable<AdminIdentitiesManagerOptions['api']>;
  private container: HTMLElement | null = null;
  private form: HTMLFormElement | null = null;
  private resultElement: HTMLElement | null = null;
  private errorElement: HTMLElement | null = null;
  private resetDialog: HTMLDialogElement | null = null;
  private resetPasscodeNode: HTMLElement | null = null;
  private resetHandleNode: HTMLElement | null = null;
  private resetCopyBtn: HTMLButtonElement | null = null;
  private resetCloseBtn: HTMLButtonElement | null = null;
  private currentIdentity: AdminIdentitySummary | null = null;

  constructor(options: AdminIdentitiesManagerOptions) {
    this.options = options;
    this.api = options.api ?? { lookupAdminIdentities, resetAdminPasscode };
  }

  mount(): void {
    if (this.container) return;
    const doc = this.options.root.ownerDocument;
    const container = doc.createElement('div');
    container.setAttribute('data-role', 'admin-identities');
    container.innerHTML = `
      <header class="sharpee-admin-tab-header">
        <h2>Identities</h2>
      </header>
      <form data-role="admin-identities-form" class="sharpee-admin-identities-form" novalidate>
        <label>
          Handle
          <input data-role="admin-identities-handle" name="handle" type="text" autocomplete="off" required />
        </label>
        <button type="submit">Look up</button>
      </form>
      <p data-role="admin-identities-error" class="sharpee-admin-tab-error" hidden></p>
      <div data-role="admin-identities-result" hidden></div>

      <dialog data-role="admin-identities-dialog" class="sharpee-dialog">
        <h2 class="sharpee-dialog-title">Passcode reset</h2>
        <div class="sharpee-dialog-body">
          <p>New passcode for <strong data-role="admin-reset-handle"></strong> (shown once — copy now):</p>
          <code data-role="admin-reset-passcode" class="sharpee-admin-reset-passcode"></code>
        </div>
        <div class="sharpee-dialog-buttons">
          <button data-role="admin-reset-copy" type="button" class="sharpee-dialog-button">Copy</button>
          <button data-role="admin-reset-close" type="button" class="sharpee-dialog-button">Close</button>
        </div>
      </dialog>
    `;
    this.options.root.appendChild(container);
    this.container = container;
    this.form = container.querySelector('[data-role="admin-identities-form"]');
    this.resultElement = container.querySelector('[data-role="admin-identities-result"]');
    this.errorElement = container.querySelector('[data-role="admin-identities-error"]');
    this.resetDialog = container.querySelector('[data-role="admin-identities-dialog"]');
    this.resetPasscodeNode = container.querySelector('[data-role="admin-reset-passcode"]');
    this.resetHandleNode = container.querySelector('[data-role="admin-reset-handle"]');
    this.resetCopyBtn = container.querySelector('[data-role="admin-reset-copy"]');
    this.resetCloseBtn = container.querySelector('[data-role="admin-reset-close"]');

    this.form?.addEventListener('submit', this.handleSubmit);
    this.resultElement?.addEventListener('click', this.handleResultClick);
    this.resetCopyBtn?.addEventListener('click', this.handleCopy);
    this.resetCloseBtn?.addEventListener('click', this.handleCloseDialog);
  }

  unmount(): void {
    if (!this.container) return;
    this.form?.removeEventListener('submit', this.handleSubmit);
    this.resultElement?.removeEventListener('click', this.handleResultClick);
    this.resetCopyBtn?.removeEventListener('click', this.handleCopy);
    this.resetCloseBtn?.removeEventListener('click', this.handleCloseDialog);
    // Defensive: clear any lingering passcode text before detaching.
    if (this.resetPasscodeNode) this.resetPasscodeNode.textContent = '';
    this.container.parentNode?.removeChild(this.container);
    this.container = null;
    this.form = null;
    this.resultElement = null;
    this.errorElement = null;
    this.resetDialog = null;
    this.resetPasscodeNode = null;
    this.resetHandleNode = null;
    this.resetCopyBtn = null;
    this.resetCloseBtn = null;
    this.currentIdentity = null;
  }

  private readonly handleSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();
    const form = this.form;
    if (!form) return;
    const handle = String(new FormData(form).get('handle') ?? '').trim();
    if (handle.length === 0) {
      this.showError('Enter a handle.');
      return;
    }
    this.clearError();
    let result;
    try {
      result = await this.api.lookupAdminIdentities(handle, this.options.httpOptions);
    } catch (err) {
      this.showError(
        `Could not reach the server (${err instanceof Error ? err.message : 'network error'}).`
      );
      return;
    }
    if (!result.ok) {
      this.showError(`Lookup failed: ${result.error}.`);
      return;
    }
    this.renderResult(result.value.identities[0] ?? null);
  };

  private renderResult(identity: AdminIdentitySummary | null): void {
    const target = this.resultElement;
    if (!target) return;
    const doc = target.ownerDocument;
    target.replaceChildren();
    target.hidden = false;
    if (!identity) {
      this.currentIdentity = null;
      const p = doc.createElement('p');
      p.textContent = 'No identity with that handle.';
      p.setAttribute('data-role', 'admin-identities-empty');
      target.appendChild(p);
      return;
    }
    this.currentIdentity = identity;
    const wrapper = doc.createElement('div');
    wrapper.setAttribute('data-role', 'admin-identities-card');
    const label = doc.createElement('span');
    label.textContent = `${identity.handle}${identity.isAdmin ? ' (admin)' : ''}`;
    const idSmall = doc.createElement('small');
    idSmall.textContent = identity.id;
    const resetBtn = doc.createElement('button');
    resetBtn.type = 'button';
    resetBtn.setAttribute('data-action', 'reset-passcode');
    resetBtn.textContent = 'Reset passcode';
    wrapper.append(label, idSmall, resetBtn);
    target.appendChild(wrapper);
  }

  private readonly handleResultClick = async (
    event: Event
  ): Promise<void> => {
    const target = event.target as HTMLElement | null;
    if (target?.getAttribute('data-action') !== 'reset-passcode') return;
    const identity = this.currentIdentity;
    if (!identity) return;
    const result = await this.api.resetAdminPasscode(
      identity.id,
      this.options.httpOptions
    );
    if (!result.ok) {
      this.showError(`Reset failed: ${result.error}.`);
      return;
    }
    this.openResetDialog(result.value.handle, result.value.passcode);
  };

  private openResetDialog(handle: string, passcode: string): void {
    const dialog = this.resetDialog;
    const passcodeNode = this.resetPasscodeNode;
    const handleNode = this.resetHandleNode;
    if (!dialog || !passcodeNode || !handleNode) return;
    handleNode.textContent = handle;
    passcodeNode.textContent = passcode;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  private readonly handleCloseDialog = (event: Event): void => {
    event.preventDefault();
    this.closeResetDialog();
  };

  private closeResetDialog(): void {
    const dialog = this.resetDialog;
    if (!dialog) return;
    // Wipe the passcode text BEFORE closing so a quick
    // document.body.innerHTML capture would not recover it.
    if (this.resetPasscodeNode) this.resetPasscodeNode.textContent = '';
    if (this.resetHandleNode) this.resetHandleNode.textContent = '';
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  private readonly handleCopy = async (event: Event): Promise<void> => {
    event.preventDefault();
    const passcode = this.resetPasscodeNode?.textContent ?? '';
    if (passcode.length === 0) return;
    const writer =
      this.options.writeClipboard ??
      (async (text: string) => {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        }
      });
    try {
      await writer(passcode);
    } catch {
      // Clipboard access can be denied (permissions, secure context);
      // the passcode is still visible in the dialog for manual copy.
    }
  };

  private showError(message: string): void {
    if (!this.errorElement) return;
    this.errorElement.textContent = message;
    this.errorElement.hidden = false;
  }
  private clearError(): void {
    if (!this.errorElement) return;
    this.errorElement.textContent = '';
    this.errorElement.hidden = true;
  }
}
