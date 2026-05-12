/**
 * @module zifmia/web/managers/identity-manager
 * @purpose Renders the `.sharpee-identity-form` (ADR-176) and drives
 *   the single `POST /api/identities` round trip. On success,
 *   persists the identity via `IdentityStore` and notifies an
 *   upstream callback so the shell can re-render the lobby in the
 *   identified state.
 * @owner Zifmia web client.
 *
 * Per the 2026-05-12 ADR-161 amendment: identity is just a handle.
 * No passcode field, no login tab, no register-vs-login distinction.
 * The form is "pick a handle." If the handle is taken, the user
 * picks a different one.
 *
 * The manager is framework-free: it owns a single `<form>` element
 * (built once on `mount()`), wires its own listeners, and exposes a
 * single subscription surface (`onIdentified`). Tests construct it
 * against a jsdom `document` and a stub API.
 */

import * as identityApi from '../api/identity';
import type { HttpClientOptions } from '../api/http';
import { IdentityStore, type PersistedIdentity } from '../identity-store';

export interface IdentityManagerOptions {
  /** Mount target — the manager appends its `<form>` here. */
  root: HTMLElement;
  /** HTTP options forwarded to `createIdentity`. */
  httpOptions?: HttpClientOptions;
  /** Persistence layer (defaults to `localStorage`-backed). */
  identityStore?: IdentityStore;
  /** Fires after a successful claim. The persisted identity has
   * already been written to storage. */
  onIdentified: (identity: PersistedIdentity) => void;
  /** Optional API override for tests. */
  api?: {
    createIdentity: typeof identityApi.createIdentity;
  };
}

/**
 * IdentityManager — single-input "pick a handle" form.
 *
 * Public surface:
 * - `mount()` — build and attach the form element. Idempotent.
 * - `unmount()` — remove the form and detach listeners.
 */
export class IdentityManager {
  private readonly options: IdentityManagerOptions;
  private readonly store: IdentityStore;
  private readonly api: { createIdentity: typeof identityApi.createIdentity };
  private formElement: HTMLFormElement | null = null;
  private errorElement: HTMLElement | null = null;
  private submitButton: HTMLButtonElement | null = null;

  constructor(options: IdentityManagerOptions) {
    this.options = options;
    this.store = options.identityStore ?? new IdentityStore();
    this.api = options.api ?? { createIdentity: identityApi.createIdentity };
  }

  /** Build the form DOM and attach to `options.root`. Idempotent. */
  mount(): void {
    if (this.formElement) return;
    const form = this.options.root.ownerDocument.createElement('form');
    form.className = 'sharpee-identity-form';
    form.setAttribute('novalidate', '');
    form.innerHTML = renderFormHtml();
    this.options.root.appendChild(form);

    this.formElement = form;
    this.errorElement = form.querySelector('[data-role="error"]');
    this.submitButton = form.querySelector('[data-role="submit"]');

    form.addEventListener('submit', this.handleSubmit);
  }

  /** Detach. Safe to call without mount. */
  unmount(): void {
    if (!this.formElement) return;
    this.formElement.removeEventListener('submit', this.handleSubmit);
    this.formElement.parentNode?.removeChild(this.formElement);
    this.formElement = null;
    this.errorElement = null;
    this.submitButton = null;
  }

  private readonly handleSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();
    const form = this.formElement;
    if (!form) return;
    const data = new FormData(form);
    const handle = String(data.get('handle') ?? '').trim();

    if (handle.length === 0) {
      this.showError('Pick a handle.');
      return;
    }

    this.setSubmitting(true);
    this.clearError();

    const result = await this.api.createIdentity(
      handle,
      this.options.httpOptions
    );

    this.setSubmitting(false);

    if (!result.ok) {
      this.showError(messageForError(result.error, result.detail));
      return;
    }

    const identity: PersistedIdentity = {
      id: result.value.id,
      handle: result.value.handle
    };
    this.store.save(identity);
    this.options.onIdentified(identity);
  };

  private setSubmitting(submitting: boolean): void {
    if (this.submitButton) this.submitButton.disabled = submitting;
  }

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

function renderFormHtml(): string {
  return `
    <h1 class="sharpee-identity-form-title">Pick a handle</h1>
    <p class="sharpee-identity-form-hint">
      Your handle is your name in Zifmia. 3-12 letters, no digits or
      separators. Anyone who types your handle on another machine
      becomes you — it's a label, not a password.
    </p>
    <label class="sharpee-identity-form-field">
      <span>Handle</span>
      <input
        name="handle"
        type="text"
        autocomplete="username"
        autocapitalize="none"
        spellcheck="false"
        minlength="3"
        maxlength="12"
        pattern="[A-Za-z]+"
        required
      />
    </label>
    <p data-role="error" class="sharpee-identity-form-error" hidden></p>
    <button data-role="submit" type="submit">Claim handle</button>
  `;
}

function messageForError(error: string, detail?: string): string {
  if (error === 'handle_taken') return 'That handle is taken. Try another.';
  if (error === 'invalid_handle') {
    return 'Handle must be 3-12 letters (no digits, no separators).';
  }
  if (detail) return `${error}: ${detail}`;
  return error;
}
